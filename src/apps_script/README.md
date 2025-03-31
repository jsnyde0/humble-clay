# Humble Clay Google Sheets Add-on

Google Apps Script integration for the Humble Clay API.

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

### 3. Create a New Google Apps Script Project
```bash
clasp create --type sheets --title "Humble Clay"
```

### 4. Development Workflow
- Write code in `src/` directory
- Run tests: `npm test`
- Check linting: `npm run lint`
- Fix linting issues: `npm run lint:fix`
- Push to Apps Script: `clasp push`

### 5. Testing
Tests are written using Jest and located in the `tests/` directory.
Mock implementations of Google Apps Script services are provided in `tests/setup.js`.

### 6. Project Structure
```
src/
├── Code.js           # Main entry point
├── RangeUtils.js     # Range processing utilities
├── UI.js            # UI components
└── Sidebar.html     # Sidebar template

tests/
├── setup.js         # Test environment setup
├── RangeUtils.test.js
└── UI.test.js
```

### 7. Google Apps Script Limitations
- No ES modules support
- Limited ES6+ features
- No npm packages in production
- Must use Google Apps Script services

### 8. Development Guidelines
1. Write tests for all utility functions
2. Use ESLint to maintain code style
3. Keep files small and focused
4. Document public functions
5. Handle errors gracefully 