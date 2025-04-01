// Import Jest globals
const { jest, beforeEach } = require('@jest/globals');

// Mock Google Apps Script global objects and functions
global.SpreadsheetApp = {
  getUi: jest.fn().mockReturnValue({
    createMenu: jest.fn().mockReturnValue({
      addItem: jest.fn().mockReturnThis(),
      addToUi: jest.fn()
    }),
    showSidebar: jest.fn()
  }),
  getActiveSheet: jest.fn(),
  getActiveSpreadsheet: jest.fn()
};

global.HtmlService = {
  createHtmlOutputFromFile: jest.fn().mockReturnValue({
    setTitle: jest.fn().mockReturnThis(),
    setWidth: jest.fn().mockReturnThis()
  })
};

global.PropertiesService = {
  getScriptProperties: jest.fn().mockReturnValue({
    getProperty: jest.fn(),
    setProperty: jest.fn(),
  }),
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