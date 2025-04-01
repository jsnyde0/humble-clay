"""Tests for API Pydantic models."""

import pytest
from pydantic import ValidationError

from src.api.models import PromptResponse  # Assuming models are in src.api.models

# --- Tests for PromptResponse model flexibility ---


def test_prompt_response_accepts_string():
    """Test PromptResponse accepts string in response field."""
    resp = PromptResponse(status="success", response="This is a string")
    assert resp.response == "This is a string"
    assert resp.status == "success"
    assert resp.error is None


def test_prompt_response_accepts_none():
    """Test PromptResponse accepts None in response field."""
    resp = PromptResponse(status="error", response=None, error="Something failed")
    assert resp.response is None
    assert resp.status == "error"
    assert resp.error == "Something failed"


# These tests SHOULD FAIL until the model is updated
def test_prompt_response_accepts_number():
    """Test PromptResponse accepts numbers (int/float) in response field."""
    resp_int = PromptResponse(status="success", response=123)
    assert resp_int.response == 123
    resp_float = PromptResponse(status="success", response=123.45)
    assert resp_float.response == 123.45


def test_prompt_response_accepts_boolean():
    """Test PromptResponse accepts booleans in response field."""
    resp_true = PromptResponse(status="success", response=True)
    assert resp_true.response is True
    resp_false = PromptResponse(status="success", response=False)
    assert resp_false.response is False


# This test ensures invalid types are still rejected
def test_prompt_response_rejects_invalid_types():
    """Test PromptResponse rejects unsupported types like list/dict."""
    with pytest.raises(ValidationError):
        PromptResponse(status="success", response=["a", "list"])
    with pytest.raises(ValidationError):
        PromptResponse(status="success", response={"a": "dict"})


# --- End tests for PromptResponse model flexibility ---

# TODO: Add tests for PromptRequest validation if needed
# TODO: Add tests for MultiplePromptsRequest validation if needed
