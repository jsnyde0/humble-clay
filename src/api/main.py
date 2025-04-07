"""Main FastAPI application."""

import logging

from fastapi import Depends, FastAPI

from .auth import verify_api_key
from .batch.processor import process_multiple_prompts
from .llm import process_with_llm
from .logging.setup import (
    configure_logfire,
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
    return await process_multiple_prompts(request)
