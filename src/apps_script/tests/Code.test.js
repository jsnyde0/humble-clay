const { jest, describe, test, expect, beforeEach } = require('@jest/globals');

// Mock dependencies
jest.mock('../src/UI', () => ({
  createMenu: jest.fn(),
  showSidebar: jest.fn()
}));

jest.mock('../src/RangeUtils', () => ({
  validateRange: jest.fn(),
  validateOutputColumn: jest.fn(),
  mapInputRangeToOutput: jest.fn()
}));

// Import after mocking
const UI = require('../src/UI');
const RangeUtils = require('../src/RangeUtils');
const { onOpen, showSidebar, processRange } = require('../src/Code');

describe('Code.js', () => {
  beforeEach(() => {
    // Reset all mocks
    jest.clearAllMocks();
  });

  describe('onOpen', () => {
    test('creates menu on open', () => {
      onOpen();
      expect(UI.createMenu).toHaveBeenCalled();
    });
  });

  describe('showSidebar', () => {
    test('shows sidebar UI', () => {
      showSidebar();
      expect(UI.showSidebar).toHaveBeenCalled();
    });
  });

  describe('processRange', () => {
    // Mock data
    const inputRange = 'A1:A10';
    const outputColumn = 'C';
    const mockValues = [[1], [2], [3]];

    beforeEach(() => {
      // Mock successful validation
      RangeUtils.validateRange.mockReturnValue(true);
      RangeUtils.validateOutputColumn.mockReturnValue(true);
      RangeUtils.mapInputRangeToOutput.mockReturnValue('C1:C10');

      // Mock sheet operations
      const mockRange = {
        getValues: jest.fn().mockReturnValue(mockValues),
        setValues: jest.fn()
      };

      const mockSheet = {
        getRange: jest.fn().mockReturnValue(mockRange)
      };

      global.SpreadsheetApp.getActiveSheet.mockReturnValue(mockSheet);
    });

    test('successfully processes valid range', () => {
      const result = processRange(inputRange, outputColumn);

      // Verify validations were called
      expect(RangeUtils.validateRange).toHaveBeenCalledWith(inputRange);
      expect(RangeUtils.validateOutputColumn).toHaveBeenCalledWith(outputColumn);

      // Verify range mapping
      expect(RangeUtils.mapInputRangeToOutput).toHaveBeenCalledWith(inputRange, outputColumn);

      // Verify sheet operations
      const sheet = SpreadsheetApp.getActiveSheet();
      expect(sheet.getRange).toHaveBeenCalledWith(inputRange);
      expect(sheet.getRange).toHaveBeenCalledWith('C1:C10');

      // Verify values were copied
      const targetRange = sheet.getRange('C1:C10');
      expect(targetRange.setValues).toHaveBeenCalledWith(mockValues);

      // Verify success response
      expect(result).toEqual({
        success: true,
        message: 'Range processed successfully'
      });
    });

    test('handles validation errors', () => {
      // Mock validation failure
      RangeUtils.validateRange.mockImplementation(() => {
        throw new Error('Invalid range format');
      });

      const result = processRange('invalid', outputColumn);

      expect(result).toEqual({
        success: false,
        message: 'Invalid range format'
      });
    });

    test('handles missing sheet error', () => {
      // Mock no active sheet
      global.SpreadsheetApp.getActiveSheet.mockReturnValue(null);

      const result = processRange(inputRange, outputColumn);

      expect(result).toEqual({
        success: false,
        message: 'No active sheet found'
      });
    });

    test('handles empty range error', () => {
      // Mock empty range values
      const mockRange = {
        getValues: jest.fn().mockReturnValue([])
      };

      const mockSheet = {
        getRange: jest.fn().mockReturnValue(mockRange)
      };

      global.SpreadsheetApp.getActiveSheet.mockReturnValue(mockSheet);

      const result = processRange(inputRange, outputColumn);

      expect(result).toEqual({
        success: false,
        message: 'No values found in the input range'
      });
    });
  });
}); 