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
