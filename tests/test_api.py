"""Tests for the API endpoints."""

import os
from typing import Any

import pytest
from fastapi.testclient import TestClient

from src.api.main import app


@pytest.fixture
def client() -> TestClient:
    """Create a test client for the API."""
    return TestClient(app)


# Basic endpoint tests
def test_health_check_returns_status(client: TestClient) -> None:
    """Test that health check endpoint returns correct status and version."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == "0.1.0"


def test_root_returns_api_info(client: TestClient) -> None:
    """Test that root endpoint returns correct API information."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Humble Clay"
    assert data["version"] == "0.1.0"


# Prompt endpoint validation tests
def test_prompt_endpoint_accepts_valid_input(client: TestClient, mocker: Any) -> None:
    """Test that prompt endpoint accepts and processes valid input."""
    mock_llm = mocker.patch("src.api.main.process_with_llm")
    mock_llm.return_value = "Mocked LLM response"

    response = client.post("/api/v1/prompt", json={"prompt": "Test prompt"})

    assert response.status_code == 200
    data = response.json()
    assert "response" in data
    assert data["response"] == "Mocked LLM response"
    mock_llm.assert_called_once_with("Test prompt")


def test_prompt_endpoint_rejects_empty_prompt(client: TestClient) -> None:
    """Test that prompt endpoint rejects empty prompt with validation error."""
    response = client.post("/api/v1/prompt", json={"prompt": ""})
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data


def test_prompt_endpoint_requires_prompt_field(client: TestClient) -> None:
    """Test that prompt endpoint requires the prompt field."""
    response = client.post("/api/v1/prompt", json={})
    assert response.status_code == 422
    data = response.json()
    assert "detail" in data


def test_prompt_endpoint_handles_llm_errors(client: TestClient, mocker: Any) -> None:
    """Test that prompt endpoint properly handles LLM service errors."""
    mock_llm = mocker.patch("src.api.main.process_with_llm")
    mock_llm.side_effect = Exception("LLM service error")

    response = client.post("/api/v1/prompt", json={"prompt": "Test prompt"})

    assert response.status_code == 500
    data = response.json()
    assert "detail" in data


def test_prompt_endpoint_handles_invalid_api_key(
    client: TestClient, mocker: Any
) -> None:
    """Test that prompt endpoint handles invalid API key correctly."""
    mocker.patch.dict(os.environ, {"OPENROUTER_API_KEY": "invalid_key"})

    response = client.post("/api/v1/prompt", json={"prompt": "This should fail"})

    assert response.status_code == 500
    data = response.json()
    assert "detail" in data
    assert "OpenRouter API error" in data["detail"]


# LLM integration tests
@pytest.mark.llm
def test_prompt_endpoint_integrates_with_llm(client: TestClient) -> None:
    """Test that prompt endpoint successfully integrates with LLM service."""
    api_key = os.getenv("OPENROUTER_API_KEY")
    assert api_key, "OPENROUTER_API_KEY environment variable not set"

    response = client.post(
        "/api/v1/prompt", json={"prompt": "Say 'test successful' if you can read this."}
    )

    assert response.status_code == 200, f"Failed with response: {response.text}"
    data = response.json()
    assert "response" in data, f"Unexpected response format: {data}"
    assert len(data["response"]) > 0, "Empty response from LLM"
