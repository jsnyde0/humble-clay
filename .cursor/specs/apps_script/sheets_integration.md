# Google Sheets Integration Specification

## Overview
Enable Google Sheets users to process cell ranges through the Humble Clay API with results automatically populated back into their spreadsheets.

## System Behavior

### 1. Add-on Interface
The system must provide:
- A persistent sidebar interface (not modal dialog)
- Integration with Google Sheets menu system
- Ability to remain active during sheet operations

### 2. Configuration Management
The system must:
- Securely store the Humble Clay API key in Script Properties
- Allow users to update API configuration through the UI
- Validate API key before operations
- Maintain configuration persistence between sessions

### 3. Range Processing Capabilities
The system must support:
- Input range selection (A1 notation)
- Output column specification
- Automatic row mapping:
  - If input is A7:A17 and output is column C
  - Output will be C7:C17
  - Maintaining exact row alignment
- Batch processing within API limits

### 4. Custom Functions
The system must provide spreadsheet functions for:
- Direct LLM generation in cells
- Structured data extraction
- Field extraction from JSON responses

## API Contracts

### 1. Range Processing Request
```json
{
    "range": {
        "input": "string",     // A1 notation
        "outputColumn": "string"  // Column letter
    },
    "options": {
        "systemPrompt": "string?",
        "outputStructure": "string?",
        "extractField": "string?"
    }
}
```

### 2. Custom Function Format
```javascript
// Basic Generation
=GENERATE_WITH_LLM(prompt, [systemPrompt], [outputStructure], [extractField])

// Structured Generation
=GENERATE_STRUCTURED_LLM(prompt, structureDefinition)

// Field Extraction
=EXTRACT_LLM_FIELD(jsonString, fieldPath)
```

## User Interface Requirements

### 1. Sidebar Components
- Input range selector
- Output column selector
- System prompt input (optional)
- Output structure definition (optional)
- Field extraction path (optional)
- Generate button
- Status/progress indicator

### 2. Menu Integration
- Add-on menu in Google Sheets
- API key configuration option
- Generate with LLM option
- Help/documentation access

## Error Scenarios

### Configuration Errors
- Missing API key
- Invalid API key
- Configuration save failures

### Processing Errors
- Invalid range specification
- Invalid output column
- API request failures
- Rate limiting errors
- JSON parsing errors
- Field extraction failures

## Success Criteria

### Functionality
- Successful API key storage and retrieval
- Accurate range processing
- Correct result placement
- Proper error handling and display
- Persistence of configuration

### User Experience
- Intuitive range selection
- Clear feedback during processing
- Helpful error messages
- Consistent with Google Sheets UI patterns

## Implementation Stages

### Stage 1: Basic UI and Range Mapping
- Implement sidebar interface
- Add input range selection
- Add output column selection
- Create simple echo transformation:
  - Read input range
  - Add prefix like "Test: " to each cell
  - Write to corresponding output cells
- Verify correct row mapping
- Add basic error handling

### Stage 2: API Integration
- Add API key configuration
- Implement API client for Humble Clay
- Replace echo transformation with actual API calls
- Handle API errors
- Show processing status

### Stage 3: Enhanced Features
- Add system prompt support
- Add structured output handling
- Add field extraction
- Implement custom functions
- Add progress tracking

### Stage 4: Advanced Features
- Optimize batch processing
- Add error recovery
- Add processing history
- Enhanced configuration options

## Example Behaviors

### Range Mapping Example
```
Input Selection: A7:A17
Output Column: C
Result: System will automatically write to C7:C17

Input:          Output:
A7  = "Hello"   C7  = "Response for Hello"
A8  = "World"   C8  = "Response for World"
...             ...
A17 = "End"     C17 = "Response for End"
```

### Stage 1 Echo Example
```
Input:          Output:
A7  = "Hello"   C7  = "Test: Hello"
A8  = "World"   C8  = "Test: World"
...             ...
A17 = "End"     C17 = "Test: End"
``` 