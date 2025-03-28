"""Tests for prompt processing endpoints."""

import os
from typing import Any

import pytest
from fastapi.testclient import TestClient

from src.api.main import app


@pytest.fixture
def client() -> TestClient:
    """Create a test client for the API."""
    return TestClient(app)


# Single prompt tests
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


# Multiple prompts tests
def test_multiple_prompts_endpoint_validates_input(client: TestClient) -> None:
    """Test input validation for multiple prompts endpoint."""
    # Empty array
    response = client.post("/api/v1/prompts", json={"prompts": []})
    assert response.status_code == 422

    # Exceeds maximum
    response = client.post(
        "/api/v1/prompts", json={"prompts": [{"prompt": "test"}] * 1001}
    )
    assert response.status_code == 422

    # Invalid prompt format
    response = client.post("/api/v1/prompts", json={"prompts": [{"invalid": "format"}]})
    assert response.status_code == 422


def test_multiple_prompts_endpoint_processes_requests(
    client: TestClient, mocker: Any
) -> None:
    """Test successful processing of multiple prompts."""
    mock_llm = mocker.patch("src.api.main.process_with_llm")
    mock_llm.side_effect = ["Response 1", "Response 2"]

    response = client.post(
        "/api/v1/prompts",
        json={
            "prompts": [
                {"prompt": "Prompt 1"},  # Correct format matching PromptRequest
                {"prompt": "Prompt 2"},
            ]
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert "responses" in data
    assert len(data["responses"]) == 2
    assert all(r["status"] == "success" for r in data["responses"])
    assert data["responses"][0]["response"] == "Response 1"
    assert data["responses"][1]["response"] == "Response 2"


def test_multiple_prompts_endpoint_handles_partial_failure(
    client: TestClient, mocker: Any
) -> None:
    """Test handling of partial failures in multiple prompts."""
    mock_llm = mocker.patch("src.api.main.process_with_llm")
    mock_llm.side_effect = ["Success", Exception("Failed")]

    response = client.post(
        "/api/v1/prompts",
        json={
            "prompts": [
                {"prompt": "Prompt 1"},  # Correct format
                {"prompt": "Prompt 2"},
            ]
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["responses"]) == 2
    assert data["responses"][0]["status"] == "success"
    assert data["responses"][1]["status"] == "error"


def test_multiple_prompts_maintains_order(client: TestClient, mocker: Any) -> None:
    """Test that responses maintain the same order as input prompts."""
    mock_llm = mocker.patch("src.api.main.process_with_llm")
    # Responses that clearly indicate order
    mock_llm.side_effect = ["First response", "Second response", "Third response"]

    response = client.post(
        "/api/v1/prompts",
        json={
            "prompts": [
                {"prompt": "First prompt"},
                {"prompt": "Second prompt"},
                {"prompt": "Third prompt"},
            ]
        },
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["responses"]) == 3
    assert data["responses"][0]["response"] == "First response"
    assert data["responses"][1]["response"] == "Second response"
    assert data["responses"][2]["response"] == "Third response"


@pytest.mark.llm
def test_multiple_prompts_endpoint_integration(client: TestClient) -> None:
    """Test actual LLM integration with multiple prompts, including order preservation."""
    # Using prompts that should generate distinct responses
    prompts = [
        {"prompt": "Respond with exactly 'First: Hello'"},
        {"prompt": "Respond with exactly 'Second: World'"},
        {"prompt": "Respond with exactly 'Third: Test'"},
    ]

    response = client.post("/api/v1/prompts", json={"prompts": prompts})

    assert response.status_code == 200
    data = response.json()
    assert len(data["responses"]) == 3

    # Verify all succeeded
    assert all(r["status"] == "success" for r in data["responses"])

    # Verify order preservation
    assert "First" in data["responses"][0]["response"]
    assert "Second" in data["responses"][1]["response"]
    assert "Third" in data["responses"][2]["response"]


@pytest.mark.asyncio
async def test_batch_processing_order(client: TestClient, mocker: Any) -> None:
    """Test that batch processing maintains prompt order."""
    # Create more prompts than batch size
    prompts = [{"prompt": f"Prompt {i}"} for i in range(15)]  # > BATCH_SIZE

    # Mock responses that clearly show order
    mock_responses = [f"Response {i}" for i in range(15)]
    mock_llm = mocker.patch("src.api.main.process_with_llm")
    mock_llm.side_effect = mock_responses

    response = client.post("/api/v1/prompts", json={"prompts": prompts})

    assert response.status_code == 200
    data = response.json()
    assert len(data["responses"]) == 15

    # Verify order is maintained
    for i, resp in enumerate(data["responses"]):
        assert resp["status"] == "success"
        assert resp["response"] == f"Response {i}"


@pytest.mark.asyncio
async def test_batch_error_handling(client: TestClient, mocker: Any) -> None:
    """Test that errors in one batch don't affect others."""
    prompts = [{"prompt": f"Prompt {i}"} for i in range(15)]

    # Mock some failures in different batches
    def mock_response(prompt: str) -> str:
        # Fix: Only fail exact matches for "Prompt 3" and "Prompt 12"
        if prompt in ["Prompt 3", "Prompt 12"]:  # More precise condition
            raise Exception("Test error")
        return f"Success for {prompt}"

    mock_llm = mocker.patch("src.api.main.process_with_llm")
    mock_llm.side_effect = mock_response

    response = client.post("/api/v1/prompts", json={"prompts": prompts})

    assert response.status_code == 200
    data = response.json()
    assert len(data["responses"]) == 15

    # Verify specific failures and successes
    assert data["responses"][3]["status"] == "error"
    assert data["responses"][12]["status"] == "error"
    assert data["responses"][0]["status"] == "success"
    assert data["responses"][13]["status"] == "success"  # Should now pass


@pytest.mark.llm
async def test_batch_processing_integration(client: TestClient) -> None:
    """Test batch processing with real LLM calls."""
    # Create enough prompts to test batching
    prompts = [
        {"prompt": f"Say 'test{i}' if you can read this."}
        for i in range(12)  # > BATCH_SIZE
    ]

    response = client.post("/api/v1/prompts", json={"prompts": prompts})

    assert response.status_code == 200
    data = response.json()
    assert len(data["responses"]) == 12

    # Verify responses contain expected numbers
    for i, resp in enumerate(data["responses"]):
        assert resp["status"] == "success"
        assert f"test{i}" in resp["response"].lower()
