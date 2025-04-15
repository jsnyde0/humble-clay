/**
 * Jest setup file for Google Apps Script tests
 * This file is loaded before tests run, setting up the global environment
 */

// --- DO NOT import Jest globals like describe, it, expect, jest, beforeEach ---
// --- They are already globally available via the Jest test environment! ---

// Mock Logger service
global.Logger = {
  log: jest.fn()
};

// Mock console methods
global.console = {
  ...console,
  error: jest.fn(),
  log: jest.fn()
};

// Mock Utilities service
global.Utilities = {
  sleep: jest.fn()
};

// Mock PropertiesService
const scriptProperties = {};
global.PropertiesService = {
  getScriptProperties: jest.fn().mockReturnValue({
    getProperty: jest.fn(key => scriptProperties[key]),
    setProperty: jest.fn((key, value) => { scriptProperties[key] = value; }),
    deleteProperty: jest.fn(key => { delete scriptProperties[key]; })
  })
};

// Mock SpreadsheetApp
const mockSheetFunctions = {
  getRange: jest.fn().mockReturnThis(), // Return `this` (the mockSheet) by default
  getValues: jest.fn().mockReturnValue([['test']]),
  setValues: jest.fn(),
  getLastRow: jest.fn().mockReturnValue(10),
  getLastColumn: jest.fn().mockReturnValue(5)
};
const mockSheet = {
  ...mockSheetFunctions,
  // Allow getRange to return an object with sheet functions for chaining/specific range mocking
  getRange: jest.fn().mockReturnValue(mockSheetFunctions)
};
global.SpreadsheetApp = {
  getActiveSheet: jest.fn().mockReturnValue(mockSheet),
  getActiveSpreadsheet: jest.fn().mockReturnValue({
    getSheetByName: jest.fn().mockReturnValue(mockSheet),
    getActiveSheet: jest.fn().mockReturnValue(mockSheet)
  }),
  getUi: jest.fn().mockReturnValue({
    createMenu: jest.fn().mockReturnValue({
      addItem: jest.fn().mockReturnThis(),
      addSeparator: jest.fn().mockReturnThis(),
      addToUi: jest.fn()
    }),
    alert: jest.fn(),
    showModalDialog: jest.fn(), // Added for showApiConfigDialog
    showSidebar: jest.fn(),    // Added for showSidebarUI
    ButtonSet: {
      OK: 'OK',
      OK_CANCEL: 'OK_CANCEL' // Added for showApiConfigDialog
    }
  })
};

// Mock HtmlService
const mockHtmlOutput = {
  setTitle: jest.fn().mockReturnThis(),
  setWidth: jest.fn().mockReturnThis(),
  setHeight: jest.fn().mockReturnThis(),
  getContent: jest.fn().mockReturnValue('<p>Mock HTML</p>') // Added for showApiConfigDialog
};
const mockTemplate = {
  evaluate: jest.fn().mockReturnValue(mockHtmlOutput),
  // Add properties that UI.js might set on the template
  simpleOutputFieldInit: '',
  promptEditorInit: ''
};
global.HtmlService = {
  createHtmlOutputFromFile: jest.fn().mockReturnValue(mockHtmlOutput),
  createTemplateFromFile: jest.fn().mockReturnValue(mockTemplate),
  createHtmlOutput: jest.fn().mockReturnValue(mockHtmlOutput)
};

// Mock UrlFetchApp
global.UrlFetchApp = {
  fetch: jest.fn().mockReturnValue({
    getResponseCode: jest.fn().mockReturnValue(200),
    getContentText: jest.fn().mockReturnValue(JSON.stringify({
      // Default to batch response format
      responses: [
        { response: "Default mock response", status: "success" }
      ]
    }))
  })
};

// Mock XmlService
const mockXmlElement = {
  // Mock common element methods needed by the sitemap parser
  getChildren: jest.fn().mockReturnValue([]), // Default to no children
  getChild: jest.fn().mockReturnValue(null),   // Default to no child
  getText: jest.fn().mockReturnValue(''),         // Default to empty text
  getName: jest.fn().mockReturnValue('mockElement')
};
const mockXmlDocument = {
  getRootElement: jest.fn().mockReturnValue(mockXmlElement)
};
const mockXmlNamespace = {
  // Mock namespace object (usually just used as an identifier)
};
global.XmlService = {
  parse: jest.fn().mockReturnValue(mockXmlDocument), // Default to returning a mock doc
  getNamespace: jest.fn().mockReturnValue(mockXmlNamespace)
};

// --- Load functions from source files using conditional exports ---
const RangeUtils = require('../src/RangeUtils');
const UI = require('../src/UI');
const Config = require('../src/Config');
const ApiClient = require('../src/ApiClient');
const SimpleOutputField = require('../src/SimpleOutputField');
const Code = require('../src/Code');
const WebFetcher = require('../src/WebFetcher');

// --- Make source functions global (wrapped with jest.fn and default implementation) ---

