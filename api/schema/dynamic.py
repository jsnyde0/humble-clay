"""Dynamic schema creation utilities."""

import logging
from typing import Any, Dict, List, Literal

from pydantic import Field, create_model

# Configure logging
logger = logging.getLogger(__name__)


def create_dynamic_model_from_schema(schema_name: str, schema_obj: Dict[str, Any]):
    """
    Create a Pydantic model from a JSON schema, properly handling constraints like
    enums.

    Args:
        schema_name: Name for the dynamic model
        schema_obj: JSON schema object defining the model

    Returns:
        A dynamically created Pydantic model class
    """
    properties = schema_obj.get("properties", {})
    model_fields = {}

    for field_name, field_schema in properties.items():
        field_type = field_schema.get("type")
        description = field_schema.get("description", "")

        # Handle different schema types
        if field_type == "string":
            # Check for enum constraint
            if "enum" in field_schema:
                # Create a Literal type with the enum values
                enum_values = field_schema["enum"]
                # Use typing.Literal for enum constraints
                field_type = Literal[tuple(enum_values)]
                model_fields[field_name] = (
                    field_type,
                    Field(..., description=description),
                )
            else:
                model_fields[field_name] = (str, Field(..., description=description))

        elif field_type == "integer":
            # Ensure integers are properly enforced
            def validate_int(cls, v):
                if isinstance(v, float):
                    # Convert float to int if it's a whole number
                    if v.is_integer():
                        return int(v)
                return v

            # Add validator for integer conversion
            model_fields[field_name] = (int, Field(..., description=description))

        elif field_type == "number":
            model_fields[field_name] = (float, Field(..., description=description))

        elif field_type == "boolean":
            model_fields[field_name] = (bool, Field(..., description=description))

        elif field_type == "array":
            # For simplicity, treat arrays as list of Any
            model_fields[field_name] = (List[Any], Field(..., description=description))

        elif field_type == "object":
            # Nested objects could be handled recursively,
            # but for simplicity we use dict
            model_fields[field_name] = (
                Dict[str, Any],
                Field(..., description=description),
            )

        else:
            # Default to Any for unknown types
            model_fields[field_name] = (Any, Field(..., description=description))

    # Create the dynamic model
    logger.info(f"Created dynamic schema: {schema_name}")
    return create_model(schema_name, **model_fields)
