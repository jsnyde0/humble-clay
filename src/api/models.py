"""Pydantic models for API requests and responses."""

from typing import Any, Dict, List

from pydantic import BaseModel, ConfigDict, Field


class PromptRequest(BaseModel):
    """Single prompt request model."""

    prompt: str = Field(..., min_length=0)
    response_format: Dict[str, Any] | None = Field(default=None)
    extract_field_path: str | None = Field(default=None)

    model_config = ConfigDict(extra="forbid")


class PromptResponse(BaseModel):
    """Single prompt response model."""

    status: str = "success"
    # Allow structured data (dict, list) as well as specific scalar types or None
    response: Dict[str, Any] | List[Any] | str | int | float | bool | None = None
    error: str | None = None


class MultiplePromptsRequest(BaseModel):
    """Multiple prompts request model."""

    prompts: List[PromptRequest] = Field(..., min_length=1, max_length=1000)


class MultiplePromptsResponse(BaseModel):
    """Multiple prompts response model."""

    responses: List[PromptResponse]
