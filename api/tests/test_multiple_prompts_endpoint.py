"""Tests for the multiple prompt processing endpoint (/api/v1/prompts)."""

from typing import Any, Dict

import pytest
from fastapi.testclient import TestClient

# Multiple prompts tests (Moved from test_prompt_endpoints.py)


def test_multiple_prompts_endpoint_validates_input(
    client: TestClient, auth_headers: Dict[str, str]
) -> None:
    """Test input validation for multiple prompts endpoint."""
    # Empty array
    response = client.post(
        "/api/v1/prompts", json={"prompts": []}, headers=auth_headers
    )
    assert response.status_code == 422


def test_multiple_prompts_endpoint_processes_requests(
    client: TestClient, mocker: Any, auth_headers: Dict[str, str]
) -> None:
    """Test successful processing of multiple prompts."""
    mock_llm = mocker.patch("api.batch.processor.process_with_llm")
    mock_llm.side_effect = ["Response 1", "Response 2"]

    response = client.post(
        "/api/v1/prompts",
        json={"prompts": [{"prompt": "Prompt 1"}, {"prompt": "Prompt 2"}]},
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert "responses" in data
    assert len(data["responses"]) == 2
    assert all(r["status"] == "success" for r in data["responses"])
    assert data["responses"][0]["response"] == "Response 1"
    assert data["responses"][1]["response"] == "Response 2"


def test_multiple_prompts_endpoint_handles_partial_failure(
    client: TestClient, mocker: Any, auth_headers: Dict[str, str]
) -> None:
    """Test handling of partial failures in multiple prompts."""
    mock_llm = mocker.patch("api.batch.processor.process_with_llm")
    mock_llm.side_effect = ["Success", Exception("Failed")]

    response = client.post(
        "/api/v1/prompts",
        json={"prompts": [{"prompt": "Prompt 1"}, {"prompt": "Prompt 2"}]},
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["responses"]) == 2
    assert data["responses"][0]["status"] == "success"
    assert data["responses"][1]["status"] == "error"


def test_multiple_prompts_maintains_order(
    client: TestClient, mocker: Any, auth_headers: Dict[str, str]
) -> None:
    """Test that responses maintain the same order as input prompts."""
    mock_llm = mocker.patch("api.batch.processor.process_with_llm")
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
        headers=auth_headers,
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["responses"]) == 3
    assert data["responses"][0]["response"] == "First response"
    assert data["responses"][1]["response"] == "Second response"
    assert data["responses"][2]["response"] == "Third response"


@pytest.mark.llm
def test_multiple_prompts_endpoint_integration(
    client: TestClient, auth_headers: Dict[str, str]
) -> None:
    """Test actual LLM integration with multiple prompts."""
    prompts = [
        {"prompt": "You're a simple echo bot. Reply with EXACTLY this string: 'ONE'"},
        {"prompt": "You're a simple echo bot. Reply with EXACTLY this string: 'TWO'"},
        {"prompt": "You're a simple echo bot. Reply with EXACTLY this string: 'THREE'"},
    ]

    response = client.post(
        "/api/v1/prompts", json={"prompts": prompts}, headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["responses"]) == 3
    assert all(r["status"] == "success" for r in data["responses"])
    assert "ONE" in data["responses"][0]["response"]
    assert "TWO" in data["responses"][1]["response"]
    assert "THREE" in data["responses"][2]["response"]


@pytest.mark.asyncio
async def test_batch_processing_order(
    client: TestClient, mocker: Any, auth_headers: Dict[str, str]
) -> None:
    """Test that batch processing maintains prompt order."""
    prompts = [{"prompt": f"Prompt {i}"} for i in range(15)]
    mock_responses = [f"Response {i}" for i in range(15)]
    mock_llm = mocker.patch("api.batch.processor.process_with_llm")
    mock_llm.side_effect = mock_responses

    response = client.post(
        "/api/v1/prompts", json={"prompts": prompts}, headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["responses"]) == 15
    for i, resp in enumerate(data["responses"]):
        assert resp["status"] == "success"
        assert resp["response"] == f"Response {i}"


