"""Main FastAPI application."""

import asyncio

from fastapi import Depends, FastAPI

from .auth import verify_api_key
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
    api_key: str = Depends(verify_api_key),  # This is where the magic happens!
):
    """
    Process a single prompt.

    The Depends(verify_api_key) tells FastAPI to:
    1. Call verify_api_key before running this function
    2. Only run this function if verify_api_key succeeds
    3. Return an error response if verify_api_key raises an exception
    """
    try:
        response = await process_with_llm(request.prompt)
        return PromptResponse(response=response)
    except Exception as e:
        return PromptResponse(status="error", error=str(e))


@app.post("/api/v1/prompts", response_model=MultiplePromptsResponse)
async def process_prompts(
    request: MultiplePromptsRequest, api_key: str = Depends(verify_api_key)
):
    """Process multiple prompts in batches."""
    all_responses = []

    for i in range(0, len(request.prompts), BATCH_SIZE):
        batch = request.prompts[i : i + BATCH_SIZE]
        batch_responses = await asyncio.gather(
            *[process_with_llm(prompt.prompt) for prompt in batch],
            return_exceptions=True,
        )

        for response in batch_responses:
            if isinstance(response, Exception):
                all_responses.append(
                    PromptResponse(status="error", error=str(response))
                )
            else:
                all_responses.append(
                    PromptResponse(response=response, status="success")
                )

    return MultiplePromptsResponse(responses=all_responses)
