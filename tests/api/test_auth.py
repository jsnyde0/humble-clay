"""Tests for API authentication."""

import os
from typing import Any

import pytest
from fastapi.testclient import TestClient

from src.api.main import app


@pytest.fixture
def client() -> TestClient:
    """Create a test client for the API."""
    return TestClient(app)


@pytest.fixture
def api_key() -> str:
    """Provide a test API key."""
    return "test_api_key"


@pytest.fixture(autouse=True)
def setup_api_key(api_key: str) -> None:
    """Set up API key in environment."""
    old_key = os.environ.get("HUMBLE_CLAY_API_KEY")
    os.environ["HUMBLE_CLAY_API_KEY"] = api_key
    yield
    if old_key:
        os.environ["HUMBLE_CLAY_API_KEY"] = old_key
    else:
        del os.environ["HUMBLE_CLAY_API_KEY"]


def test_missing_api_key(client: TestClient) -> None:
    """Test that requests without API key are rejected."""
    response = client.post("/api/v1/prompt", json={"prompt": "test"})
    assert response.status_code == 403
    assert "not authenticated" in response.json()["detail"].lower()


def test_invalid_api_key(client: TestClient, api_key: str) -> None:
    """Test that requests with invalid API key are rejected."""
    response = client.post(
        "/api/v1/prompt", json={"prompt": "test"}, headers={"X-API-Key": "wrong_key"}
    )
    assert response.status_code == 403
    assert "Invalid API key" in response.json()["detail"]


def test_valid_api_key(client: TestClient, api_key: str, mocker: Any) -> None:
    """Test that requests with valid API key are accepted."""
    mock_llm = mocker.patch("src.api.main.process_with_llm")
    mock_llm.return_value = "test response"

    response = client.post(
        "/api/v1/prompt", json={"prompt": "test"}, headers={"X-API-Key": api_key}
    )
    assert response.status_code == 200
    assert response.json()["response"] == "test response"
    # Verify the function was called
    mock_llm.assert_called_once()
    # Verify the prompt parameter
    args, kwargs = mock_llm.call_args
    assert args[0] == "test"


def test_multiple_prompts_with_auth(
    client: TestClient, api_key: str, mocker: Any
) -> None:
    """Test that multiple prompts endpoint requires authentication."""
    mock_llm = mocker.patch("src.api.main.process_with_llm")
    mock_llm.return_value = "test response"

    response = client.post(
        "/api/v1/prompts",
        json={"prompts": [{"prompt": "test1"}, {"prompt": "test2"}]},
        headers={"X-API-Key": api_key},
    )
    assert response.status_code == 200
    assert len(response.json()["responses"]) == 2
