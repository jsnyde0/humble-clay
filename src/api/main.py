"""Main FastAPI application."""

import logging
import time

import logfire
from fastapi import Depends, FastAPI

from .auth import verify_api_key
from .llm import process_with_llm
from .logging.setup import (
    configure_logfire,
    log_batch_completion,
    log_batch_item_error,
    log_batch_process_completion,
    log_batch_progress,
    log_batch_start,
    log_first_result,
    setup_api_logging,
)
from .models import (
    MultiplePromptsRequest,
    MultiplePromptsResponse,
    PromptRequest,
    PromptResponse,
)
from .response.handlers import prepare_prompt_response
from .schema.dynamic import create_dynamic_model_from_schema

# Configure Logfire and setup logging
configure_logfire(
    service_name="humble-clay-api",
    service_version="0.1.0",
    environment="development",
)

app = FastAPI(
    title="Humble Clay API",
    description="Backend API for Humble Clay - AI-powered Google Sheets add-on",
    version="0.1.0",
)

# Apply Logfire instrumentation to FastAPI and setup logging
setup_api_logging(app)

# Batch processing configuration
# Using a batch size of 100 optimized for Gemini Flash Lite:
# 1. Flash models are designed for high throughput
# 2. Lower latency per request than standard models
# 3. Specifically optimized for batch processing
# 4. Significantly reduces processing time for large datasets
BATCH_SIZE = 100

# Configure logger for this module
logger = logging.getLogger(__name__)


@app.get("/")
async def root():
    """Root endpoint with basic information."""
    return {
        "name": "Humble Clay",
        "description": "AI-powered Google Sheets add-on",
        "version": "0.1.0",
    }


@app.get("/health")
async def health():
    """Health check endpoint."""
    return {"status": "healthy", "version": "0.1.0"}


@app.post("/api/v1/prompt", response_model=PromptResponse)
async def process_prompt(
    request: PromptRequest,
    api_key: str = Depends(verify_api_key),
):
    """
    Process a single prompt.

    If response_format is provided with a JSON schema, the LLM response
    will be structured according to that schema.

    If extract_field_path is provided along with a schema, the specified
    field will be extracted from the structured response.
    """
    try:
        # Determine if we need to use a Pydantic model for structured output
        response_model = None
        has_schema = False

        if (
            request.response_format
            and request.response_format.get("type") == "json_schema"
        ):
            has_schema = True
            json_schema = request.response_format.get("json_schema", {})
            if json_schema and "schema" in json_schema:
                # Create a dynamic Pydantic model from the provided schema
                schema_name = json_schema.get("name", "DynamicSchema")
                schema_obj = json_schema["schema"]

                # Use the helper function to create a model with proper enum handling
                response_model = create_dynamic_model_from_schema(
                    schema_name, schema_obj
                )

        # Process the prompt with or without a schema
        response_data = await process_with_llm(
            request.prompt, response_model=response_model if response_model else None
        )

        # Use the response handler to format the response and handle field extraction
        return prepare_prompt_response(
            response_data,
            extract_field_path=request.extract_field_path,
            has_schema=has_schema,
        )

    except ValueError as e:
        # Handle validation errors
        logger.error(f"Validation error: {str(e)}")
        return PromptResponse(status="error", error=str(e))
    except Exception as e:
        # Handle other errors
        logger.error(f"Error processing prompt: {str(e)}")
        return PromptResponse(status="error", error=str(e))


