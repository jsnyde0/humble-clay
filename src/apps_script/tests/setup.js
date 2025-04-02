/**
 * Jest setup file for Google Apps Script tests
 * This file is loaded before tests run, setting up the global environment
 */

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
    setProperty: jest.fn((key, value) => {
      scriptProperties[key] = value;
      return;
    }),
    deleteProperty: jest.fn(key => {
      delete scriptProperties[key];
      return;
    })
  })
};

// Mock SpreadsheetApp
global.SpreadsheetApp = {
  getActiveSheet: jest.fn().mockReturnValue({
    getRange: jest.fn().mockReturnValue({
      getValues: jest.fn().mockReturnValue([['test']]),
      setValues: jest.fn()
    })
  }),
  getActiveSpreadsheet: jest.fn().mockReturnValue({
    getSheetByName: jest.fn(),
    getActiveSheet: jest.fn()
  }),
  getUi: jest.fn().mockReturnValue({
    createMenu: jest.fn().mockReturnValue({
      addItem: jest.fn().mockReturnThis(),
      addSeparator: jest.fn().mockReturnThis(),
      addToUi: jest.fn()
    }),
    alert: jest.fn(),
    ButtonSet: {
      OK: 'OK'
    }
  })
};

// Mock HtmlService
global.HtmlService = {
  createHtmlOutputFromFile: jest.fn().mockReturnValue({
    setTitle: jest.fn().mockReturnThis(),
    setWidth: jest.fn().mockReturnThis(),
    setHeight: jest.fn().mockReturnThis()
  }),
  createTemplateFromFile: jest.fn().mockReturnValue({
    evaluate: jest.fn().mockReturnValue({
      setTitle: jest.fn().mockReturnThis(),
      setWidth: jest.fn().mockReturnThis(),
      setHeight: jest.fn().mockReturnThis()
    })
  }),
  createHtmlOutput: jest.fn().mockReturnValue({
    setTitle: jest.fn().mockReturnThis(),
    setWidth: jest.fn().mockReturnThis(),
    setHeight: jest.fn().mockReturnThis()
  })
};

// Mock UrlFetchApp
global.UrlFetchApp = {
  fetch: jest.fn().mockReturnValue({
    getResponseCode: jest.fn().mockReturnValue(200),
    getContentText: jest.fn().mockReturnValue('{"response":"test","status":"success"}')
  })
};

// Import RangeUtils functions and expose them globally
// This mimics Apps Script behavior where functions from another file are available globally
const RangeUtils = require('../src/RangeUtils');
global.validateRange = jest.fn(RangeUtils.validateRange);
global.validateOutputColumn = jest.fn(RangeUtils.validateOutputColumn);
global.mapInputRangeToOutput = jest.fn(RangeUtils.mapInputRangeToOutput);

// Import UI functions and expose them globally
const UI = require('../src/UI');
global.showSidebarUI = jest.fn(UI.showSidebarUI);
global.createMenu = jest.fn(UI.createMenu);
global.showError = jest.fn(UI.showError);
global.showMessage = jest.fn(UI.showMessage);
global.showApiConfigDialog = jest.fn(UI.showApiConfigDialog);

// Import Config functions and expose them globally
const Config = require('../src/Config');
global.getApiKey = jest.fn(Config.getApiKey);
global.setApiKey = jest.fn(Config.setApiKey);
global.getApiBaseUrl = jest.fn(Config.getApiBaseUrl);
global.setApiBaseUrl = jest.fn(Config.setApiBaseUrl);
global.validateApiKey = jest.fn(Config.validateApiKey);
global.validateConfig = jest.fn(Config.validateConfig);
global.isConfigured = jest.fn(Config.isConfigured);

// Import ApiClient functions and expose them globally
const ApiClient = require('../src/ApiClient');
global.processRangeWithApi = jest.fn(ApiClient.processRangeWithApi);
global.makeApiRequest = jest.fn(ApiClient.makeApiRequest);
global.formatRequestPayload = jest.fn(ApiClient.formatRequestPayload);
global.handleApiResponse = jest.fn(ApiClient.handleApiResponse);

// Helper method to reset all mocks between tests
global.resetAllMocks = () => {
  jest.clearAllMocks();
  
  // Reset script properties
  Object.keys(scriptProperties).forEach(key => {
    delete scriptProperties[key];
  });

  // Reset all global mocks
  global.validateRange.mockClear();
  global.validateOutputColumn.mockClear();
  global.mapInputRangeToOutput.mockClear();
  global.showSidebarUI.mockClear();
  global.createMenu.mockClear();
  global.showError.mockClear();
  global.showMessage.mockClear();
  global.showApiConfigDialog.mockClear();
  global.getApiKey.mockClear();
  global.setApiKey.mockClear();
  global.getApiBaseUrl.mockClear();
  global.setApiBaseUrl.mockClear();
  global.validateApiKey.mockClear();
  global.validateConfig.mockClear();
  global.isConfigured.mockClear();
  global.processRangeWithApi.mockClear();
  global.makeApiRequest.mockClear();
  global.formatRequestPayload.mockClear();
  global.handleApiResponse.mockClear();
}; 