"""Tests for LLM processing utilities."""

from unittest.mock import AsyncMock

import httpx
import pytest

from src.api.llm import process_with_llm

# Mark all tests in this file as asyncio
pytestmark = pytest.mark.asyncio


@pytest.fixture
def mock_httpx_client(mocker):  # Renamed from mock_client to avoid conflict
    """Fixture to mock httpx.AsyncClient."""
    mock_resp = AsyncMock(spec=httpx.Response)
    mock_resp.status_code = 200
    mock_resp.json.return_value = {
        "choices": [{"message": {"content": "Mocked LLM response"}}]
    }

    mock_post = AsyncMock(return_value=mock_resp)
    mock_async_client = mocker.patch("httpx.AsyncClient", autospec=True)
    # Configure the __aenter__ return value which is used in 'async with'
    mock_async_client.return_value.__aenter__.return_value.post = mock_post
    return mock_post  # Return the mock_post to check calls


async def test_process_with_llm_no_schema(mock_httpx_client):
    """Test process_with_llm sends correct payload without schema."""
    await process_with_llm("Test prompt")

    mock_httpx_client.assert_called_once()
    call_args, call_kwargs = mock_httpx_client.call_args
    sent_payload = call_kwargs.get("json", {})

    assert "response_format" not in sent_payload
    assert sent_payload["messages"] == [{"role": "user", "content": "Test prompt"}]
    assert sent_payload["model"] == "google/gemini-pro"


async def test_process_with_llm_with_schema(mock_httpx_client):
    """Test process_with_llm passes response_format correctly."""
    sample_schema_param = {
        "type": "json_schema",
        "json_schema": {"name": "test", "schema": {"type": "string"}},
    }

    # We need to modify process_with_llm signature first for this test to be valid
    # For now, let's assume it takes response_format as an optional arg
    # This test SHOULD FAIL with TypeError until process_with_llm is modified

    # Call the function with the new argument (this will cause TypeError initially)
    await process_with_llm("Schema prompt", response_format=sample_schema_param)

    # Assertions now active - will only be reached after function signature is fixed
    mock_httpx_client.assert_called_once()
    call_args, call_kwargs = mock_httpx_client.call_args
    sent_payload = call_kwargs.get("json", {})

    assert "response_format" in sent_payload
    assert sent_payload["response_format"] == sample_schema_param
    assert sent_payload["messages"] == [{"role": "user", "content": "Schema prompt"}]
    assert sent_payload["model"] == "google/gemini-pro"


async def test_process_with_llm_handles_api_error(mocker):
    """Test process_with_llm raises exception on API error."""
    mock_resp = AsyncMock(spec=httpx.Response)
    mock_resp.status_code = 500
    mock_resp.text = "Server error"

    mock_post = AsyncMock(return_value=mock_resp)
    mock_async_client = mocker.patch("httpx.AsyncClient", autospec=True)
    mock_async_client.return_value.__aenter__.return_value.post = mock_post

    with pytest.raises(Exception, match="OpenRouter API error: Server error"):
        await process_with_llm("Error prompt")
