"""Pydantic models for API requests and responses."""

from typing import List

from pydantic import BaseModel, Field


class PromptRequest(BaseModel):
    """Single prompt request model."""

    prompt: str = Field(..., min_length=1)


class PromptResponse(BaseModel):
    """Single prompt response model."""

    status: str = "success"
    response: str | None = None
    error: str | None = None


class MultiplePromptsRequest(BaseModel):
    """Multiple prompts request model."""

    prompts: List[PromptRequest] = Field(..., min_length=1, max_length=1000)


class MultiplePromptsResponse(BaseModel):
    """Multiple prompts response model."""

    responses: List[PromptResponse]
