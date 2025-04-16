# Humble Clay Google Sheets Add-on

Google Apps Script integration for the Humble Clay API.

## Features

### Range Processing
- Process data from one column to another
- Input validation for ranges and column formats
- Error handling and user feedback
- Simple echo transformation (Stage 1)

### Custom Spreadsheet Functions
- `=HUMBLECLAY_PROMPT(arg1, [arg2], ...)`: Concatenates all arguments into a single string and sends it as a prompt to the configured Humble Clay API endpoint. Returns the API response text.
- `=SEARCH_SERPER(query, [search_type])`: Performs a search using the Serper.dev API. 
    - `query`: The search query string (or URL if `search_type` is 'webpage').
    - `search_type` (Optional): Specifies the API endpoint ('search', 'news', 'images', 'maps', 'scholar', 'webpage'). Defaults to 'search'.
    - Returns the raw JSON response from Serper.
- `=fetchWebPageContent(url)`: Fetches the raw HTML content of a web page.
- `=fetchWebPageAsMarkdown(url)`: Fetches a web page and attempts a basic conversion to Markdown.
- `=fetchWebPageAsMarkdownJina(url)`: Fetches and converts a web page to Markdown using the Jina Reader API (requires Jina API Key in config).
- `=fetchAndParseSitemapUrls(baseUrl)`: Fetches `/sitemap.xml` for the given base URL and returns a newline-separated list of URLs found.
- `=ADDONE(value)`: Simple test function that adds 1 to the input value.

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

### Configuration (Required for API Functions)
1. Open the Add-on menu ("Humble Clay") and select "Configure API".
2. Enter your **Humble Clay API Key** and the **API URL** for your Humble Clay deployment.
3. (Optional) Enter your **Jina Reader API Key** to enable the improved `=fetchWebPageAsMarkdownJina` function.
4. (Optional) Enter your **Serper API Key** to enable the `=SEARCH_SERPER` function.
5. Click "Save Configuration".

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
- Push to Apps Script: `npx clasp push`
- Create new version: `clasp version [description]`
- Deploy: `npx clasp deploy`

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

## Development Guidelines

### Apps Script Environment Constraints

Google Apps Script has a different runtime environment than traditional Node.js. Key differences:

1. **No Module System:** Apps Script doesn't support ES modules or CommonJS
2. **Global Scope:** All functions are globally available without imports
3. **Google Services:** Services like `SpreadsheetApp` are globally available

### Testing Strategy

Our code is designed to work in both environments:

1. **Conditional Exports:** We use this pattern in all files:
   ```javascript
   // Only export for tests
   if (typeof module !== 'undefined' && module.exports) {
     module.exports = {
       // functions to export
     };
   }
   ```

2. **Service Mocking:** In tests, we mock Google services in `tests/setup.js`

3. **No Import/Export:** We avoid ES6 `import`/`export` statements

## Project Structure

- `src/` - Apps Script source files
  - `Code.js` - Main entry point
  - `UI.js` - UI-related functions
  - `ApiClient.js` - API communication
  - `Config.js` - Configuration handling
  - `Sidebar.html` - HTML for the sidebar UI
- `tests/` - Test files
  - `setup.js` - Jest setup and Google services mocks
  - `*.test.js` - Test files for corresponding source files

## Working with Tests

### Running Tests

```bash
npm test
```

### Testing Specific Files

```bash
npm test -- tests/ApiClient.test.js
```

### Debugging Tests

```bash
npm test -- --verbose
```

## Deployment

Deploy to Google Apps Script using Clasp:

```bash
npm run clasp:push
```

## Common Issues

### Tests Pass but Deployment Fails

If tests pass but the deployed script fails:

1. Check if your code is using ES6 features not supported in Apps Script
2. Ensure conditional exports are properly implemented 
3. Verify that functions used in HTML are globally available
4. Check if you're using Google services directly in the Apps Script code 