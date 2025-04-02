/**
 * Tests for Code.js
 */

// Import the module to test
const { processRange } = require('../src/Code.js');

// No need to mock dependencies - they're mocked globally in setup.js

describe('Code.js', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    resetAllMocks();
  });

  describe('processRange', () => {
    it('should process range and return success result', () => {
      // Setup test data
      const inputRange = 'A1:A10';
      const outputColumn = 'B';
      const outputRange = 'B1:B10';
      const values = [['input1'], ['input2']];
      const processedValues = [['result1'], ['result2']];

      // Configure mocks
      validateRange.mockReturnValue(true);
      validateOutputColumn.mockReturnValue(true);
      mapInputRangeToOutput.mockReturnValue(outputRange);

      const mockRange = {
        getValues: jest.fn().mockReturnValue(values),
        setValues: jest.fn()
      };

      const mockSheet = {
        getRange: jest.fn().mockReturnValue(mockRange)
      };

      SpreadsheetApp.getActiveSheet.mockReturnValue(mockSheet);
      
      // Setup API client mock
      processRangeWithApi.mockReturnValue(processedValues);

      // Execute function
      const result = processRange(inputRange, outputColumn);

      // Verify results
      expect(result.success).toBe(true);
      expect(result.message).toBe('Range processed successfully');

      // Verify that the input was validated
      expect(validateRange).toHaveBeenCalledWith(inputRange);
      expect(validateOutputColumn).toHaveBeenCalledWith(outputColumn);
      
      // Verify that the range was mapped correctly
      expect(mapInputRangeToOutput).toHaveBeenCalledWith(inputRange, outputColumn);
      
      // Verify that the values were fetched and processed
      expect(mockSheet.getRange).toHaveBeenCalledWith(inputRange);
      expect(mockRange.getValues).toHaveBeenCalled();
      expect(processRangeWithApi).toHaveBeenCalledWith(values);
      
      // Verify that the results were written to the output range
      expect(mockSheet.getRange).toHaveBeenCalledWith(outputRange);
      expect(mockRange.setValues).toHaveBeenCalledWith(processedValues);
    });

    it('should return error when no active sheet is found', () => {
      // Setup
      SpreadsheetApp.getActiveSheet.mockReturnValue(null);

      // Execute
      const result = processRange('A1:A10', 'B');

      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toBe('No active sheet found');
    });

    it('should return error when range validation fails', () => {
      // Setup
      validateRange.mockImplementation(() => {
        throw new Error('Invalid range format');
      });

      // Execute
      const result = processRange('invalid', 'B');

      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid range format');
    });

    it('should return error when output column validation fails', () => {
      // Setup
      validateRange.mockReturnValue(true);
      validateOutputColumn.mockImplementation(() => {
        throw new Error('Invalid column format');
      });

      // Execute
      const result = processRange('A1:A10', '123');

      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid column format');
    });

    it('should return error when range has no values', () => {
      // Setup
      validateRange.mockReturnValue(true);
      validateOutputColumn.mockReturnValue(true);

      const mockRange = {
        getValues: jest.fn().mockReturnValue([])
      };

      const mockSheet = {
        getRange: jest.fn().mockReturnValue(mockRange)
      };

      SpreadsheetApp.getActiveSheet.mockReturnValue(mockSheet);

      // Execute
      const result = processRange('A1:A10', 'B');

      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toBe('No values found in the input range');
    });
  });
}); 