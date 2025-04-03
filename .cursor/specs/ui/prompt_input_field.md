# Prompt Input Field

## Overview
The Prompt Input Field feature allows users to create complex prompts with column references without using CONCATENATE formulas. This feature provides a more intuitive interface for constructing and managing AI prompts within the Humble Clay app.

## Requirements

### Core Functionality
1. **Basic Prompt Editor**
   - [x] Multi-line text editor with monospace font and resizable height
   - [x] Simple text-based syntax for column references (e.g., {A}, {B})
   - [x] Placeholder text showing proper syntax examples

2. **Column Reference System**
   - [x] Support for manual entry of column references (e.g., {A}, {B})
   - [x] Visible documentation of reference syntax
   - [x] Backend processing to replace references with actual values

3. **Row Range Selection**
   - [x] Input fields for start and end rows
   - [x] Option to process all rows or a specific range

4. **Configuration Management**
   - [x] Field to name/label the current configuration
   - [x] Save button to store the current configuration
   - [x] Dropdown to select and load saved configurations
   - [x] Delete option for removing saved configurations

5. **Backend Processing**
   - [x] Logic to replace column references with cell values for each row
   - [x] Support for batch processing multiple rows
   - [x] Integration with existing API request functionality

6. **UI Elements**
   - [x] Target output column selector
   - [x] Configuration name input field
   - [x] Status indicators for processing
   - [x] Clear error messages for any issues

## User Experience

### Interface Integration
- The Prompt Input Field will be directly integrated into the main Humble Clay sidebar
- All components will follow existing UI patterns for consistency
- The feature will not require navigating to separate tabs or dialogs

### Workflow
1. User selects a target output column
2. User constructs a prompt in the editor, using {ColumnLetter} syntax for references
3. User specifies which rows to process
4. User names and saves the configuration if desired
5. User clicks Apply to process the range
6. Results appear in the target output column

## Technical Specifications

### Column Reference Format
- Column references will use curly braces: {A}, {B}, {C}, etc.
- References are case-insensitive: {a} is equivalent to {A}
- Only single-column references are supported in the MVP
- References will be replaced with the actual cell value from the specified column

### Storage
- Configurations will be stored in the user's script properties
- Each configuration will include:
  - Name (string)
  - Target column (string)
  - Prompt template (string)
  - Last modified timestamp (number)

### API Integration
- The system will construct an array of prompts, one for each row being processed
- Each prompt will have column references replaced with actual values
- The array will be sent to the FastAPI endpoint in the existing format

## Limitations
- Visual highlighting of column references within the editor is not included in the MVP
- Interactive column selection (Google Sheets-like) is deferred to future versions
- Advanced text editor features (syntax highlighting, auto-complete) are out of scope

## Future Enhancements
- Visual highlighting of column references
- Interactive column selection while editing the prompt
- Rule-like interface for managing all configurations
- Advanced preview capability
- Support for more complex reference patterns

## Acceptance Criteria
- Users can create multi-line prompts with column references
- Users can specify target output column and row range
- Users can save, load, and delete configurations
- Column references are correctly replaced with actual values during processing
- Results appear in the specified output column
- The interface is intuitive and consistent with the rest of Humble Clay

## Implementation Stages

### Stage 1: Core UI
- Add prompt editor textarea to the main interface
- Implement target output column selector
- Add row range selection inputs

### Stage 2: Configuration Management
- Add configuration name field
- Implement save functionality
- Create dropdown for saved configurations
- Add delete capability

### Stage 3: Backend Processing
- Develop reference replacement logic
- Integrate with existing API request functionality
- Add error handling for reference processing

### Stage 4: Testing & Refinement
- Test with various column references and row ranges
- Optimize performance for larger datasets
- Refine UI based on initial feedback 