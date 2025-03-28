"""Tests for health and root endpoints."""

from typing import Dict

import pytest
from fastapi.testclient import TestClient

from src.api.main import app


@pytest.fixture
def client() -> TestClient:
    """Create a test client for the API."""
    return TestClient(app)


def test_health_check_returns_status(
    client: TestClient, auth_headers: Dict[str, str]
) -> None:
    """Test that health check endpoint returns correct status and version."""
    response = client.get("/health", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "healthy"
    assert data["version"] == "0.1.0"


def test_root_returns_api_info(
    client: TestClient, auth_headers: Dict[str, str]
) -> None:
    """Test that root endpoint returns correct API information."""
    response = client.get("/", headers=auth_headers)
    assert response.status_code == 200
    data = response.json()
    assert data["name"] == "Humble Clay"
    assert data["version"] == "0.1.0"
