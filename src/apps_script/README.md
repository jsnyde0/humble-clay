# Humble Clay Google Sheets Add-on

Google Apps Script integration for the Humble Clay API.

## Features

### Range Processing
- Process data from one column to another
- Input validation for ranges and column formats
- Error handling and user feedback
- Simple echo transformation (Stage 1)

### User Interface
- Clean, responsive sidebar interface
- Real-time input validation
- Success/error feedback
- Easy range and column selection

## Usage

### Installation
1. Open your Google Sheet
2. Click "Extensions" > "Apps Script"
3. Copy the contents of the `src/apps_script/src/` directory into your Apps Script project
4. Save and reload your sheet

### Using the Add-on
1. Click the "Humble Clay" menu item
2. Enter an input range (e.g., "A1:A10")
3. Enter an output column letter (e.g., "C")
4. Click "Generate Output"
5. Your data will be copied to the output column

### Input Requirements
- Input range must be in A1 notation (e.g., "A1:A10")
- Output must be a single column letter (e.g., "C")
- Currently supports single-column ranges only

### Known Limitations
- Multi-column ranges are not supported
- Empty ranges process without warning
- No preview of output location

## Development Setup

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure CLASP
```bash
npm install -g @google/clasp
clasp login
```

### 3. Link to Existing Sheet
```bash
clasp clone <script-id>  # Get script ID from your Sheet's Apps Script editor URL
```

### 4. Development Workflow
- Write code in `src/` directory
- Run tests: `npm test`
- Check linting: `npm run lint`
- Fix linting issues: `npm run lint:fix`
- Push to Apps Script: `clasp push`
- Create new version: `clasp version [description]`
- Deploy: `clasp deploy`

### 5. Testing
Tests are written using Jest and located in the `tests/` directory.
Mock implementations of Google Apps Script services are provided in `tests/setup.js`.

#### Running Tests
```bash
npm test                 # Run all tests
npm test -- --watch     # Run in watch mode
npm test -- --coverage  # Generate coverage report
```

### 6. Project Structure
```
src/
├── Code.js           # Main entry point
├── RangeUtils.js     # Range processing utilities
├── UI.js            # UI components
└── Sidebar.html     # Sidebar template

tests/
├── setup.js         # Test environment setup
├── Code.test.js     # Main logic tests
├── RangeUtils.test.js
└── UI.test.js
```

### 7. Google Apps Script Limitations
- No ES modules support (all functions must be global)
- Limited ES6+ features
- No npm packages in production
- Must use Google Apps Script services
- Sidebar HTML must be self-contained

### 8. Development Guidelines
1. Write tests for all utility functions
2. Use ESLint to maintain code style
3. Keep files small and focused
4. Document public functions
5. Handle errors gracefully
6. Test both success and error cases
7. Provide clear user feedback

## Future Improvements
1. Range Validation
   - Restrict to single-column ranges
   - Add warning for empty ranges
   - Add input preview feature

2. User Interface
   - Add range preview
   - Improve error messages
   - Add loading indicators

3. Features
   - Support for multi-column processing
   - Custom transformation options
   - Batch processing 