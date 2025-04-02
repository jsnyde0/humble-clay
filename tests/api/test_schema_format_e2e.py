"""End-to-end tests for schema format compatibility between Apps Script and API."""

from typing import Any, Dict, cast

import pytest
from fastapi.testclient import TestClient


@pytest.fixture
def apps_script_format_schema() -> Dict[str, Any]:
    """Sample schema in the format that Apps Script would send."""
    return {
        "type": "json_schema",
        "json_schema": {
            "name": "DynamicSchema",
            "schema": {
                "type": "object",
                "properties": {"age": {"type": "number"}},
                "required": ["age"],
            },
        },
    }


def test_api_processes_apps_script_schema_format(
    client: TestClient,
    mocker: Any,
    auth_headers: Dict[str, str],
    apps_script_format_schema: Dict[str, Any],
) -> None:
    """Test that the API correctly processes the schema format sent by Apps Script."""
    # Mock the LLM to return a structured response matching the schema
    mock_llm = mocker.patch("src.api.main.process_with_llm")
    mock_llm.return_value = {"age": 35}

    # Create a request with the schema in the format Apps Script would send
    payload = {
        "prompt": "I'm 35 years old",
        "response_format": apps_script_format_schema,
    }

    # Make the request
    response = client.post("/api/v1/prompt", json=payload, headers=auth_headers)

    # Verify success
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"

    # Verify the mock was called with a properly formatted schema
    # This checks that process_with_llm received the correct parameters
    mock_llm_kwargs = mock_llm.call_args[1]
    assert "response_model" in mock_llm_kwargs
    assert mock_llm_kwargs["response_model"] is not None

    # Verify the response contains the structured data
    response_data = cast(Dict[str, Any], data["response"])
    assert "age" in response_data
    assert response_data["age"] == 35


def test_api_processes_apps_script_schema_with_field_extraction(
    client: TestClient,
    mocker: Any,
    auth_headers: Dict[str, str],
    apps_script_format_schema: Dict[str, Any],
) -> None:
    """Test that the API correctly processes schema with field extraction from Apps Script."""
    # Mock the LLM to return a structured response matching the schema
    mock_llm = mocker.patch("src.api.main.process_with_llm")
    mock_llm.return_value = {"age": 35}

    # Create a request with the schema and field path
    payload = {
        "prompt": "I'm 35 years old",
        "response_format": apps_script_format_schema,
        "extract_field_path": "age",
    }

    # Make the request
    response = client.post("/api/v1/prompt", json=payload, headers=auth_headers)

    # Verify success
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"

    # Verify we got the extracted field value directly
    assert data["response"] == 35


def test_batch_endpoint_with_apps_script_schema(
    client: TestClient,
    mocker: Any,
    auth_headers: Dict[str, str],
    apps_script_format_schema: Dict[str, Any],
) -> None:
    """Test the batch endpoint with the Apps Script schema format."""
    # Mock the LLM to return a simple response
    mock_llm = mocker.patch("src.api.main.process_with_llm")
    mock_llm.return_value = "Simple response"

    # Create a batch request with two items, both using the schema format
    payload = {
        "prompts": [
            {
                "prompt": "I'm 35 years old",
                "response_format": apps_script_format_schema,
            },
            {
                "prompt": "She is 28 years old",
                "response_format": apps_script_format_schema,
                "extract_field_path": "age",
            },
        ]
    }

    # Make the request
    response = client.post("/api/v1/prompts", json=payload, headers=auth_headers)

    # Verify success
    assert response.status_code == 200
    data = response.json()

    # Verify the response structure
    assert "responses" in data
    assert len(data["responses"]) == 2

    # Verify both responses indicate success
    for resp in data["responses"]:
        assert resp["status"] == "success"


def test_schema_matching_documentation_example(
    client: TestClient, mocker: Any, auth_headers: Dict[str, str]
) -> None:
    """
    Test using the exact schema example from our documentation/UI.

    This test verifies that the schema format shown in the UI example
    works correctly when formatted according to Apps Script requirements.
    """
    # Example schema shown in the UI
    example_schema = {
        "type": "object",
        "properties": {
            "name": {"type": "string"},
            "age": {"type": "number"},
            "skills": {"type": "array", "items": {"type": "string"}},
        },
        "required": ["name", "age"],
    }

    # Format according to Apps Script implementation
    apps_script_formatted = {
        "type": "json_schema",
        "json_schema": {"name": "DynamicSchema", "schema": example_schema},
    }

    # Mock the LLM to return a matching response
    mock_llm = mocker.patch("src.api.main.process_with_llm")
    mock_llm.return_value = {
        "name": "John Smith",
        "age": 35,
        "skills": ["Python", "JavaScript", "SQL"],
    }

    # Test with the formatted schema
    payload = {
        "prompt": "Please extract my information",
        "response_format": apps_script_formatted,
    }

    response = client.post("/api/v1/prompt", json=payload, headers=auth_headers)

    # Verify success
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"

    # Verify the response contains all expected fields
    response_data = cast(Dict[str, Any], data["response"])
    assert "name" in response_data
    assert "age" in response_data
    assert "skills" in response_data
    assert isinstance(response_data["skills"], list)
    assert len(response_data["skills"]) == 3


