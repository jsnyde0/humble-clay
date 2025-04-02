"""LLM processing utilities using Instructor and OpenAI client for OpenRouter."""

import os
from typing import Type, TypeVar

import httpx
import instructor
import openai
from pydantic import BaseModel

# Define a TypeVar for the response model
T = TypeVar("T", bound=BaseModel)

# Configure OpenAI client for OpenRouter
# Ensure OPENROUTER_API_KEY is set in your environment
client = instructor.patch(
    openai.AsyncOpenAI(
        base_url=os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"),
        api_key=os.getenv("OPENROUTER_API_KEY"),
        default_headers={"HTTP-Referer": "https://github.com/jsnyde0/humble-clay"},
    ),
    mode=instructor.Mode.JSON,  # Use JSON mode for Pydantic models
)


async def process_with_llm(
    prompt: str,
    response_model: Type[T] | None = None,
    model: str = "google/gemini-2.0-flash-lite-001",  # Added model parameter
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
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        # Consider a more specific exception type
        raise Exception("OpenRouter API key not configured")

    messages = [{"role": "user", "content": prompt}]

    try:
        if response_model:
            # Use instructor patching to get a Pydantic model back
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
                response_model=response_model,
            )
            return response
        else:
            # Standard call for string response
            response = await client.chat.completions.create(
                model=model,
                messages=messages,
            )
            # Ensure we handle the case where the response might be empty or malformed
            if response.choices and response.choices[0].message:
                return response.choices[0].message.content or ""
            else:
                # Handle unexpected response structure
                raise Exception("Invalid response structure received from API")

    except (httpx.ConnectError, httpx.ConnectTimeout) as e:
        # Handle connection issues specifically
        print(f"Connection error during LLM processing: {e}")
        raise Exception(f"Connection error: {str(e)}") from e
    except openai.APIError as e:
        # Handle OpenAI API errors
        print(f"OpenAI API Error: {e}")
        raise Exception(f"OpenRouter API error: {str(e)}") from e
    except Exception as e:
        # Handle other unexpected errors
        print(f"Error during LLM processing: {e}")
        raise Exception(f"Unexpected error: {str(e)}") from e