@pytest.mark.asyncio
async def test_batch_error_handling(
    client: TestClient, mocker: Any, auth_headers: Dict[str, str]
) -> None:
    """Test that errors in one batch don't affect others."""
    prompts = [{"prompt": f"Prompt {i}"} for i in range(15)]

    # Updated to handle response_model parameter
    async def mock_response(prompt: str, response_model=None, model=None) -> str:
        if prompt in ["Prompt 3", "Prompt 12"]:
            raise Exception("Test error")
        return f"Success for {prompt}"

    mock_llm = mocker.patch("api.batch.processor.process_with_llm")
    mock_llm.side_effect = mock_response

    response = client.post(
        "/api/v1/prompts", json={"prompts": prompts}, headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["responses"]) == 15
    assert data["responses"][3]["status"] == "error"
    assert data["responses"][12]["status"] == "error"
    assert data["responses"][0]["status"] == "success"
    assert data["responses"][13]["status"] == "success"


@pytest.mark.llm
def test_batch_processing_integration(
    client: TestClient, auth_headers: Dict[str, str]
) -> None:
    """Test batch processing with real LLM calls."""
    prompts = [{"prompt": f"Say 'test{i}' if you can read this."} for i in range(12)]

    response = client.post(
        "/api/v1/prompts", json={"prompts": prompts}, headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["responses"]) == 12
    for i, resp in enumerate(data["responses"]):
        assert resp["status"] == "success"
        assert f"test{i}" in resp["response"].lower()


# Tests for optional fields (Moved from test_prompt_endpoints.py)
# Fixture might be needed, move to conftest.py if required by both files
@pytest.fixture
def sample_schema() -> dict:
    return {
        "name": "test_schema",
        "schema": {
            "type": "object",
            "properties": {"output": {"type": "string"}},
            "required": ["output"],
        },
    }


def test_multiple_prompts_accepts_optional_fields(
    client: TestClient, mocker: Any, auth_headers: Dict[str, str], sample_schema: dict
) -> None:
    """Test that multiple prompts endpoint accepts optional fields per prompt."""
    # Setup mock with different responses for different calls
    mock_llm = mocker.patch("api.batch.processor.process_with_llm")

    # Define a dynamic side effect function to handle both structured and
    # unstructured outputs
    async def mock_llm_response(prompt, response_model=None, model=None):
        if response_model:
            # Return a model instance with the output field
            return response_model(output="Response 2 with schema/path")
        else:
            # Return a simple string for unstructured response
            return "Response 1"

    mock_llm.side_effect = mock_llm_response

    payload = {
        "prompts": [
            {"prompt": "Prompt 1"},  # Without optional fields
            {
                "prompt": "Prompt 2",  # With optional fields
                "response_format": {
                    "type": "json_schema",
                    "json_schema": sample_schema,
                },
                "extract_field_path": "output",
            },
        ]
    }
    response = client.post("/api/v1/prompts", json=payload, headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert len(data["responses"]) == 2
    assert data["responses"][0]["response"] == "Response 1"
    assert data["responses"][1]["response"] == "Response 2 with schema/path"
    assert mock_llm.call_count == 2


def test_multiple_prompts_works_without_optional_fields(
    client: TestClient, mocker: Any, auth_headers: Dict[str, str]
) -> None:
    """Test that multiple prompts endpoint works without optional fields."""
    mock_llm = mocker.patch("api.batch.processor.process_with_llm")
    mock_llm.side_effect = ["Resp A", "Resp B"]

    payload = {"prompts": [{"prompt": "Prompt A"}, {"prompt": "Prompt B"}]}
    response = client.post("/api/v1/prompts", json=payload, headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert len(data["responses"]) == 2
    assert data["responses"][0]["response"] == "Resp A"
    assert data["responses"][1]["response"] == "Resp B"
    assert mock_llm.call_count == 2
