"""Main FastAPI application."""

import logging
from typing import Any

from fastapi import Depends, FastAPI
from pydantic import create_model

from .auth import verify_api_key
from .field_extraction import extract_field, validate_field_extraction_request
from .llm import process_with_llm
from .models import (
    MultiplePromptsRequest,
    MultiplePromptsResponse,
    PromptRequest,
    PromptResponse,
)

app = FastAPI(
    title="Humble Clay API",
    description="Backend API for Humble Clay - AI-powered Google Sheets add-on",
    version="0.1.0",
)

# Batch processing configuration
BATCH_SIZE = 10

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

                # Create a dynamic model using the schema
                response_model = create_model(
                    schema_name,
                    __config__=None,
                    **{k: (Any, ...) for k in schema_obj.get("properties", {}).keys()},
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
    request: MultiplePromptsRequest, api_key: str = Depends(verify_api_key)
):
    """Process multiple prompts in batches."""
    all_responses = []

    for i in range(0, len(request.prompts), BATCH_SIZE):
        batch = request.prompts[i : i + BATCH_SIZE]

        # Process each prompt individually to handle schema correctly
        for prompt_request in batch:
            try:
                # This logic mirrors the single prompt endpoint
                response_model = None
                has_schema = False

                if (
                    prompt_request.response_format
                    and prompt_request.response_format.get("type") == "json_schema"
                ):
                    has_schema = True
                    json_schema = prompt_request.response_format.get("json_schema", {})
                    if json_schema and "schema" in json_schema:
                        # Create a dynamic Pydantic model from the provided schema
                        schema_name = json_schema.get("name", "DynamicSchema")
                        schema_obj = json_schema["schema"]

                        # Create a dynamic model using the schema
                        response_model = create_model(
                            schema_name,
                            __config__=None,
                            **{
                                k: (Any, ...)
                                for k in schema_obj.get("properties", {}).keys()
                            },
                        )

                        logger.info(
                            f"Created dynamic schema for batch item: {schema_name}"
                        )

                # Process the prompt with or without a schema
                response_data = await process_with_llm(
                    prompt_request.prompt,
                    response_model=response_model if response_model else None,
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
                    if not prompt_request.extract_field_path:
                        all_responses.append(PromptResponse(response=response_data))
                        continue
                    else:
                        response_dict = {"result": response_data}

                # Extract specific field if requested
                if prompt_request.extract_field_path:
                    try:
                        # Validate the extraction request
                        validate_field_extraction_request(
                            response_dict, prompt_request.extract_field_path, has_schema
                        )

                        # Extract the requested field
                        extracted_value = extract_field(
                            response_dict, prompt_request.extract_field_path
                        )
                        all_responses.append(PromptResponse(response=extracted_value))
                    except ValueError as e:
                        # Handle field extraction errors
                        logger.error(f"Field extraction error: {str(e)}")
                        all_responses.append(
                            PromptResponse(status="error", error=str(e))
                        )
                else:
                    # Return the full response if no extraction requested
                    all_responses.append(PromptResponse(response=response_dict))

            except ValueError as e:
                # Handle validation errors
                logger.error(f"Batch item validation error: {str(e)}")
                all_responses.append(PromptResponse(status="error", error=str(e)))
            except Exception as e:
                # Handle other errors
                logger.error(f"Batch item processing error: {str(e)}")
                all_responses.append(PromptResponse(status="error", error=str(e)))

    return MultiplePromptsResponse(responses=all_responses)
