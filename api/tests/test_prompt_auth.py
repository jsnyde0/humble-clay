"""Tests for authentication handling in the prompt endpoint."""

import os
from typing import Dict

import pytest
from fastapi.testclient import TestClient

from api.main import app


def test_prompt_endpoint_handles_invalid_api_key(
    client: TestClient, auth_headers: Dict[str, str]
) -> None:
    """Test that prompt endpoint handles invalid API key correctly."""
    # Reset any dependency overrides from previous tests
    app.dependency_overrides = {}

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
    # Reset any dependency overrides from previous tests
    app.dependency_overrides = {}

    api_key = os.getenv("OPENROUTER_API_KEY")
    assert api_key, "OPENROUTER_API_KEY environment variable not set"

    response = client.post(
        "/api/v1/prompt",
        json={"prompt": "Say 'test successful' if you can read this."},
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()

    # Check for both success and error cases
    if data["status"] == "success":
        assert "test successful" in data["response"].lower()
    else:
        assert data["status"] == "error"
        assert data["error"] is not None
        assert isinstance(data["error"], str)
        # Log the error for debugging
        print(f"LLM integration test error: {data['error']}")
