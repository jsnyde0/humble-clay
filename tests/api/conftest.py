"""Shared fixtures for API tests."""

import os
from typing import Dict, Generator

import pytest
from fastapi.testclient import TestClient

from src.api.main import app


@pytest.fixture
def client() -> Generator[TestClient, None, None]:
    """Provide a FastAPI test client."""
    with TestClient(app) as test_client:
        yield test_client


@pytest.fixture(autouse=True)
def setup_test_environment() -> Generator[None, None, None]:
    """Set up the test environment for API key validation."""
    # Save original environment variable values
    original_api_key = os.environ.get("HUMBLE_CLAY_API_KEY")

    # Set test API key for all tests
    os.environ["HUMBLE_CLAY_API_KEY"] = "test_api_key"

    yield

    # Restore original environment
    if original_api_key:
        os.environ["HUMBLE_CLAY_API_KEY"] = original_api_key
    else:
        os.environ.pop("HUMBLE_CLAY_API_KEY", None)


@pytest.fixture
def auth_headers() -> Dict[str, str]:
    """Provide authentication headers for API requests."""
    # Use the same test API key that was set in setup_test_environment
    return {"X-API-Key": "test_api_key"}


@pytest.fixture
def nested_schema() -> dict:
    """Provides a sample nested JSON schema for testing field extraction."""
    return {
        "name": "nested_test_schema",
        "schema": {
            "type": "object",
            "properties": {
                "user": {
                    "type": "object",
                    "properties": {
                        "name": {"type": "string"},
                        "age": {"type": "number"},
                        "address": {
                            "type": "object",
                            "properties": {
                                "city": {"type": "string"},
                                "country": {"type": "string"},
                            },
                        },
                    },
                },
                "active": {"type": "boolean"},
            },
            "required": ["user"],
        },
    }


@pytest.fixture
def sample_schema() -> dict:
    """Provides a simple JSON schema for testing."""
    return {
        "name": "test_schema",
        "schema": {
            "type": "object",
            "properties": {"output": {"type": "string"}},
            "required": ["output"],
        },
    }