@app.post("/api/v1/prompts", response_model=MultiplePromptsResponse)
async def process_prompts(
    request: MultiplePromptsRequest,
    api_key: str = Depends(verify_api_key),
):
    """
    Process multiple prompts in a batch.

    If response_format is provided with a JSON schema, the LLM responses
    will be structured according to that schema.

    If extract_field_path is provided along with a schema, the specified
    field will be extracted from the structured responses.
    """
    total_prompts = len(request.prompts)

    # Start batch processing span for tracking the entire operation
    with logfire.span(
        "batch_processing",
        attributes={
            "total_prompts": total_prompts,
        },
    ):
        # Log batch start
        batch_start_time = log_batch_start(total_prompts)

        all_responses = []
        completed = 0
        failed = 0
        first_result_time = None

        for i in range(0, len(request.prompts), BATCH_SIZE):
            batch = request.prompts[i : i + BATCH_SIZE]
            batch_size = len(batch)
            batch_number = i // BATCH_SIZE + 1
            total_batches = (total_prompts + BATCH_SIZE - 1) // BATCH_SIZE

            # Log sub-batch start with its own span
            with logfire.span(
                f"batch_{batch_number}",
                attributes={
                    "batch_number": batch_number,
                    "batch_size": batch_size,
                    "batch_start_index": i,
                },
            ):
                batch_start = time.time()
                log_batch_progress(
                    batch_number, total_batches, batch_size, completed, total_prompts
                )

                # Process each prompt individually to handle schema correctly
                batch_responses = []
                batch_completed = 0
                batch_failed = 0

                for prompt_request in batch:
                    item_start = time.time()
                    try:
                        # This logic mirrors the single prompt endpoint
                        response_model = None
                        has_schema = False

                        if (
                            prompt_request.response_format
                            and prompt_request.response_format.get("type")
                            == "json_schema"
                        ):
                            has_schema = True
                            json_schema = prompt_request.response_format.get(
                                "json_schema", {}
                            )
                            if json_schema and "schema" in json_schema:
                                # Create a dynamic Pydantic model from provided schema
                                schema_name = json_schema.get("name", "DynamicSchema")
                                schema_obj = json_schema["schema"]

                                # Use the helper function to create a model with proper
                                # enum handling
                                response_model = create_dynamic_model_from_schema(
                                    schema_name, schema_obj
                                )

                        # Process the prompt with or without a schema
                        with logfire.span("llm_processing"):
                            response_data = await process_with_llm(
                                prompt_request.prompt,
                                response_model=response_model
                                if response_model
                                else None,
                            )

                        # Use the response handler to prepare the response
                        response = prepare_prompt_response(
                            response_data,
                            extract_field_path=prompt_request.extract_field_path,
                            has_schema=has_schema,
                        )

                        # Add the response to batch responses
                        batch_responses.append(response)

                        # Update completion status based on response
                        if response.status == "error":
                            batch_failed += 1
                        else:
                            batch_completed += 1

                            # Record first result time if it's the first completion
                            if (
                                first_result_time is None
                                and completed + batch_completed == 1
                            ):
                                first_result_time = time.time()
                                log_first_result(first_result_time, batch_start_time)

                    except ValueError as e:
                        # Handle validation errors
                        item_duration = time.time() - item_start
                        log_batch_item_error(
                            e,
                            prompt_request.prompt,
                            item_duration,
                            error_type="validation",
                        )
                        batch_responses.append(
                            PromptResponse(status="error", error=str(e))
                        )
                        batch_failed += 1

                    except Exception as e:
                        # Handle other errors
                        item_duration = time.time() - item_start
                        log_batch_item_error(e, prompt_request.prompt, item_duration)
                        batch_responses.append(
                            PromptResponse(status="error", error=str(e))
                        )
                        batch_failed += 1

                # Update counters and add responses
                completed += batch_completed
                failed += batch_failed
                all_responses.extend(batch_responses)

                # Calculate batch duration
                batch_duration = time.time() - batch_start

                # Log sub-batch completion
                log_batch_completion(
                    batch_number,
                    total_batches,
                    batch_completed,
                    batch_failed,
                    completed,
                    failed,
                    total_prompts,
                    batch_duration,
                    batch_size,
                )

        # Calculate total duration
        total_duration = time.time() - batch_start_time

        # Log batch completion with timing metrics
        log_batch_process_completion(
            total_prompts,
            completed,
            failed,
            total_duration,
            first_result_time,
            batch_start_time,
        )

        return MultiplePromptsResponse(responses=all_responses)
