"""Tests for concurrent batch processing implementation."""

import asyncio
import time
from typing import Any, Dict

import pytest
from fastapi.testclient import TestClient

from src.api.batch.processor import (
    prepare_prompt_request,
    process_multiple_prompts,
)
from src.api.models import MultiplePromptsRequest, PromptRequest


@pytest.mark.asyncio
async def test_prepare_prompt_request_standard():
    """Test preparation of a standard prompt request without schema."""
    prompt_request = PromptRequest(prompt="Test prompt")

    prompt, response_model, has_schema = await prepare_prompt_request(prompt_request)

    assert prompt == "Test prompt"
    assert response_model is None
    assert has_schema is False


@pytest.mark.asyncio
async def test_prepare_prompt_request_with_schema(sample_schema: dict):
    """Test preparation of a prompt request with JSON schema."""
    prompt_request = PromptRequest(
        prompt="Test prompt with schema",
        response_format={"type": "json_schema", "json_schema": sample_schema},
    )

    prompt, response_model, has_schema = await prepare_prompt_request(prompt_request)

    assert prompt == "Test prompt with schema"
    assert response_model is not None
    assert has_schema is True
    # Verify the model has the expected field
    assert "output" in response_model.__annotations__


@pytest.mark.asyncio
async def test_concurrent_processing_maintains_order(mocker: Any):
    """Test that concurrent processing maintains the order of responses."""
    # Mock process_with_llm to return responses with different delays
    mock_process = mocker.patch("src.api.batch.processor.process_with_llm")

    # Simulate varying response times that would change order if not handled correctly
    async def delayed_response(prompt, response_model=None, model=None):
        # Make later requests finish first
        delay = (
            0.2 - int(prompt.split()[-1]) * 0.02
        )  # Prompt 0 gets 0.2s, Prompt 9 gets 0.02s
        await asyncio.sleep(max(0.01, delay))  # Ensure at least some delay
        return f"Response: {prompt}"

    mock_process.side_effect = delayed_response

    # Create request with multiple prompts
    prompts = [PromptRequest(prompt=f"Prompt {i}") for i in range(10)]
    request = MultiplePromptsRequest(prompts=prompts)

    # Process the request
    response = await process_multiple_prompts(request, batch_size=10)

    # Verify that responses maintain the original order
    assert len(response.responses) == 10
    for i, resp in enumerate(response.responses):
        assert resp.response == f"Response: Prompt {i}"


@pytest.mark.asyncio
async def test_concurrent_error_handling(mocker: Any):
    """Test error handling during concurrent processing."""
    # Mock process_with_llm to simulate errors for specific prompts
    mock_process = mocker.patch("src.api.batch.processor.process_with_llm")

    async def mock_response(prompt, response_model=None, model=None):
        await asyncio.sleep(0.05)  # Small delay
        # Fail for specific prompts
        if prompt in ["Prompt 2", "Prompt 7"]:
            raise Exception(f"Test error for {prompt}")
        return f"Success: {prompt}"

    mock_process.side_effect = mock_response

    # Create request with multiple prompts
    prompts = [PromptRequest(prompt=f"Prompt {i}") for i in range(10)]
    request = MultiplePromptsRequest(prompts=prompts)

    # Process the request
    response = await process_multiple_prompts(request, batch_size=10)

    # Verify that errors are handled correctly
    assert len(response.responses) == 10

    # Check successful responses
    for i in range(10):
        if i in [2, 7]:
            assert response.responses[i].status == "error"
            assert "Test error for Prompt" in response.responses[i].error
        else:
            assert response.responses[i].status == "success"
            assert response.responses[i].response == f"Success: Prompt {i}"


@pytest.mark.asyncio
async def test_first_result_time_tracking(mocker: Any):
    """Test that first result time is tracked correctly."""
    # Mock process_with_llm with varying delays
    mock_process = mocker.patch("src.api.batch.processor.process_with_llm")
    mock_log_first = mocker.patch("src.api.batch.processor.log_first_result")

    async def delayed_response(prompt, response_model=None, model=None):
        # Make the third prompt finish first
        idx = int(prompt.split()[-1])
        if idx == 2:
            await asyncio.sleep(0.05)
        else:
            await asyncio.sleep(0.2)
        return f"Response: {prompt}"

    mock_process.side_effect = delayed_response

    # Create request with multiple prompts
    prompts = [PromptRequest(prompt=f"Prompt {i}") for i in range(5)]
    request = MultiplePromptsRequest(prompts=prompts)

    # Process the request
    await process_multiple_prompts(request, batch_size=5)

    # Verify log_first_result was called
    assert mock_log_first.called

    # The first completed should be prompt 2, but the first in order should be prompt 0
    call_args = mock_log_first.call_args[0]
    # We can't check exact times, but we can verify it was called with 2 parameters
    assert len(call_args) == 2


