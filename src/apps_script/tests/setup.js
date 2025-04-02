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
  })
};

// Mock UrlFetchApp
global.UrlFetchApp = {
  fetch: jest.fn().mockReturnValue({
    getResponseCode: jest.fn().mockReturnValue(200),
    getContentText: jest.fn().mockReturnValue('{"response":"test","status":"success"}')
  })
};

// Helper method to reset all mocks between tests
global.resetAllMocks = () => {
  jest.clearAllMocks();
  
  // Reset script properties
  Object.keys(scriptProperties).forEach(key => {
    delete scriptProperties[key];
  });
}; 