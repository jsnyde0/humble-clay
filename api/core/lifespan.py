"""Core lifespan events for the FastAPI application."""

import logging
import os
from contextlib import asynccontextmanager
from typing import AsyncIterator

import httpx
import instructor
import openai
from fastapi import FastAPI

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Manage the LLM client lifecycle and set it on app.state."""
    llm_client_instance: openai.AsyncOpenAI | None = None
    logger.info("Lifespan: Initializing LLM client...")

    try:
        openrouter_base_url = os.getenv(
            "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"
        )
        openrouter_api_key = os.getenv("OPENROUTER_API_KEY")

        if not openrouter_api_key:
            logger.warning(
                "Lifespan: OPENROUTER_API_KEY not found in environment! LLM client will be None."
            )
            app.state.llm_client = None
        else:
            logger.info(
                "Lifespan: OPENROUTER_API_KEY found. Attempting to create client."
            )
            llm_client_instance = instructor.patch(
                openai.AsyncOpenAI(
                    base_url=openrouter_base_url,
                    api_key=openrouter_api_key,
                    default_headers={
                        "HTTP-Referer": "https://github.com/jsnyde0/humble-clay"
                    },
                    timeout=httpx.Timeout(60.0, connect=10.0),
                )
            )
            if llm_client_instance:
                logger.info(
                    f"Lifespan: LLM client successfully created. Type: {type(llm_client_instance)}"
                )
                app.state.llm_client = llm_client_instance
            else:
                logger.error(
                    "Lifespan: instructor.patch returned None or a falsy client instance."
                )
                app.state.llm_client = None

        logger.info(
            f"Lifespan: app.state.llm_client is now type {type(getattr(app.state, 'llm_client', None))}"
        )
        yield

    except Exception as e:
        logger.error(f"Lifespan: EXCEPTION DURING STARTUP: {e}", exc_info=True)
        app.state.llm_client = None
        yield
    finally:
        logger.info("Lifespan: Cleaning up LLM client...")
        client_to_close = getattr(app.state, "llm_client", None)
        if client_to_close:
            logger.info(
                f"Lifespan: Attempting to close client instance of type {type(client_to_close)}."
            )
            try:
                if hasattr(client_to_close, "aclose") and callable(
                    client_to_close.aclose
                ):
                    logger.info("Lifespan: Found 'aclose' method, awaiting it.")
                    await client_to_close.aclose()  # type: ignore
                    logger.info("Lifespan: LLM Client closed via aclose().")
                else:
                    logger.warning(
                        "Lifespan: LLM client does not have a callable 'aclose' method."
                    )
            except Exception as e_close:
                logger.error(
                    f"Lifespan: EXCEPTION during client close: {e_close}", exc_info=True
                )
        else:
            logger.info(
                "Lifespan: No LLM client instance was available in app.state to close."
            )