# New tests specifically for the batch endpoint and schema handling


def test_batch_endpoint_schema_validation_correct_parameters(
    client: TestClient,
    mocker: Any,
    auth_headers: Dict[str, str],
    apps_script_format_schema: Dict[str, Any],
) -> None:
    """Test that the batch endpoint correctly passes response_model to process_with_llm."""
    # Mock process_with_llm to track calls and parameters
    mock_llm = mocker.patch("src.api.main.process_with_llm")
    # Return a structured response
    mock_llm.return_value = {"age": 35}

    # Create a batch request with a schema
    payload = {
        "prompts": [
            {"prompt": "I'm 35 years old", "response_format": apps_script_format_schema}
        ]
    }

    # Make the request
    response = client.post("/api/v1/prompts", json=payload, headers=auth_headers)

    # Verify the API call was successful
    assert response.status_code == 200

    # IMPORTANT: This is the key assertion that would have caught our bug
    # Verify process_with_llm was called with a response_model parameter
    calls = mock_llm.call_args_list
    assert len(calls) > 0
    for call in calls:
        kwargs = call[1]
        assert "response_model" in kwargs, (
            "response_model not passed to process_with_llm"
        )
        assert kwargs["response_model"] is not None, "response_model is None"


def test_batch_endpoint_returns_structured_data(
    client: TestClient,
    mocker: Any,
    auth_headers: Dict[str, str],
    apps_script_format_schema: Dict[str, Any],
) -> None:
    """Test that the batch endpoint returns structured data when a schema is provided."""
    # Mock the LLM to return a structured response
    mock_llm = mocker.patch("src.api.main.process_with_llm")
    mock_llm.return_value = {"age": 35}

    # Create a batch request with a schema
    payload = {
        "prompts": [
            {"prompt": "I'm 35 years old", "response_format": apps_script_format_schema}
        ]
    }

    # Make the request
    response = client.post("/api/v1/prompts", json=payload, headers=auth_headers)

    # Verify success
    assert response.status_code == 200
    data = response.json()

    # Verify the response structure
    assert "responses" in data
    assert len(data["responses"]) == 1

    # Verify the response contains the structured data
    response_data = data["responses"][0]
    assert response_data["status"] == "success"
    assert isinstance(response_data["response"], dict)
    assert "age" in response_data["response"]
    assert response_data["response"]["age"] == 35


def test_batch_endpoint_field_extraction(
    client: TestClient,
    mocker: Any,
    auth_headers: Dict[str, str],
    apps_script_format_schema: Dict[str, Any],
) -> None:
    """Test that the batch endpoint correctly extracts fields from structured responses."""
    # Mock the LLM to return a structured response
    mock_llm = mocker.patch("src.api.main.process_with_llm")
    mock_llm.return_value = {"age": 35}

    # Create a batch request with a schema and field path
    payload = {
        "prompts": [
            {
                "prompt": "I'm 35 years old",
                "response_format": apps_script_format_schema,
                "extract_field_path": "age",
            }
        ]
    }

    # Make the request
    response = client.post("/api/v1/prompts", json=payload, headers=auth_headers)

    # Verify success
    assert response.status_code == 200
    data = response.json()

    # Verify the response structure
    assert "responses" in data
    assert len(data["responses"]) == 1

    # Verify we got the extracted field value directly
    response_data = data["responses"][0]
    assert response_data["status"] == "success"
    assert response_data["response"] == 35


def test_batch_endpoint_multiple_mixed_requests(
    client: TestClient,
    mocker: Any,
    auth_headers: Dict[str, str],
    apps_script_format_schema: Dict[str, Any],
) -> None:
    """Test the batch endpoint with mixed schema and non-schema requests."""
    # Mock the LLM implementation to handle different calls
    mock_llm = mocker.patch("src.api.main.process_with_llm")

    # Configure the mock to return different values based on input
    # First call - with schema - returns structured data
    # Second call - no schema - returns plain text
    mock_llm.side_effect = [
        {"age": 35},  # First call with schema
        "Plain text response",  # Second call without schema
    ]

    # Create a batch request with mixed items
    payload = {
        "prompts": [
            {
                "prompt": "I'm 35 years old",
                "response_format": apps_script_format_schema,
            },
            {
                "prompt": "Plain text prompt"
                # No schema for this one
            },
        ]
    }

    # Make the request
    response = client.post("/api/v1/prompts", json=payload, headers=auth_headers)

    # Verify success
    assert response.status_code == 200
    data = response.json()

    # Verify the response structure
    assert "responses" in data
    assert len(data["responses"]) == 2

    # First response should be structured
    first_response = data["responses"][0]
    assert first_response["status"] == "success"
    assert isinstance(first_response["response"], dict)
    assert first_response["response"]["age"] == 35

    # Second response should be plain text
    second_response = data["responses"][1]
    assert second_response["status"] == "success"
    assert second_response["response"] == "Plain text response"


