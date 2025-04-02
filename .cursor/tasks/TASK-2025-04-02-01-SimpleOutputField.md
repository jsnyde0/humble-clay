# TASK-2023-07-29-01: Implement Simple Output Field

**Status**: 🔄 Active  
**Start Date**: 2023-07-29  
**End Date**: -  
**Related Specifications**: [Simple Output Field](../specs/ui/simple_output_field.md)

## Description
Implement a simplified syntax for output field definition in the Humble Clay UI to improve user experience. This will allow users to define output fields using intuitive syntax like `field_name` or `age: int` instead of writing complex JSON schemas.

## Implementation Steps

### 1. Set Up Testing Environment
- [x] Create a test file for the simple syntax parser
- [x] Set up basic test cases for each syntax type (string, int, float, bool, enum)
- [x] Establish test structure for validation and error cases

### 2. Implement the Parser (R1)
- [x] Create a module for parsing the simplified syntax
- [x] Implement string field parsing (with default type when no type specified)
- [x] Implement basic type parsing (int, float, bool)
- [x] Implement simple enum value parsing
- [x] Add basic validation with generic error messages
- [x] Write tests for each parser feature

### 3. Schema Generation with Templates (R3.1)
- [x] Create the template strings for each field type
- [x] Implement template-based schema generation
- [x] Add field name extraction for auto-setting extract_field_path
- [x] Test schema generation with various inputs
- [x] Verify compatibility with existing API client

### 4. UI Updates (R2)
- [ ] Add a single-line text input field for simple syntax
- [ ] Update the collapsible advanced options section
- [ ] Add help text with examples
- [ ] Pre-fill the input with an example
- [ ] Test the UI changes manually

### 5. Integration Testing
- [ ] Create end-to-end tests with simple syntax inputs
- [ ] Verify proper JSON schema generation
- [ ] Verify automatic extract_field_path setting
- [ ] Test error cases

### 6. Documentation and Final Review
- [ ] Update UI help text
- [ ] Update README with information about the simplified syntax
- [ ] Do a final review of the implementation
- [ ] Create a pull request

## Testing Approach

### Unit Tests
1. **Parser Tests**:
   - Test parsing string field with no type
   - Test parsing fields with explicit types
   - Test parsing enum fields
   - Test validation for invalid inputs
   - Test whitespace handling

2. **Schema Generation Tests**:
   - Test schema generation for each field type
   - Test field extraction path setting
   - Test template replacement accuracy

### Integration Tests
1. Test the full flow from UI input to API client call
2. Verify the schema and field path are correctly set in the API payload

## Implementation Notes

### Parser Implementation
- Use regular expressions for basic parsing
- Start with simple string operations for template replacement
- Keep the parser limited to single field definitions
- Use basic string validation approaches

### UI Implementation
- Use standard HTML controls with minimal styling
- Keep the advanced options UI largely unchanged
- Focus on clear examples in the UI
- Ensure the simple syntax and JSON textarea remain in sync

## Acceptance Criteria
1. Users can define a field using simple syntax without specifying type for strings
2. Users can define a field with basic enumerated values
3. The UI shows both simple input and advanced options
4. The extract_field_path is automatically set to match the field name
5. Basic error handling for invalid syntax
6. All existing functionality continues to work (backward compatibility)

## Resources
- [Simple Output Field Specification](../specs/ui/simple_output_field.md)
- Existing UI code in Sidebar.html
- Existing API client in ApiClient.js 