// RangeUtils
global.validateRange = jest.fn().mockImplementation(RangeUtils.validateRange);
global.validateOutputColumn = jest.fn().mockImplementation(RangeUtils.validateOutputColumn);
global.mapInputRangeToOutput = jest.fn().mockImplementation(RangeUtils.mapInputRangeToOutput);
global.columnToIndex = jest.fn().mockImplementation(RangeUtils.columnToIndex); // Moved from Code.js as it's utility

// UI
global.showSidebarUI = jest.fn().mockImplementation(UI.showSidebarUI);
global.createMenu = jest.fn().mockImplementation(UI.createMenu);
global.showError = jest.fn().mockImplementation(UI.showError);
global.showMessage = jest.fn().mockImplementation(UI.showMessage);
global.showApiConfigDialog = jest.fn().mockImplementation(UI.showApiConfigDialog);

// Config
global.getApiKey = jest.fn(Config.getApiKey);
global.setApiKey = jest.fn(Config.setApiKey);
global.getApiBaseUrl = jest.fn(Config.getApiBaseUrl);
global.setApiBaseUrl = jest.fn(Config.setApiBaseUrl);
global.showConfigDialog = jest.fn(Config.showConfigDialog);
global.saveConfiguration = jest.fn(Config.saveConfiguration);
global.isConfigured = jest.fn(Config.isConfigured);
global.validateConfig = jest.fn(Config.validateConfig);
global.validateApiKey = jest.fn(Config.validateApiKey);
global.validateJinaApiKey = jest.fn(Config.validateJinaApiKey);
global.getJinaApiKey = jest.fn(Config.getJinaApiKey);
global.setJinaApiKey = jest.fn(Config.setJinaApiKey);

// ApiClient
global.processRangeWithApi = jest.fn().mockImplementation(ApiClient.processRangeWithApi);
global.makeApiRequest = jest.fn().mockImplementation(ApiClient.makeApiRequest);
global.formatRequestPayload = jest.fn().mockImplementation(ApiClient.formatRequestPayload);
global.handleApiResponse = jest.fn().mockImplementation(ApiClient.handleApiResponse);
global.processBatch = jest.fn().mockImplementation(ApiClient.processBatch);
// Note: processPrompt and processPromptBatch seem to have been removed from ApiClient source, so not mocked here.
// If they were added back, they'd need conditional exports and mocking here.

// SimpleOutputField
global.parseSimpleSyntax = jest.fn().mockImplementation(SimpleOutputField.parseSimpleSyntax);
global.generateSchemaFromSyntax = jest.fn().mockImplementation(SimpleOutputField.generateSchemaFromSyntax);
global.extractFieldPathFromSyntax = jest.fn().mockImplementation(SimpleOutputField.extractFieldPathFromSyntax);

// Code
global.onOpen = jest.fn().mockImplementation(Code.onOpen);
global.showSidebar = jest.fn().mockImplementation(Code.showSidebar);
// global.showConfigDialog is defined in UI.js now
// global.validateApiConfig is defined in Config.js now
global.processRange = jest.fn().mockImplementation(Code.processRange);
global.processPrompt = jest.fn().mockImplementation(Code.processPrompt);
global.extractColumnReferences = jest.fn(template => {
  const matches = template.match(/\{[A-Z]+\}/g) || [];
  return [...new Set(matches.map(match => match.slice(1, -1)))];
});
// global.columnToIndex is now in RangeUtils

// WebFetcher
global.fetchWebPageContent = jest.fn().mockImplementation(WebFetcher.fetchWebPageContent);
global.fetchWebPageAsMarkdown = jest.fn().mockImplementation(WebFetcher.fetchWebPageAsMarkdown);
global.convertHtmlToBasicMarkdown = jest.fn().mockImplementation(WebFetcher.convertHtmlToBasicMarkdown);
global.fetchWebPageAsMarkdownJina = jest.fn().mockImplementation(WebFetcher.fetchWebPageAsMarkdownJina);
global.fetchAndParseSitemapUrls = jest.fn().mockImplementation(WebFetcher.fetchAndParseSitemapUrls);

