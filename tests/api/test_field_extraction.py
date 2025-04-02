"""Tests for field extraction functionality in the prompt endpoint."""

from typing import Any, Dict

from fastapi.testclient import TestClient


def test_field_extraction_top_level(
    client: TestClient, mocker: Any, auth_headers: Dict[str, str], sample_schema: dict
) -> None:
    """Test extraction of a top-level field from the generated JSON."""
    mock_llm = mocker.patch("src.api.main.process_with_llm")
    mock_llm.return_value = {"output": "test value"}

    payload = {
        "prompt": "Test prompt",
        "response_format": {"type": "json_schema", "json_schema": sample_schema},
        "extract_field_path": "output",
    }
    response = client.post("/api/v1/prompt", json=payload, headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["response"] == "test value"


def test_field_extraction_nested(
    client: TestClient, mocker: Any, auth_headers: Dict[str, str], nested_schema: dict
) -> None:
    """Test extraction of a nested field from the generated JSON."""
    mock_llm = mocker.patch("src.api.main.process_with_llm")
    mock_llm.return_value = {
        "user": {
            "name": "John Doe",
            "age": 30,
            "address": {"city": "London", "country": "UK"},
        },
        "active": True,
    }

    payload = {
        "prompt": "Test prompt",
        "response_format": {"type": "json_schema", "json_schema": nested_schema},
        "extract_field_path": "user.address.city",
    }
    response = client.post("/api/v1/prompt", json=payload, headers=auth_headers)

    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "success"
    assert data["response"] == "London"


def test_field_extraction_different_types(
    client: TestClient, mocker: Any, auth_headers: Dict[str, str], nested_schema: dict
) -> None:
    """Test extraction of fields with different data types."""
    mock_llm = mocker.patch("src.api.main.process_with_llm")
    mock_llm.return_value = {
        "user": {
            "name": "John Doe",
            "age": 30,
            "address": {"city": "London", "country": "UK"},
        },
        "active": True,
    }

    # Test string extraction
    response = client.post(
        "/api/v1/prompt",
        json={
            "prompt": "Test prompt",
            "response_format": {"type": "json_schema", "json_schema": nested_schema},
            "extract_field_path": "user.name",
        },
        headers=auth_headers,
    )
    assert response.json()["response"] == "John Doe"

    # Test number extraction
    response = client.post(
        "/api/v1/prompt",
        json={
            "prompt": "Test prompt",
            "response_format": {"type": "json_schema", "json_schema": nested_schema},
            "extract_field_path": "user.age",
        },
        headers=auth_headers,
    )
    assert response.json()["response"] == 30

    # Test boolean extraction
    response = client.post(
        "/api/v1/prompt",
        json={
            "prompt": "Test prompt",
            "response_format": {"type": "json_schema", "json_schema": nested_schema},
            "extract_field_path": "active",
        },
        headers=auth_headers,
    )
    assert response.json()["response"] is True


def test_field_extraction_invalid_path(
    client: TestClient, mocker: Any, auth_headers: Dict[str, str], nested_schema: dict
) -> None:
    """Test handling of invalid field paths."""
    mock_llm = mocker.patch("src.api.main.process_with_llm")
    mock_llm.return_value = {"user": {"name": "John Doe", "age": 30}}

    # Test non-existent field
    response = client.post(
        "/api/v1/prompt",
        json={
            "prompt": "Test prompt",
            "response_format": {"type": "json_schema", "json_schema": nested_schema},
            "extract_field_path": "user.nonexistent",
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "error"
    assert "Field not found" in data["error"]

    # Test invalid path format
    response = client.post(
        "/api/v1/prompt",
        json={
            "prompt": "Test prompt",
            "response_format": {"type": "json_schema", "json_schema": nested_schema},
            "extract_field_path": "user..name",  # Invalid path format
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "error"
    assert "Invalid field path format" in data["error"]


def test_field_extraction_requires_schema(
    client: TestClient, mocker: Any, auth_headers: Dict[str, str]
) -> None:
    """Test that field extraction requires a schema to be provided."""
    mock_llm = mocker.patch("src.api.main.process_with_llm")
    mock_llm.return_value = "Some response"

    response = client.post(
        "/api/v1/prompt",
        json={
            "prompt": "Test prompt",
            "extract_field_path": "some.field",  # Providing path without schema
        },
        headers=auth_headers,
    )
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "error"
    assert "Field extraction requires a schema" in data["error"]