@pytest.mark.asyncio
async def test_batch_processing_with_large_input(mocker: Any):
    """Test processing a large number of prompts in multiple batches."""
    mock_process = mocker.patch("src.api.batch.processor.process_with_llm")

    async def mock_response(prompt, response_model=None, model=None):
        # Add small delay to simulate real processing
        await asyncio.sleep(0.01)
        return f"Response for {prompt}"

    mock_process.side_effect = mock_response

    # Create a large number of prompts
    num_prompts = 25
    batch_size = 10
    prompts = [PromptRequest(prompt=f"Prompt {i}") for i in range(num_prompts)]
    request = MultiplePromptsRequest(prompts=prompts)

    # Process the request
    response = await process_multiple_prompts(request, batch_size=batch_size)

    # Verify results
    assert len(response.responses) == num_prompts

    # Check all responses
    for i in range(num_prompts):
        assert response.responses[i].status == "success"
        assert response.responses[i].response == f"Response for Prompt {i}"

    # Verify the number of calls
    assert mock_process.call_count == num_prompts


@pytest.mark.parametrize("batch_size", [1, 3, 5, 10])
@pytest.mark.asyncio
async def test_different_batch_sizes(mocker: Any, batch_size: int):
    """Test processing with different batch sizes (which controls concurrency)."""
    # Mock functions
    mock_process = mocker.patch("src.api.batch.processor.process_with_llm")

    async def mock_response(prompt, response_model=None, model=None):
        await asyncio.sleep(0.05)
        return f"Response for {prompt}"

    mock_process.side_effect = mock_response

    # Create prompts
    num_prompts = 15
    prompts = [PromptRequest(prompt=f"Prompt {i}") for i in range(num_prompts)]
    request = MultiplePromptsRequest(prompts=prompts)

    # Measure execution time
    start_time = time.time()
    response = await process_multiple_prompts(request, batch_size=batch_size)
    end_time = time.time()

    # Verify results
    assert len(response.responses) == num_prompts

    # Verify all responses are successful
    assert all(r.status == "success" for r in response.responses)

    # Calculate expected batches
    expected_batches = (num_prompts + batch_size - 1) // batch_size
    # Each batch is processed concurrently, so time should be roughly:
    # total_batches * 0.05 seconds
    expected_time = expected_batches * 0.05

    # This is just a rough check to make sure concurrency is working within batches
    # but sequential between batches
    assert end_time - start_time >= expected_time * 0.9, (
        "Batches not processed sequentially"
    )
    assert end_time - start_time <= expected_time * 2, "Batch concurrency not effective"


# Integration Tests


@pytest.mark.llm
def test_concurrent_processing_endpoint(
    client: TestClient, auth_headers: Dict[str, str]
):
    """Test the endpoint with concurrent processing enabled."""
    # Create a reasonable number of prompts for real testing
    prompts = [
        {"prompt": f"You're a simple echo bot. Reply with EXACTLY: 'ECHO{i}'"}
        for i in range(5)
    ]

    response = client.post(
        "/api/v1/prompts", json={"prompts": prompts}, headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["responses"]) == 5

    # Verify all responses were processed
    assert all(r["status"] == "success" for r in data["responses"])

    # Check that responses match expectations
    for i, resp in enumerate(data["responses"]):
        assert f"ECHO{i}" in resp["response"]


@pytest.mark.llm
def test_concurrent_processing_with_errors(
    client: TestClient, auth_headers: Dict[str, str], mocker: Any
):
    """Test concurrent processing with some expected LLM errors."""
    # Mock LLM to control the behavior consistently
    mock_process = mocker.patch("src.api.batch.processor.process_with_llm")

    async def mock_llm_response(prompt, response_model=None, model=None):
        # Simulate LLM calls with consistent behavior
        if "empty" in prompt.lower():
            return ""
        return f"Response for: {prompt}"

    mock_process.side_effect = mock_llm_response

    # Create prompts that are likely to succeed or fail
    prompts = [
        # Normal prompts that should succeed
        {"prompt": "Say hello"},
        {"prompt": "Count to 3"},
        # Empty prompt
        {"prompt": "empty prompt"},
        # Another valid prompt
        {"prompt": "Say goodbye"},
        # Invalid field path that will cause an extraction error
        {"prompt": "Generate JSON", "extract_field_path": "field.that.does.not.exist"},
    ]

    response = client.post(
        "/api/v1/prompts", json={"prompts": prompts}, headers=auth_headers
    )

    assert response.status_code == 200
    data = response.json()
    assert len(data["responses"]) == 5

    # Verify the expected pattern of successes and failures
    assert data["responses"][0]["status"] == "success"
    assert data["responses"][1]["status"] == "success"
    assert data["responses"][3]["status"] == "success"

    # The last one should fail due to field extraction error
    assert data["responses"][4]["status"] == "error"
    assert "Field extraction requires a schema" in data["responses"][4]["error"]
