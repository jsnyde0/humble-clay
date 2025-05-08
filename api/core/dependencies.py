"""Core dependencies for the FastAPI application."""

import logging
from typing import cast

import openai  # Or your specific LLM client library
from fastapi import HTTPException, Request

logger = logging.getLogger(__name__)


async def get_llm_client(request: Request) -> openai.AsyncOpenAI:
    """Dependency to get the LLM client from application state."""
    # logger.info(f"Pytest Debug: get_llm_client called. App ID: {id(request.app)}") # Optional: Keep for debugging if needed

    llm_client_from_app_state = getattr(request.app.state, "llm_client", None)

    if not llm_client_from_app_state:
        logger.error(
            "LLM client not found on request.app.state during get_llm_client call."
        )
        # Optional: more detailed logging for debugging if issues persist
        # if hasattr(request.app, "state") and hasattr(request.app.state, "_state"):
        #     logger.error(f"Debug: request.app.state._state (internal) contains: {request.app.state._state}")
        # if hasattr(request, "state") and hasattr(request.state, "_state"):
        #     logger.error(f"Debug: request.state._state (internal) contains: {request.state._state}")

        raise HTTPException(
            status_code=500, detail="LLM client not available (from app.state)"
        )

    # logger.info(f"Pytest Debug: Successfully retrieved llm_client from request.app.state. Type: {type(llm_client_from_app_state)}") # Optional
    return cast(openai.AsyncOpenAI, llm_client_from_app_state)
