"""Tests for the single prompt processing endpoint (/api/v1/prompt)."""

import os
from typing import Any, Dict

import pytest
from fastapi.testclient import TestClient

# Single prompt tests (Moved from test_prompt_endpoints.py)


def test_prompt_endpoint_accepts_valid_input(
    client: TestClient, mocker: Any, auth_headers: Dict[str, str]
) -> None:
    """Test that prompt endpoint accepts and processes valid input."""
    mock_llm = mocker.patch("src.api.main.process_with_llm")
    mock_llm.return_value = "Mocked LLM response"

    response = client.post(
        "/api/v1/prompt", json={"prompt": "Test prompt"}, headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert data["response"] == "Mocked LLM response"
    mock_llm.assert_called_once_with("Test prompt")


def test_prompt_endpoint_accepts_empty_prompt(
    client: TestClient, mocker: Any, auth_headers: Dict[str, str]
) -> None:
    """Test that prompt endpoint accepts an empty prompt."""
    mock_llm = mocker.patch("src.api.main.process_with_llm")
    mock_llm.return_value = "Processed empty prompt"

    response = client.post("/api/v1/prompt", json={"prompt": ""}, headers=auth_headers)

    assert response.status_code == 200  # Expect OK now
    data = response.json()
    assert data.get("response") == "Processed empty prompt"
    mock_llm.assert_called_once_with("")  # Verify LLM called with empty string


def test_prompt_endpoint_requires_prompt_field(
    client: TestClient, auth_headers: Dict[str, str]
) -> None:
    """Test that prompt endpoint requires the prompt field."""
    response = client.post("/api/v1/prompt", json={}, headers=auth_headers)
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data


def test_prompt_endpoint_handles_llm_errors(
    client: TestClient, mocker: Any, auth_headers: Dict[str, str]
) -> None:
    """Test that prompt endpoint properly handles LLM service errors."""
    mock_llm = mocker.patch("src.api.main.process_with_llm")
    mock_llm.side_effect = Exception("LLM service error")

    response = client.post(
        "/api/v1/prompt", json={"prompt": "Test prompt"}, headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "error"
    assert "LLM service error" in data["error"]


def test_prompt_endpoint_handles_invalid_api_key(
    client: TestClient, auth_headers: Dict[str, str]
) -> None:
    """Test that prompt endpoint handles invalid API key correctly."""
    headers = auth_headers.copy()
    headers["X-API-Key"] = "wrong_key"

    response = client.post(
        "/api/v1/prompt", json={"prompt": "This should fail"}, headers=headers
    )

    assert response.status_code == 403
    assert "Invalid API key" in response.json()["detail"]


@pytest.mark.llm
def test_prompt_endpoint_integrates_with_llm(
    client: TestClient, auth_headers: Dict[str, str]
) -> None:
    """Test that prompt endpoint successfully integrates with LLM service."""
    api_key = os.getenv("OPENROUTER_API_KEY")
    assert api_key, "OPENROUTER_API_KEY environment variable not set"

    response = client.post(
        "/api/v1/prompt",
        json={"prompt": "Say 'test successful' if you can read this."},
        headers=auth_headers,
    )

    assert response.status_code == 200, f"Failed with response: {response.text}"
    data = response.json()
    assert "response" in data, f"Unexpected response format: {data}"
    assert len(data["response"]) > 0, "Empty response from LLM"


# Tests for optional fields (Moved from test_prompt_endpoints.py)
@pytest.fixture
def sample_schema() -> dict:
    """Provides a sample JSON schema for testing."""
    # This fixture might be needed by multiple files, consider moving to conftest.py
    return {
        "name": "test_schema",
        "schema": {
            "type": "object",
            "properties": {"output": {"type": "string"}},
            "required": ["output"],
        },
    }


def test_prompt_endpoint_accepts_optional_fields(
    client: TestClient, mocker: Any, auth_headers: Dict[str, str], sample_schema: dict
) -> None:
    """Test that prompt endpoint accepts optional response_format and extract_field_path."""
    mock_llm = mocker.patch("src.api.main.process_with_llm")
    mock_llm.return_value = "Processed with schema and path"

    payload = {
        "prompt": "Test prompt",
        "response_format": {"type": "json_schema", "json_schema": sample_schema},
        "extract_field_path": "output",
    }
    response = client.post("/api/v1/prompt", json=payload, headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["response"] == "Processed with schema and path"
    mock_llm.assert_called_once()


def test_prompt_endpoint_works_without_optional_fields(
    client: TestClient, mocker: Any, auth_headers: Dict[str, str]
) -> None:
    """Test that prompt endpoint works normally without the optional fields."""
    mock_llm = mocker.patch("src.api.main.process_with_llm")
    mock_llm.return_value = "Standard response"

    payload = {"prompt": "Test prompt without extras"}
    response = client.post("/api/v1/prompt", json=payload, headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["response"] == "Standard response"
    mock_llm.assert_called_once_with("Test prompt without extras")
