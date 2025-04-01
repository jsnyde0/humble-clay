// Import Jest globals
const { jest, beforeEach } = require('@jest/globals');

// Mock Google Apps Script services
global.SpreadsheetApp = {
  getActiveSheet: jest.fn(),
  getUi: jest.fn(),
  getActiveSpreadsheet: jest.fn()
};

global.PropertiesService = {
  getScriptProperties: jest.fn().mockReturnValue({
    getProperty: jest.fn(),
    setProperty: jest.fn(),
  }),
};

global.HtmlService = {
  createHtmlOutput: jest.fn(),
  createTemplate: jest.fn(),
  createHtmlOutputFromFile: jest.fn()
};

// Mock sheet class
class Sheet {
  constructor() {
    this.getRange = jest.fn();
    this.getLastRow = jest.fn();
    this.getLastColumn = jest.fn();
  }
}

// Mock range class
class Range {
  constructor() {
    this.getValues = jest.fn();
    this.setValues = jest.fn();
    this.getRow = jest.fn();
    this.getColumn = jest.fn();
    this.getNumRows = jest.fn();
    this.getNumColumns = jest.fn();
  }
}

// Setup default mock implementations
SpreadsheetApp.getActiveSheet.mockReturnValue(new Sheet());

// Helper to reset all mocks between tests
beforeEach(() => {
  jest.clearAllMocks();
}); 