"""Main FastAPI application."""

import logging
import time
from typing import Any, Dict, List, Literal

import logfire
from fastapi import Depends, FastAPI
from pydantic import Field, create_model

from .auth import verify_api_key
from .field_extraction import extract_field, validate_field_extraction_request
from .llm import process_with_llm
from .models import (
    MultiplePromptsRequest,
    MultiplePromptsResponse,
    PromptRequest,
    PromptResponse,
)

# Configure Logfire
logfire.configure(
    service_name="humble-clay-api",
    service_version="0.1.0",
    environment="development",  # Change to "production" in production environment
)
logfire.info("Logfire configured in main.py")

app = FastAPI(
    title="Humble Clay API",
    description="Backend API for Humble Clay - AI-powered Google Sheets add-on",
    version="0.1.0",
)

# Apply Logfire instrumentation to FastAPI
logfire.instrument_fastapi(app)

# Batch processing configuration
# Using a batch size of 100 optimized for Gemini Flash Lite:
# 1. Flash models are designed for high throughput
# 2. Lower latency per request than standard models
# 3. Specifically optimized for batch processing
# 4. Significantly reduces processing time for large datasets
BATCH_SIZE = 100

# Configure logging
logging.basicConfig(level=logging.INFO)
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


def create_dynamic_model_from_schema(schema_name: str, schema_obj: Dict[str, Any]):
    """
    Create a Pydantic model from a JSON schema, properly handling constraints like
    enums.

    Args:
        schema_name: Name for the dynamic model
        schema_obj: JSON schema object defining the model

    Returns:
        A dynamically created Pydantic model class
    """
    properties = schema_obj.get("properties", {})
    model_fields = {}

    for field_name, field_schema in properties.items():
        field_type = field_schema.get("type")
        description = field_schema.get("description", "")

        # Handle different schema types
        if field_type == "string":
            # Check for enum constraint
            if "enum" in field_schema:
                # Create a Literal type with the enum values
                enum_values = field_schema["enum"]
                # Use typing.Literal for enum constraints
                field_type = Literal[tuple(enum_values)]
                model_fields[field_name] = (
                    field_type,
                    Field(..., description=description),
                )
            else:
                model_fields[field_name] = (str, Field(..., description=description))

        elif field_type == "integer":
            # Ensure integers are properly enforced
            def validate_int(cls, v):
                if isinstance(v, float):
                    # Convert float to int if it's a whole number
                    if v.is_integer():
                        return int(v)
                return v

            # Add validator for integer conversion
            model_fields[field_name] = (int, Field(..., description=description))

        elif field_type == "number":
            model_fields[field_name] = (float, Field(..., description=description))

        elif field_type == "boolean":
            model_fields[field_name] = (bool, Field(..., description=description))

        elif field_type == "array":
            # For simplicity, treat arrays as list of Any
            model_fields[field_name] = (List[Any], Field(..., description=description))

        elif field_type == "object":
            # Nested objects could be handled recursively,
            # but for simplicity we use dict
            model_fields[field_name] = (
                Dict[str, Any],
                Field(..., description=description),
            )

        else:
            # Default to Any for unknown types
            model_fields[field_name] = (Any, Field(..., description=description))

    # Create the dynamic model
    return create_model(schema_name, **model_fields)


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
                logger.info(f"Created dynamic schema: {schema_name}")

        # Process the prompt with or without a schema
        response_data = await process_with_llm(
            request.prompt, response_model=response_model if response_model else None
        )

        # Handle different response types (dict, Pydantic model, or string)
        if hasattr(response_data, "model_dump"):
            # It's a Pydantic model
            response_dict = response_data.model_dump()
        elif isinstance(response_data, dict):
            # It's already a dict
            response_dict = response_data
        else:
            # It's a string or other type
            # For backward compatibility, return directly for string responses
            # unless field extraction is requested
            if not request.extract_field_path:
                return PromptResponse(response=response_data)
            else:
                response_dict = {"result": response_data}

        # Extract specific field if requested
        if request.extract_field_path:
            # Validate the extraction request
            validate_field_extraction_request(
                response_dict, request.extract_field_path, has_schema
            )

            # Extract the requested field
            extracted_value = extract_field(response_dict, request.extract_field_path)
            return PromptResponse(response=extracted_value)

        # Return the full response if no extraction requested
        return PromptResponse(response=response_dict)

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
        batch_start_time = time.time()
        logfire.info(
            "Starting batch processing",
            total_prompts=total_prompts,
        )

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
                logfire.info(
                    f"Processing batch {batch_number}/{total_batches}",
                    batch_number=batch_number,
                    total_batches=total_batches,
                    batch_size=batch_size,
                    progress_percentage=round((completed / total_prompts) * 100, 2)
                    if total_prompts > 0
                    else 0,
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
                                logger.info(
                                    f"Created dynamic schema for batch item: \
                                        {schema_name}"
                                )

                        # Process the prompt with or without a schema
                        with logfire.span("llm_processing"):
                            response_data = await process_with_llm(
                                prompt_request.prompt,
                                response_model=response_model
                                if response_model
                                else None,
                            )

                        # Handle different response types (dict, Pydantic, or string)
                        if hasattr(response_data, "model_dump"):
                            # It's a Pydantic model
                            response_dict = response_data.model_dump()
                        elif isinstance(response_data, dict):
                            # It's already a dict
                            response_dict = response_data
                        else:
                            # It's a string or other type
                            # For backward compatibility, return directly for
                            # string responses unless field extraction is requested
                            if not prompt_request.extract_field_path:
                                batch_responses.append(
                                    PromptResponse(response=response_data)
                                )
                                batch_completed += 1

                                # Record first result time if it's the first completion
                                if (
                                    first_result_time is None
                                    and completed + batch_completed == 1
                                ):
                                    first_result_time = time.time()
                                    time_to_first = first_result_time - batch_start_time
                                    logfire.info(
                                        "First result completed",
                                        time_to_first_result=round(time_to_first, 2),
                                    )

                                continue
                            else:
                                response_dict = {"result": response_data}

                        # Extract specific field if requested
                        if prompt_request.extract_field_path:
                            try:
                                # Validate the extraction request
                                validate_field_extraction_request(
                                    response_dict,
                                    prompt_request.extract_field_path,
                                    has_schema,
                                )

                                # Extract the requested field
                                extracted_value = extract_field(
                                    response_dict, prompt_request.extract_field_path
                                )
                                batch_responses.append(
                                    PromptResponse(response=extracted_value)
                                )
                                batch_completed += 1
                            except ValueError as e:
                                # Handle field extraction errors
                                logger.error(f"Field extraction error: {str(e)}")
                                batch_responses.append(
                                    PromptResponse(status="error", error=str(e))
                                )
                                batch_failed += 1
                        else:
                            # Return the full response if no extraction requested
                            batch_responses.append(
                                PromptResponse(response=response_dict)
                            )
                            batch_completed += 1

                        # Record first result time if this is the first completion
                        if (
                            first_result_time is None
                            and completed + batch_completed == 1
                        ):
                            first_result_time = time.time()
                            time_to_first = first_result_time - batch_start_time
                            logfire.info(
                                "First result completed",
                                time_to_first_result=round(time_to_first, 2),
                            )

                    except ValueError as e:
                        # Handle validation errors
                        item_duration = time.time() - item_start
                        logfire.error(
                            "Batch item validation error",
                            error=str(e),
                            prompt=prompt_request.prompt[:100],  # First 100 chars
                            item_duration=round(item_duration, 2),
                        )
                        logger.error(f"Batch item validation error: {str(e)}")
                        batch_responses.append(
                            PromptResponse(status="error", error=str(e))
                        )
                        batch_failed += 1

                    except Exception as e:
                        # Handle other errors
                        item_duration = time.time() - item_start
                        logfire.error(
                            "Batch item processing error",
                            error=str(e),
                            prompt=prompt_request.prompt[:100],  # First 100 chars
                            item_duration=round(item_duration, 2),
                        )
                        logger.error(f"Batch item processing error: {str(e)}")
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
                logfire.info(
                    f"Completed batch {batch_number}/{total_batches}",
                    batch_number=batch_number,
                    batch_completed=batch_completed,
                    batch_failed=batch_failed,
                    total_completed=completed,
                    total_failed=failed,
                    progress_percentage=round((completed / total_prompts) * 100, 2)
                    if total_prompts > 0
                    else 0,
                    batch_duration=round(batch_duration, 2),
                    avg_item_time=round(batch_duration / batch_size, 2)
                    if batch_size > 0
                    else 0,
                )

        # Calculate total duration
        total_duration = time.time() - batch_start_time

        # Log batch completion with timing metrics
        logfire.info(
            "Completed batch processing",
            total_prompts=total_prompts,
            completed=completed,
            failed=failed,
            total_duration=round(total_duration, 2),
            time_to_first_result=round(first_result_time - batch_start_time, 2)
            if first_result_time
            else None,
            average_time_per_item=round(total_duration / total_prompts, 2)
            if total_prompts > 0
            else 0,
        )

        return MultiplePromptsResponse(responses=all_responses)
