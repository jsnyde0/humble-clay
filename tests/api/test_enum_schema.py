"""Tests for enum schema handling in the API."""

import pytest
from fastapi.testclient import TestClient

from src.api.main import app
from src.api.models import MultiplePromptsRequest, PromptRequest

client = TestClient(app)


class TestEnumSchema:
    """Tests for enum schema handling in the API."""

    def setup_method(self):
        """Set up test method."""
        # Mock auth for all tests in this class
        app.dependency_overrides = {}

    @pytest.mark.parametrize(
        "test_id,prompt,enum_values,extract_path,expected_value",
        [
            (
                "simple_value",
                "The project status is active",
                ["active", "pending", "completed"],
                "status",
                "active",  # This should pass with proper enum handling
            ),
            (
                "clear_match",
                "We're waiting for client approval. The status is pending.",
                ["active", "pending", "completed"],
                "status",
                "pending",  # This should pass with proper enum handling
            ),
            (
                "inference_required",
                "The task has been completed as of yesterday.",
                ["active", "pending", "completed"],
                "status",
                "completed",  # This requires the LLM to infer the status
            ),
            (
                "similar_but_different",
                "This project is in progress, but nearly done.",
                ["active", "pending", "completed"],
                "status",
                "pending",  # "in progress, but nearly done" maps to "pending"
            ),
            (
                "on_hold_case",
                "Work is on hold until further notice.",
                ["active", "pending", "completed"],
                "status",
                "pending",  # "on hold" should map to "pending"
            ),
        ],
    )
    def test_enum_schema_single_prompt(
        self, monkeypatch, test_id, prompt, enum_values, extract_path, expected_value
    ):
        """Test that enum constraints are properly enforced in schema."""

        # Mock the process_with_llm function to avoid actual API calls
        # This mock will be configured differently for each test case to
        # demonstrate the issue
        async def mock_process_with_llm(prompt_text, response_model=None, model=None):
            """Mock version of process_with_llm that returns test data."""
            # If response_model is provided, return an instance of it
            if response_model:
                # Check if we're testing enums by looking at the schema properties
                # This would normally work if enum constraints were properly
                # passed to the model
                if (
                    hasattr(response_model, "__annotations__")
                    and extract_path in response_model.__annotations__
                ):
                    # Create an instance with the expected field set
                    result = {}

                    # For demonstration, return what the LLM would currently return
                    # This simulates the current behavior where enum constraints
                    # are ignored. The test will fail because these values don't
                    # match our expectations
                    if test_id == "simple_value":
                        result[extract_path] = (
                            "active and progressing well"  # Not in enum
                        )
                    elif test_id == "clear_match":
                        result[extract_path] = "pending"  # This one matches enum
                    elif test_id == "inference_required":
                        result[extract_path] = (
                            "The task has been completed as of yesterday"
                        )
                    elif test_id == "similar_but_different":
                        result[extract_path] = (
                            "in progress, but nearly done"  # Not in enum
                        )
                    elif test_id == "on_hold_case":
                        result[extract_path] = (
                            "Work is on hold until further notice"  # Not in enum
                        )

                    return response_model(**result)
                return response_model()

            # For simple string responses
            return "Mock response"

        # Apply the mock
        import src.api.llm

        monkeypatch.setattr(src.api.llm, "process_with_llm", mock_process_with_llm)

        # Override auth for this test
        app.dependency_overrides = {src.api.main.verify_api_key: lambda: "test_api_key"}

        # Create a schema with enum constraints
        schema = {
            "type": "object",
            "properties": {
                extract_path: {
                    "type": "string",
                    "enum": enum_values,
                    "description": f"Must be one of: {', '.join(enum_values)}",
                }
            },
            "required": [extract_path],
        }

        # Prepare the request
        request = PromptRequest(
            prompt=prompt,
            response_format={
                "type": "json_schema",
                "json_schema": {"name": "DynamicSchema", "schema": schema},
            },
            extract_field_path=extract_path,
        )

        # Make the request
        response = client.post("/api/v1/prompt", json=request.model_dump())

        # Verify the response
        assert response.status_code == 200
        assert response.json()["status"] == "success"
        assert response.json()["response"] == expected_value

    def test_enum_schema_batch(self, monkeypatch):
        """Test that enum constraints are properly enforced in batch requests."""

        # Mock the process_with_llm function to avoid actual API calls
        async def mock_process_with_llm(prompt_text, response_model=None, model=None):
            """Mock version of process_with_llm that returns test data."""
            # If response_model is provided, return an instance of it
            if response_model:
                # For testing purposes, this simulates what's currently happening
                if "status is active" in prompt_text:
                    return response_model(status="active and progressing well")
                elif "status is pending" in prompt_text:
                    return response_model(status="pending")
                elif "has been completed" in prompt_text:
                    return response_model(
                        status="The task has been completed as of yesterday"
                    )
                else:
                    return response_model(status="unknown")

            # For simple string responses
            return "Mock response"

        # Apply the mock
        import src.api.llm

        monkeypatch.setattr(src.api.llm, "process_with_llm", mock_process_with_llm)

        # Override auth for this test
        app.dependency_overrides = {src.api.main.verify_api_key: lambda: "test_api_key"}

        # Create a schema with enum constraints
        schema = {
            "type": "object",
            "properties": {
                "status": {
                    "type": "string",
                    "enum": ["active", "pending", "completed"],
                    "description": "Must be one of: active, pending, completed",
                }
            },
            "required": ["status"],
        }

        # Create batch request with multiple prompts
        prompts = [
            PromptRequest(
                prompt="The project status is active and progressing well",
                response_format={
                    "type": "json_schema",
                    "json_schema": {"name": "DynamicSchema", "schema": schema},
                },
                extract_field_path="status",
            ),
            PromptRequest(
                prompt="We're waiting for client approval. The status is pending",
                response_format={
                    "type": "json_schema",
                    "json_schema": {"name": "DynamicSchema", "schema": schema},
                },
                extract_field_path="status",
            ),
            PromptRequest(
                prompt="The task has been completed as of yesterday",
                response_format={
                    "type": "json_schema",
                    "json_schema": {"name": "DynamicSchema", "schema": schema},
                },
                extract_field_path="status",
            ),
        ]

        request = MultiplePromptsRequest(prompts=prompts)

        # Make the request
        response = client.post("/api/v1/prompts", json=request.model_dump())

        # Verify the response
        assert response.status_code == 200

        # Expected values if enum constraints were enforced
        expected_values = ["active", "pending", "completed"]

        # Currently, the test will fail because enum constraints aren't properly
        # enforced
        for i, expected in enumerate(expected_values):
            assert response.json()["responses"][i]["response"] == expected
