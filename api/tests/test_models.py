"""Tests for API Pydantic models."""

import pytest
from pydantic import ValidationError

from api.models import PromptResponse  # Assuming models are in api.models

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
def test_prompt_response_accepts_structured_data():
    """
    Test PromptResponse accepts dictionaries and lists (structured data) in
    response field.
    """
    # Test with dictionary
    resp_dict = PromptResponse(status="success", response={"name": "John", "age": 30})
    assert resp_dict.response == {"name": "John", "age": 30}

    # Test with list
    resp_list = PromptResponse(status="success", response=["item1", "item2"])
    assert resp_list.response == ["item1", "item2"]

    # Test with nested structures
    resp_nested = PromptResponse(
        status="success",
        response={"user": {"name": "John", "skills": ["Python", "JavaScript"]}},
    )
    assert resp_nested.response["user"]["skills"] == ["Python", "JavaScript"]


def test_prompt_response_rejects_invalid_types():
    """Test PromptResponse rejects truly unsupported types."""

    class TestClass:
        pass

    # Class object should be rejected
    with pytest.raises(ValidationError):
        PromptResponse(status="success", response=TestClass)

    # Function object should be rejected
    with pytest.raises(ValidationError):
        PromptResponse(status="success", response=lambda x: x)

    # Complex number should be rejected (not JSON serializable)
    with pytest.raises(ValidationError):
        PromptResponse(status="success", response=complex(1, 2))

    # Custom object should be rejected
    with pytest.raises(ValidationError):
        PromptResponse(status="success", response=TestClass())


# --- End tests for PromptResponse model flexibility ---

# TODO: Add tests for PromptRequest validation if needed
# TODO: Add tests for MultiplePromptsRequest validation if needed
