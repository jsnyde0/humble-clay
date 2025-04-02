"""Utilities for extracting fields from structured data."""

from typing import Any, Union


def extract_field(
    data: Any, field_path: str
) -> Union[str, int, float, bool, dict, list, None]:
    """Extract a field from structured data using a dot-notation path.

    Args:
        data: The structured data to extract from (typically a dict)
        field_path: A dot-notation path to the field (e.g., "user.address.city")

    Returns:
        The extracted field value, which could be any JSON-compatible type

    Raises:
        ValueError: If the field path is invalid or not found in the data
    """
    if not isinstance(data, (dict, list)) and field_path:
        raise ValueError(
            f"Cannot extract fields from non-structured data type: {type(data)}"
        )

    # Validate field path format
    if not field_path or not all(part for part in field_path.split(".")):
        raise ValueError("Invalid field path format")

    # Handle top-level field
    if "." not in field_path:
        if isinstance(data, dict) and field_path in data:
            return data[field_path]
        else:
            raise ValueError(f"Field not found: {field_path}")

    # Handle nested fields
    parts = field_path.split(".")
    current = data

    for i, part in enumerate(parts):
        if isinstance(current, dict) and part in current:
            current = current[part]
        else:
            full_path = ".".join(parts[: i + 1])
            raise ValueError(f"Field not found: {full_path}")

    return current


def validate_field_extraction_request(
    data: Any, field_path: str, has_schema: bool
) -> None:
    """Validate a field extraction request.

    Args:
        data: The data to extract from
        field_path: The field path to extract
        has_schema: Whether a schema was provided

    Raises:
        ValueError: If the request is invalid
    """
    if not has_schema:
        raise ValueError("Field extraction requires a schema")

    if not isinstance(data, (dict, list)):
        raise ValueError(
            f"Cannot extract fields from non-structured data: {type(data).__name__}"
        )