@pytest.mark.integration
def test_prompts_endpoint_end_to_end_integration(
    client: TestClient,
    auth_headers: Dict[str, str],
    apps_script_format_schema: Dict[str, Any],
) -> None:
    """
    True end-to-end integration test for the /prompts batch endpoint with schema.

    This test does NOT mock the LLM and makes actual API calls to test the entire flow,
    including schema formatting and field extraction.

    Note: This test requires a valid API key and connection to the LLM service.
    """
    # Define age extraction schema
    age_schema = {
        "type": "json_schema",
        "json_schema": {
            "name": "AgeSchema",
            "schema": {
                "type": "object",
                "properties": {
                    "age": {
                        "type": "number",
                        "description": "The age mentioned in the text",
                    }
                },
                "required": ["age"],
            },
        },
    }

    # Create a batch request with prompts that should yield predictable structured responses
    payload = {
        "prompts": [
            # First prompt: schema without field extraction
            {
                "prompt": "I'm 35 years old. Extract my age as a number in a structured format.",
                "response_format": age_schema,
            },
            # Second prompt: schema with field extraction
            {
                "prompt": "I'm 42 years old. Extract my age as a number in a structured format.",
                "response_format": age_schema,
                "extract_field_path": "age",
            },
        ]
    }

    # Make the request to the real API without mocking
    response = client.post("/api/v1/prompts", json=payload, headers=auth_headers)

    # Basic response validation
    assert response.status_code == 200
    data = response.json()
    assert "responses" in data
    assert len(data["responses"]) == 2

    # Both responses should be successful
    assert data["responses"][0]["status"] == "success"
    assert data["responses"][1]["status"] == "success"

    # First response should be a structured object with an age field
    first_response = data["responses"][0]["response"]
    assert isinstance(first_response, dict)
    assert "age" in first_response
    assert isinstance(first_response["age"], int)
    assert first_response["age"] == 35  # Should match the age in the prompt

    # Second response should be the extracted age value directly
    second_response = data["responses"][1]["response"]
    assert isinstance(second_response, int)
    assert second_response == 42  # Should match the age in the prompt


@pytest.mark.integration
def test_person_schema_extraction_integration(
    client: TestClient, auth_headers: Dict[str, str]
) -> None:
    """
    End-to-end integration test using a more complex schema for person information.

    Tests the ability to extract structured data from text with multiple fields and types.
    """
    # Define a more complex person schema
    person_schema = {
        "type": "json_schema",
        "json_schema": {
            "name": "PersonSchema",
            "schema": {
                "type": "object",
                "properties": {
                    "name": {"type": "string"},
                    "age": {"type": "number"},
                    "isStudent": {"type": "boolean"},
                    "skills": {"type": "array", "items": {"type": "string"}},
                },
                "required": ["name", "age", "isStudent"],
            },
        },
    }

    # Test prompts that should yield person information
    payload = {
        "prompts": [
            # Full person schema
            {
                "prompt": "My name is John Smith, I'm 29 years old and not a student anymore. My skills include Python, JavaScript, and SQL.",
                "response_format": person_schema,
            },
            # Extract just the name
            {
                "prompt": "My name is Jane Doe, I'm 24 years old and I am a student. My skills include Java and C++.",
                "response_format": person_schema,
                "extract_field_path": "name",
            },
            # Extract just the isStudent boolean
            {
                "prompt": "My name is Bob Johnson, I'm 32 years old and I am not a student. My skills include React and Node.js.",
                "response_format": person_schema,
                "extract_field_path": "isStudent",
            },
        ]
    }

    # Make the request to the real API without mocking
    response = client.post("/api/v1/prompts", json=payload, headers=auth_headers)

    # Basic response validation
    assert response.status_code == 200
    data = response.json()
    assert "responses" in data
    assert len(data["responses"]) == 3

    # All responses should be successful
    for resp in data["responses"]:
        assert resp["status"] == "success"

    # First response should be a complete person object
    first_response = data["responses"][0]["response"]
    assert isinstance(first_response, dict)
    assert "name" in first_response
    assert "age" in first_response
    assert "isStudent" in first_response
    assert "skills" in first_response
    assert isinstance(first_response["name"], str)
    assert isinstance(first_response["age"], int)
    assert isinstance(first_response["isStudent"], bool)
    assert isinstance(first_response["skills"], list)
    assert first_response["name"] == "John Smith"
    assert first_response["age"] == 29
    assert first_response["isStudent"] is False

    # Second response should be just the name string
    second_response = data["responses"][1]["response"]
    assert isinstance(second_response, str)
    assert second_response == "Jane Doe"

    # Third response should be just the isStudent boolean
    third_response = data["responses"][2]["response"]
    assert isinstance(third_response, bool)
    assert third_response is False
