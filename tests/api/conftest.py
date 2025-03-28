"""Common test fixtures."""

import os
from typing import Dict

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
    old_key = os.environ.get("API_KEY")
    os.environ["API_KEY"] = api_key
    yield
    if old_key:
        os.environ["API_KEY"] = old_key
    else:
        del os.environ["API_KEY"]


@pytest.fixture
def auth_headers(api_key: str) -> Dict[str, str]:
    """Provide headers with API key."""
    return {"X-API-Key": api_key, "Content-Type": "application/json"}
