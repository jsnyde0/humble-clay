"""Tests for basic functionality of the prompt endpoint."""

from typing import Any, Dict

from fastapi.testclient import TestClient


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
    mock_llm.assert_called_once()
    args, kwargs = mock_llm.call_args
    assert args[0] == "Test prompt"


def test_prompt_endpoint_accepts_empty_prompt(
    client: TestClient, mocker: Any, auth_headers: Dict[str, str]
) -> None:
    """Test that prompt endpoint accepts an empty prompt."""
    mock_llm = mocker.patch("src.api.main.process_with_llm")
    mock_llm.return_value = "Processed empty prompt"

    response = client.post("/api/v1/prompt", json={"prompt": ""}, headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data.get("response") == "Processed empty prompt"
    mock_llm.assert_called_once()
    args, kwargs = mock_llm.call_args
    assert args[0] == ""


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
