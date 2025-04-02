# Simple Output Field Specification

## Description
This specification defines a simplified syntax for output field definition in the Humble Clay UI. Instead of requiring users to write complex JSON schemas for simple field extraction cases, this feature will allow users to define output fields using a simple `field_name: type` syntax with support for basic enumerated values.

## Requirements

- [ ] **R1**: Implement a simplified syntax parser that converts intuitive syntax to proper JSON schema
  - [ ] **R1.1**: Support basic data types: `str`, `int`, `float`, `bool`
  - [ ] **R1.2**: Make `str` type optional (default when no type specified)
  - [ ] **R1.3**: Implement basic whitespace handling (trimming start/end)
  - [ ] **R1.4**: Implement basic validation with generic error messages
  - [ ] **R1.5**: Support simple enumerated values using list syntax: `field: [value1, value2, value3]` (no quotes)
  - [ ] **R1.6**: Limit to parsing a single field definition per input

- [ ] **R2**: Update the UI to support the simplified syntax
  - [ ] **R2.1**: Add a single-line text input field for simple syntax above the advanced options section
  - [ ] **R2.2**: Keep the existing collapsible advanced options with JSON schema textarea
  - [ ] **R2.3**: Pre-fill the simple input field with a basic example
  - [ ] **R2.4**: Add simple help text explaining the syntax options
  - [ ] **R2.5**: Use standard HTML controls with minimal styling changes

- [ ] **R3**: Integrate the parser with the existing API client
  - [ ] **R3.1**: Use simple template-based approach for JSON schema generation
  - [ ] **R3.2**: Auto-set the extract_field_path to match the field name
  - [ ] **R3.3**: Maintain compatibility with the existing backend API
  - [ ] **R3.4**: Handle basic enum values (without quotes or special characters)

- [ ] **R4**: Update documentation
  - [ ] **R4.1**: Add basic documentation for the simplified syntax to the UI
  - [ ] **R4.2**: Update README.md with brief information about the new syntax

## Acceptance Criteria

1. Users can define a field using simple syntax without specifying type for strings (e.g., `field_name`)
2. Users can define a field with basic enumerated values (e.g., `status: [active, inactive, pending]`)
3. The UI shows both simple input (single line) and advanced options (JSON textarea)
4. The extract_field_path is automatically set to match the field name when using simple syntax
5. All existing functionality continues to work (backward compatibility)
6. Basic error handling for invalid syntax

## Notes

This feature is a UX improvement that doesn't require backend changes. The parser runs client-side and converts the simple syntax to the JSON schema format that the API already understands.

### Syntax Features

- **Default String Type**: Omit type for string fields
  ```
  company_name  # Defaults to string type
  ```

- **Basic Types**: Specify type after colon
  ```
  age: int
  ```
  ```
  price: float
  ```
  ```
  is_active: bool
  ```

- **Enumerated Values**: Use brackets with comma-separated values (without quotes)
  ```
  status: [active, pending, completed]
  ```

### UI Layout (Simplified)

```
Output Field: [status: [active, pending]]
(Example formats: field_name, age: int, status: [active, pending])

▼ Advanced Options
  Output JSON Schema: [textarea with JSON schema]
  Extract Field Path: [status]
```

### Schema Generation Templates

To simplify implementation, schema generation will use simple templates:

1. **String Template**:
```json
{
  "type": "object",
  "properties": {
    "{FIELD_NAME}": {
      "type": "string"
    }
  },
  "required": ["{FIELD_NAME}"]
}
```

2. **Integer Template**:
```json
{
  "type": "object",
  "properties": {
    "{FIELD_NAME}": {
      "type": "integer"
    }
  },
  "required": ["{FIELD_NAME}"]
}
```

3. **Float Template**:
```json
{
  "type": "object",
  "properties": {
    "{FIELD_NAME}": {
      "type": "number"
    }
  },
  "required": ["{FIELD_NAME}"]
}
```

4. **Boolean Template**:
```json
{
  "type": "object",
  "properties": {
    "{FIELD_NAME}": {
      "type": "boolean"
    }
  },
  "required": ["{FIELD_NAME}"]
}
```

5. **Enum Template**:
```json
{
  "type": "object",
  "properties": {
    "{FIELD_NAME}": {
      "type": "string",
      "enum": [{ENUM_VALUES}]
    }
  },
  "required": ["{FIELD_NAME}"]
}
```

## Related Specifications
- API Schema Format Specification (existing)
- Field Extraction API Specification (existing) 