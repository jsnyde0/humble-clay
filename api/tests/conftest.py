"""Shared fixtures for API tests."""

import os
from typing import AsyncGenerator, Dict, Generator

import httpx
import instructor
import pytest
from asgi_lifespan import LifespanManager
from openai import AsyncOpenAI

from api.main import app

print(f"Conftest: Imported 'app', type is: {type(app)}")


@pytest.fixture(scope="function")
async def client() -> AsyncGenerator[httpx.AsyncClient, None]:
    print("Conftest (fixture): STARTING client fixture")
    try:
        print(
            "Conftest (fixture): Entering LifespanManager context (without 'as manager')..."
        )
        # Enter the context manager to run startup events on 'app'
        async with LifespanManager(app):
            print(
                "Conftest (fixture): LifespanManager context ENTERED. Startup should have run on 'app'."
            )

            # Use the original 'app' instance, which should now have its state modified by lifespan startup
            transport = httpx.ASGITransport(app=app)
            print("Conftest (fixture): ASGITransport created using original 'app'.")

            async with httpx.AsyncClient(
                transport=transport, base_url="http://testserver"
            ) as ac:
                print(
                    "Conftest (fixture): httpx.AsyncClient context ENTERED. Yielding client."
                )
                yield ac
                print("Conftest (fixture): httpx.AsyncClient context EXITED.")
        print(
            "Conftest (fixture): LifespanManager context EXITED. Shutdown should have run on 'app'."
        )
    except Exception as e:
        print(
            f"Conftest (fixture): EXCEPTION during client fixture setup/teardown: {e}"
        )
        raise  # Re-raise the exception to fail the test clearly
    print("Conftest (fixture): FINISHED client fixture")


@pytest.fixture(autouse=True)
def setup_test_environment() -> Generator[None, None, None]:
    """Set up the test environment for API key validation."""
    # Save original environment variable values
    original_humble_clay_api_key = os.environ.get("HUMBLE_CLAY_API_KEY")
    original_openrouter_api_key = os.environ.get("OPENROUTER_API_KEY")

    # Set test API keys for all tests
    # HUMBLE_CLAY_API_KEY is used for endpoint authentication
    os.environ["HUMBLE_CLAY_API_KEY"] = "test_api_key"
    # OPENROUTER_API_KEY is used by the lifespan function to initialize the LLM client
    # For @pytest.mark.llm tests, this should be a real key.
    # For other tests, it can be a dummy key if the client init is mocked or expected to fail gracefully.
    # Ensure a value is set to avoid the "not found" warning path in lifespan if not already set.
    if "OPENROUTER_API_KEY" not in os.environ:
        print(
            "Conftest: OPENROUTER_API_KEY not found in env, setting a placeholder for non-LLM tests."
        )
        os.environ["OPENROUTER_API_KEY"] = (
            "dummy_openrouter_key_for_tests"  # Placeholder
        )

    yield

    # Restore original environment
    if original_humble_clay_api_key:
        os.environ["HUMBLE_CLAY_API_KEY"] = original_humble_clay_api_key
    else:
        os.environ.pop("HUMBLE_CLAY_API_KEY", None)

    if original_openrouter_api_key:
        os.environ["OPENROUTER_API_KEY"] = original_openrouter_api_key
    else:
        os.environ.pop("OPENROUTER_API_KEY", None)


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


@pytest.fixture(scope="function")
async def llm_client():
    # ... (your existing fixture that creates and closes a client) ...
    # This fixture creates a client *just for one test* and ensures it's closed.
    # It's independent of the app's main client.
    # ... (definition as before)
    openrouter_base_url = os.getenv(
        "OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1"
    )
    openrouter_api_key = os.getenv("OPENROUTER_API_KEY")
    if not openrouter_api_key:
        pytest.skip("OPENROUTER_API_KEY not set for test client.")

    test_client_instance = instructor.patch(
        AsyncOpenAI(
            base_url=openrouter_base_url,
            api_key=openrouter_api_key,
            default_headers={"HTTP-Referer": "https://github.com/jsnyde0/humble-clay"},
            timeout=httpx.Timeout(30.0, connect=10.0),
        )
    )
    yield test_client_instance
    await test_client_instance.aclose()
