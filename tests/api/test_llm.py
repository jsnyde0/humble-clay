"""Tests for LLM processing utilities."""

from typing import List
from unittest.mock import AsyncMock

import httpx
import openai
import pytest
from pydantic import BaseModel

from src.api.llm import process_with_llm

# Mark all tests in this file as asyncio
pytestmark = pytest.mark.asyncio


# --- Add Pydantic Model for Instructor Test ---
class UserInfo(BaseModel):
    name: str
    age: int


# --- Add Pydantic Model for Integration Test ---
class Person(BaseModel):
    name: str
    age: int


# ---------------------------------------------


# Helper to create a mock OpenAI ChatCompletion response object
# Needs refining based on actual OpenAI object structure if tests fail
def create_mock_completion(content: str) -> AsyncMock:
    mock_message = AsyncMock()
    mock_message.content = content
    mock_choice = AsyncMock()
    mock_choice.message = mock_message
    mock_completion = AsyncMock()
    mock_completion.choices = [mock_choice]
    return mock_completion


async def test_process_with_llm_no_schema(mocker):
    """Test process_with_llm returns a string using the OpenAI client."""
    # Mock the OpenAI client call
    mock_openai_create = mocker.patch(
        "src.api.llm.client.chat.completions.create", new_callable=AsyncMock
    )

    # Configure mock to return a simulated OpenAI response object with string content
    expected_content = "Mocked LLM response"
    mock_openai_create.return_value = create_mock_completion(expected_content)

    # Call the function without a response_model
    result = await process_with_llm("Test prompt")

    # Assertions
    assert result == expected_content

    # Assert the mock was called correctly (without response_model)
    mock_openai_create.assert_awaited_once_with(
        model="google/gemini-2.0-flash-lite-001",  # Default model
        messages=[{"role": "user", "content": "Test prompt"}],
        # No response_model argument expected here
    )


async def test_process_with_llm_with_instructor(mocker):
    """Test process_with_llm returns a Pydantic model using Instructor."""
    # Mock the actual method called by the patched client
    # The path depends on where 'client' is defined in src.api.llm
    mock_openai_create = mocker.patch(
        "src.api.llm.client.chat.completions.create", new_callable=AsyncMock
    )

    # Expected data
    expected_data = UserInfo(name="Test User", age=30)

    # Instructor expects the *Pydantic object* itself in the return value when mocking,
    # not the raw JSON string in the message content.
    # It simulates the parsing process.
    mock_openai_create.return_value = expected_data

    # Call the function, passing the Pydantic model
    result = await process_with_llm("Extract user info", response_model=UserInfo)

    # Assertions
    assert isinstance(result, UserInfo)
    assert result == expected_data  # Compare model instances

    # Assert the mock was called correctly
    mock_openai_create.assert_awaited_once_with(
        model="google/gemini-2.0-flash-lite-001",  # Default model
        messages=[{"role": "user", "content": "Extract user info"}],
        response_model=UserInfo,
    )


async def test_process_with_llm_handles_api_error(mocker):
    """Test process_with_llm raises exception on API error."""
    # Mock the client call to raise an OpenAI APIError
    mock_openai_create = mocker.patch(
        "src.api.llm.client.chat.completions.create", new_callable=AsyncMock
    )

    # Correctly instantiate APIError (may need httpx request mock if constructor needs it)
    # Let's try with a simple mocked request first.
    mock_request = mocker.Mock(spec=httpx.Request)
    mock_openai_create.side_effect = openai.APIError(
        "Simulated API Error",
        request=mock_request,  # Use 'request' argument
        body=None,
    )

    with pytest.raises(Exception, match="OpenRouter API error: Simulated API Error"):
        await process_with_llm("Error prompt")


# --- Integration Test ---
@pytest.mark.llm  # Mark as integration test requiring LLM
async def test_process_with_llm_instructor_integration():
    """Integration test for process_with_llm with Instructor to extract structured data."""
    input_text = "Create Person objects for John Doe (age 30) and Jane Smith (age 25)."

    print(f"\nRunning Instructor integration test with input: '{input_text}'")

    try:
        # Call the actual function, targeting List[Person]
        result = await process_with_llm(prompt=input_text, response_model=List[Person])

        print(f"Raw result from process_with_llm: {result}")

        # Assertions
        assert isinstance(result, list), (
            f"Expected result type list, got {type(result)}"
        )
        assert len(result) > 0, "Expected at least one Person object to be extracted"
        assert all(isinstance(p, Person) for p in result), (
            "Not all items in result are Person instances"
        )

        print("Instructor Integration Test Passed: Extracted Person objects:")
        for person in result:
            print(f" - {person.model_dump_json()}")

    except Exception as e:
        pytest.fail(f"Instructor integration test failed with error: {e}")


# --- End Integration Test ---