// Mock the global processPrompt function with a direct implementation
global.processPrompt = jest.fn((outputColumn, promptTemplate, startRow = null, endRow = null, schema = null, fieldPath = '') => {
  try {
    // Validate inputs
    validateOutputColumn(outputColumn);
    if (!promptTemplate || typeof promptTemplate !== 'string') {
      throw new Error('Prompt template is required and must be a string');
    }

    // Get the active sheet
    const sheet = SpreadsheetApp.getActiveSheet();
    if (!sheet) {
      throw new Error('No active sheet found');
    }

    // Get the last row with data
    const lastRow = sheet.getLastRow();
    if (lastRow < 1) {
      throw new Error('Sheet is empty');
    }

    // Determine row range
    const effectiveStartRow = startRow || 1;
    const effectiveEndRow = endRow || lastRow;

    // Validate row range
    if (effectiveStartRow > effectiveEndRow) {
      throw new Error('Start row cannot be greater than end row');
    }
    if (effectiveStartRow < 1) {
      throw new Error('Start row must be at least 1');
    }
    if (effectiveEndRow > lastRow) {
      throw new Error(`End row cannot exceed last data row (${lastRow})`);
    }

    // Extract column references from prompt template
    const columnRefs = extractColumnReferences(promptTemplate);
    if (columnRefs.length === 0) {
      throw new Error('No column references found in prompt template');
    }

    // Get data for all referenced columns
    const columnData = {};
    for (const col of columnRefs) {
      const range = sheet.getRange(`${col}${effectiveStartRow}:${col}${effectiveEndRow}`);
      columnData[col] = range.getValues().map(row => row[0]);
    }

    // Convert output column to index
    const outputColIndex = columnToIndex(outputColumn);

    // Process each row
    const results = [];
    for (let i = 0; i < columnData[columnRefs[0]].length; i++) {
      // Replace column references with actual values
      let prompt = promptTemplate;
      for (const col of columnRefs) {
        const value = columnData[col][i];
        prompt = prompt.replace(new RegExp(`\\{${col}\\}`, 'g'), value || '');
      }

      try {
        // Call the API with the constructed prompt
        const options = {};
        if (schema) options.responseFormat = schema;
        if (fieldPath) options.extractFieldPath = fieldPath;
        
        const result = makeApiRequest(prompt, options);
        results.push([result.response]);
      } catch (err) {
        // Handle errors by putting error message in the output cell
        results.push([`Error: ${err.message}`]);
      }
    }

    // Write results to output column
    const outputRange = sheet.getRange(effectiveStartRow, outputColIndex, results.length, 1);
    outputRange.setValues(results);

    return {
      success: true,
      message: `Processed ${results.length} rows successfully`
    };
  } catch (error) {
    console.error('Error processing prompt:', error);
    return {
      success: false,
      message: error.message || 'An unknown error occurred'
    };
  }
});

// --- Helper to reset mocks (using globally available jest object) ---
global.resetAllMocks = () => {
  jest.clearAllMocks();

  // Reset script properties cache
  Object.keys(scriptProperties).forEach(key => { delete scriptProperties[key]; });

  // Reset specific mock implementations back to their default states
  global.UrlFetchApp.fetch.mockImplementation(jest.fn().mockReturnValue({
    getResponseCode: jest.fn().mockReturnValue(200),
    getContentText: jest.fn().mockReturnValue(JSON.stringify({
      responses: [
        { response: "Default mock response", status: "success" }
      ]
    }))
  }));
  
  // Reset XmlService mocks back to their defaults
  const defaultMockXmlElement = {
    getChildren: jest.fn().mockReturnValue([]),
    getChild: jest.fn().mockReturnValue(null),
    getText: jest.fn().mockReturnValue(''),
    getName: jest.fn().mockReturnValue('mockElement')
  };
  const defaultMockXmlDocument = {
    getRootElement: jest.fn().mockReturnValue(defaultMockXmlElement)
  };
  global.XmlService.parse.mockImplementation(jest.fn().mockReturnValue(defaultMockXmlDocument));
  // Ensure the element methods are also reset if they might be individually mocked
  defaultMockXmlElement.getChildren.mockClear();
  defaultMockXmlElement.getChild.mockClear();
  defaultMockXmlElement.getText.mockClear();
  defaultMockXmlDocument.getRootElement.mockClear();

  // Re-apply default mock implementations IF NEEDED (jest.clearAllMocks might suffice)
  // Often, just clearing calls/instances is enough, and re-applying defaults
  // can sometimes hide issues if a test accidentally overwrites a global mock.
  // However, if tests heavily rely on modifying global mocks, explicitly resetting
  // the implementation might be safer.
  // Example (Apply selectively if needed):
  // global.validateRange.mockImplementation(RangeUtils.validateRange);
  // global.getApiKey.mockImplementation(Config.getApiKey);
  // etc.
};

// --- Register Reset Hook (using globally available beforeEach) ---
// --- REMOVED: This was incorrect. beforeEach should be used in test files only ---
// // This runs before each test case in every test file
// beforeEach(() => {
//   resetAllMocks();
// }); 

// --- Make source functions global (wrapped with jest.fn) ---
// This mimics GAS's global scope for functions, making them available in tests.
global.validateRange = jest.fn(RangeUtils.validateRange);
global.validateOutputColumn = jest.fn(RangeUtils.validateOutputColumn);
global.makeApiRequest = jest.fn(ApiClient.makeApiRequest); // Example
global.fetchWebPageContent = jest.fn(WebFetcher.fetchWebPageContent);
global.convertHtmlToBasicMarkdown = jest.fn(WebFetcher.convertHtmlToBasicMarkdown);
global.fetchWebPageAsMarkdown = jest.fn(WebFetcher.fetchWebPageAsMarkdown);
global.fetchWebPageAsMarkdownJina = jest.fn(WebFetcher.fetchWebPageAsMarkdownJina); // Added line
// ... assign other required functions from required modules to global scope

// ... rest of setup.js ... 