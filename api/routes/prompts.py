"""Routes for processing single and multiple prompts."""

import logging

import openai  # For type hinting if not already via models
from fastapi import APIRouter, Depends, HTTPException, Request

from ..auth import verify_api_key
from ..batch.processor import process_multiple_prompts

# Core dependencies
from ..core.dependencies import get_llm_client

# Business logic / processors
from ..llm.processor import process_with_llm

# Models
from ..models import (
    MultiplePromptsRequest,
    MultiplePromptsResponse,
    PromptRequest,
    PromptResponse,
)
from ..response.handlers import prepare_prompt_response
from ..schema.dynamic import create_dynamic_model_from_schema

router = APIRouter(
    prefix="/api/v1",
    tags=["Prompts"],  # Optional: for OpenAPI docs grouping
)

logger = logging.getLogger(__name__)


@router.post("/prompt", response_model=PromptResponse)
async def process_single_prompt_route(
    request: Request,  # Still needed by create_dynamic_model_from_schema indirectly via get_llm_client if it were there
    prompt_request: PromptRequest,
    api_key: str = Depends(verify_api_key),
    llm_client: openai.AsyncOpenAI = Depends(get_llm_client),
):
    """
    Process a single prompt.

    If response_format is provided with a JSON schema, the LLM response
    will be structured according to that schema.

    If extract_field_path is provided along with a schema, the specified
    field will be extracted from the structured response.
    """
    try:
        response_model = None
        has_schema = False

        if (
            prompt_request.response_format
            and prompt_request.response_format.get("type") == "json_schema"
        ):
            has_schema = True
            json_schema = prompt_request.response_format.get("json_schema", {})
            if json_schema and "schema" in json_schema:
                schema_name = json_schema.get("name", "DynamicSchema")
                schema_obj = json_schema["schema"]
                response_model = create_dynamic_model_from_schema(
                    schema_name, schema_obj
                )

        response_data = await process_with_llm(
            llm_client,
            prompt_request.prompt,
            response_model=response_model if response_model else None,
        )

        return prepare_prompt_response(
            response_data,
            extract_field_path=prompt_request.extract_field_path,
            has_schema=has_schema,
        )

    except ValueError as e:
        logger.error(f"Validation error in /prompt: {str(e)}")
        return PromptResponse(status="error", error=str(e))
    except Exception as e:
        logger.error(f"Error processing /prompt: {str(e)}")
        return PromptResponse(status="error", error=str(e))


@router.post("/prompts", response_model=MultiplePromptsResponse)
async def process_multiple_prompts_route(
    prompt_request: MultiplePromptsRequest,
    api_key: str = Depends(verify_api_key),
    llm_client: openai.AsyncOpenAI = Depends(get_llm_client),
):
    """
    Process multiple prompts in a batch.

    If response_format is provided with a JSON schema, the LLM responses
    will be structured according to that schema.

    If extract_field_path is provided along with a schema, the specified
    field will be extracted from the structured responses.
    """
    # Note: The `request: Request` object is not directly needed here if
    # get_llm_client correctly sources from app.state without needing the request object itself
    # for that specific piece of information. It is passed to get_llm_client by FastAPI when injected.
    try:
        return await process_multiple_prompts(
            llm_client, prompt_request, batch_size=100
        )
    except Exception as e:
        logger.error(f"Error processing /prompts: {str(e)}")
        # Consider if MultiplePromptsResponse should have a global error field
        # For now, returning a 500 might be one way, or a structured error response.
        # This example re-raises, letting FastAPI handle it, or you could return a custom error response.
        # Re-raising will result in a 500 if not caught by a higher-level exception handler.
        # To return a JSON response similar to single prompt, you'd need to adapt:
        # return MultiplePromptsResponse(responses=[PromptResponse(status="error", error=str(e))])
        # This might not be ideal as it implies one error for a batch structure.
        # A more robust batch error might be a top-level error field in MultiplePromptsResponse or a 500.
        raise HTTPException(status_code=500, detail=f"Error processing batch: {str(e)}")
