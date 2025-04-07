"""Response handlers for LLM outputs."""

import logging
from typing import Any, Dict, Optional, Union

from ..field_extraction import extract_field, validate_field_extraction_request
from ..models import PromptResponse

# Configure logging
logger = logging.getLogger(__name__)


def format_response_data(response_data: Any) -> Union[Dict[str, Any], Any]:
    """
    Format the LLM response data into a consistent structure based on its type.

    Args:
        response_data: The raw response from the LLM

    Returns:
        Formatted response - either a dict or the original response
    """
    # Handle different response types (dict, Pydantic model, or string)
    if hasattr(response_data, "model_dump"):
        # It's a Pydantic model
        return response_data.model_dump()
    elif isinstance(response_data, dict):
        # It's already a dict
        return response_data
    else:
        # It's a string or other type - keep as is
        return response_data


def extract_requested_field(
    response_dict: Dict[str, Any], extract_field_path: Optional[str], has_schema: bool
) -> Union[Dict[str, Any], Any]:
    """
    Extract a specific field from the response if requested.

    Args:
        response_dict: The response dictionary
        extract_field_path: Path to the field to extract
        has_schema: Whether a schema was provided

    Returns:
        Extracted field value or original response
    """
    if not extract_field_path:
        return response_dict

    # Validate the extraction request
    validate_field_extraction_request(response_dict, extract_field_path, has_schema)

    # Extract the requested field
    return extract_field(response_dict, extract_field_path)


def prepare_prompt_response(
    response_data: Any,
    extract_field_path: Optional[str] = None,
    has_schema: bool = False,
) -> PromptResponse:
    """
    Prepare a PromptResponse from LLM output.

    Args:
        response_data: Raw response from LLM
        extract_field_path: Path to field to extract (optional)
        has_schema: Whether a schema was provided

    Returns:
        PromptResponse with properly formatted data
    """
    # Format the response based on its type
    formatted_response = format_response_data(response_data)

    # Handle string responses directly if no field extraction
    if not isinstance(formatted_response, dict) and not extract_field_path:
        return PromptResponse(response=formatted_response)

    # If it's not a dict but field extraction is requested, wrap it
    if not isinstance(formatted_response, dict) and extract_field_path:
        formatted_response = {"result": formatted_response}

    # Extract specific field if requested
    if extract_field_path:
        try:
            extracted_value = extract_requested_field(
                formatted_response, extract_field_path, has_schema
            )
            return PromptResponse(response=extracted_value)
        except ValueError as e:
            # Handle field extraction errors
            logger.error(f"Field extraction error: {str(e)}")
            return PromptResponse(status="error", error=str(e))

    # Return the full response if no extraction requested
    return PromptResponse(response=formatted_response)
