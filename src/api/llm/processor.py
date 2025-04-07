"""LLM processing implementation using Instructor and OpenAI client for OpenRouter."""

import logging
import os
from typing import Type, TypeVar

import httpx
import instructor
import openai
from pydantic import BaseModel

# Define logger for this module
logger = logging.getLogger(__name__)

# Define a TypeVar for the response model
T = TypeVar("T", bound=BaseModel)

# Configure OpenAI client for OpenRouter
# Ensure OPENROUTER_API_KEY is set in your environment
# Let's log the environment variables being read
openrouter_base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
logger.info(
    f"Initializing OpenAI client for OpenRouter. Base URL: {openrouter_base_url}"
)
if not openrouter_api_key:
    logger.warning("OPENROUTER_API_KEY environment variable not found!")

client = instructor.patch(
    openai.AsyncOpenAI(
        base_url=openrouter_base_url,
        api_key=openrouter_api_key,
        default_headers={"HTTP-Referer": "https://github.com/jsnyde0/humble-clay"},
        # Add a timeout configuration
        timeout=httpx.Timeout(30.0, connect=10.0),  # 30s total, 10s connect
    ),
    mode=instructor.Mode.JSON,  # Use JSON mode for Pydantic models
)


async def process_with_llm(
    prompt: str,
    response_model: Type[T] | None = None,
    model: str = "google/gemini-2.0-flash-lite-001",  # Changed default model
) -> T | str:
    """Process prompt with OpenRouter API, optionally returning a Pydantic model.

    Args:
        prompt: The user prompt to send to the LLM.
        response_model: Optional Pydantic model to structure the response.
        model: The model identifier to use (default: google/gemini-2.0-flash-lite-001).

    Returns:
        If response_model is provided, returns an instance of that model.
        Otherwise, returns the raw string content from the LLM response.

    Raises:
        Exception: If the API key is not configured or if the API call fails.
    """
    api_key_check = os.getenv("OPENROUTER_API_KEY")
    if not api_key_check:
        logger.error("OpenRouter API key not configured at time of call.")
        raise Exception("OpenRouter API key not configured")

    messages = [{"role": "user", "content": prompt}]
    logger.debug(
        f"Attempting LLM call. Model: {model}, Response Model: {response_model}, Prompt Snippet: {prompt[:50]}..."
    )

    try:
        if response_model:
            logger.debug("Using Instructor for structured response.")
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                response_model=response_model,
            )
            logger.debug("LLM call successful (structured).")
            return response
        else:
            logger.debug("Using standard call for string response.")
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
            )
            logger.debug("LLM call successful (string).")
            if response.choices and response.choices[0].message:
                return response.choices[0].message.content or ""
            else:
                logger.error(
                    "Invalid response structure received from API (string response)."
                )
                raise Exception("Invalid response structure received from API")

    except httpx.TimeoutException as e:
        logger.error(f"LLM call timed out: {e}", exc_info=True)
        raise Exception(f"LLM call timed out: {str(e)}") from e
    except httpx.ConnectError as e:
        # Log ConnectError specifically
        logger.error(f"LLM connection error: {e}", exc_info=True)
        raise Exception(f"Connection error: {str(e)}") from e
    except openai.APIConnectionError as e:
        # Log OpenAI's specific connection error
        logger.error(f"OpenAI APIConnectionError: {e}", exc_info=True)
        raise Exception(f"Connection error: {str(e)}") from e
    except openai.APIStatusError as e:
        logger.error(
            f"OpenAI API Status Error (e.g., 4xx, 5xx): {e.status_code} - {e.response}",
            exc_info=True,
        )
        raise Exception(f"OpenRouter API status error {e.status_code}: {str(e)}") from e
    except openai.APIError as e:
        # Handle other OpenAI API errors
        logger.error(f"OpenAI API Error: {e}", exc_info=True)
        raise Exception(f"OpenRouter API error: {str(e)}") from e
    except Exception as e:
        # Handle other unexpected errors
        logger.error(
            f"Unexpected error during LLM processing: {type(e).__name__} - {e}",
            exc_info=True,
        )
        raise Exception(f"Unexpected error: {str(e)}") from e
