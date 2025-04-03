/**
 * Tests for Code.js
 */

// Import the module to test
const { processRange, processPrompt, extractColumnReferences } = require('../src/Code.js');

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
      expect(processRangeWithApi).toHaveBeenCalledWith(values, {});
      
      // Verify that the results were written to the output range
      expect(mockSheet.getRange).toHaveBeenCalledWith(outputRange);
      expect(mockRange.setValues).toHaveBeenCalledWith(processedValues);
    });

    it('should process range with schema and field path', () => {
      // Setup test data
      const inputRange = 'A1:A10';
      const outputColumn = 'B';
      const outputRange = 'B1:B10';
      const values = [['input1'], ['input2']];
      const processedValues = [['result1'], ['result2']];
      const schema = { type: 'object', properties: { name: { type: 'string' } } };
      const fieldPath = 'name';

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
      const result = processRange(inputRange, outputColumn, schema, fieldPath);

      // Verify results
      expect(result.success).toBe(true);
      expect(result.message).toBe('Range processed successfully');

      // Verify that the input was validated
      expect(validateRange).toHaveBeenCalledWith(inputRange);
      expect(validateOutputColumn).toHaveBeenCalledWith(outputColumn);
      
      // Verify that the options were passed correctly
      expect(processRangeWithApi).toHaveBeenCalledWith(values, {
        responseFormat: schema,
        extractFieldPath: fieldPath
      });
      
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

    it('should return error when schema is invalid', () => {
      // Setup
      validateRange.mockReturnValue(true);
      validateOutputColumn.mockReturnValue(true);

      // Execute with invalid schema (not an object)
      const result = processRange('A1:A10', 'B', 'not-an-object');

      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toBe('Schema must be a valid JSON object');
    });

    it('should return error when field path is provided without schema', () => {
      // Setup
      validateRange.mockReturnValue(true);
      validateOutputColumn.mockReturnValue(true);

      // Execute with field path but no schema
      const result = processRange('A1:A10', 'B', null, 'some.path');

      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toBe('Field path can only be used with a schema');
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

  describe('processPrompt', () => {
    it('should process rows using a prompt template with column references', () => {
      // Setup test data
      const outputColumn = 'C';
      const promptTemplate = 'Analyze the data in column A: {A} and compare with B: {B}';
      const startRow = 1;
      const endRow = 2;
      
      // Mock the data for columns A and B
      const mockAValues = [['Data A1'], ['Data A2']];
      const mockBValues = [['Data B1'], ['Data B2']];
      
      // Expected prompts after replacing references
      const expectedPrompt1 = 'Analyze the data in column A: Data A1 and compare with B: Data B1';
      const expectedPrompt2 = 'Analyze the data in column A: Data A2 and compare with B: Data B2';
      
      // Mock sheet and range
      const mockRangeA = {
        getValues: jest.fn().mockReturnValue(mockAValues)
      };
      
      const mockRangeB = {
        getValues: jest.fn().mockReturnValue(mockBValues)
      };
      
      const mockRangeOutput = {
        setValues: jest.fn()
      };
      
      const mockSheet = {
        getRange: jest.fn().mockImplementation((range) => {
          if (range === 'A1:A2') return mockRangeA;
          if (range === 'B1:B2') return mockRangeB;
          if (range === 'C1:C2') return mockRangeOutput;
          return null;
        }),
        getLastRow: jest.fn().mockReturnValue(10)
      };
      
      SpreadsheetApp.getActiveSheet.mockReturnValue(mockSheet);
      
      // Mock validateOutputColumn
      validateOutputColumn.mockReturnValue(true);
      
      // Mock the API call results
      makeApiRequest.mockReturnValueOnce({ response: 'Result 1' })
                    .mockReturnValueOnce({ response: 'Result 2' });
      
      // Execute the function
      const result = processPrompt(outputColumn, promptTemplate, startRow, endRow);
      
      // Verify results
      expect(result.success).toBe(true);
      expect(result.message).toBe('Processed 2 rows successfully');
      
      // Verify column references were extracted correctly
      expect(mockSheet.getRange).toHaveBeenCalledWith('A1:A2');
      expect(mockSheet.getRange).toHaveBeenCalledWith('B1:B2');
      
      // Verify API was called with replaced prompts
      expect(makeApiRequest).toHaveBeenCalledWith(expectedPrompt1, {});
      expect(makeApiRequest).toHaveBeenCalledWith(expectedPrompt2, {});
      
      // Verify output was set
      expect(mockSheet.getRange).toHaveBeenCalledWith('C1:C2');
      expect(mockRangeOutput.setValues).toHaveBeenCalledWith([['Result 1'], ['Result 2']]);
    });
    
    it('should process rows with default row range (all rows)', () => {
      // Setup test data
      const outputColumn = 'C';
      const promptTemplate = 'Analyze {A}';
      
      // Mock get last row
      const lastRow = 3;
      
      // Mock the data for column A
      const mockAValues = [['Data A1'], ['Data A2'], ['Data A3']];
      
      // Mock sheet and range
      const mockRangeA = {
        getValues: jest.fn().mockReturnValue(mockAValues)
      };
      
      const mockRangeOutput = {
        setValues: jest.fn()
      };
      
      const mockSheet = {
        getRange: jest.fn().mockImplementation((range) => {
          if (range === 'A1:A3') return mockRangeA;
          if (range === 'C1:C3') return mockRangeOutput;
          return null;
        }),
        getLastRow: jest.fn().mockReturnValue(lastRow)
      };
      
      SpreadsheetApp.getActiveSheet.mockReturnValue(mockSheet);
      
      // Mock validateOutputColumn
      validateOutputColumn.mockReturnValue(true);
      
      // Mock the API call results
      makeApiRequest.mockReturnValueOnce({ response: 'Result 1' })
                    .mockReturnValueOnce({ response: 'Result 2' })
                    .mockReturnValueOnce({ response: 'Result 3' });
      
      // Execute the function with null for startRow and endRow
      const result = processPrompt(outputColumn, promptTemplate, null, null);
      
      // Verify results
      expect(result.success).toBe(true);
      expect(result.message).toBe('Processed 3 rows successfully');
      
      // Verify column references were extracted for all rows
      expect(mockSheet.getRange).toHaveBeenCalledWith('A1:A3');
      
      // Verify API was called 3 times
      expect(makeApiRequest).toHaveBeenCalledTimes(3);
      
      // Verify output was set
      expect(mockRangeOutput.setValues).toHaveBeenCalledWith([['Result 1'], ['Result 2'], ['Result 3']]);
    });
    
    it('should handle multiple references to the same column', () => {
      // Setup test data
      const outputColumn = 'C';
      const promptTemplate = 'Column A appears twice: {A} and again {A}';
      const startRow = 1;
      const endRow = 1;
      
      // Mock the data for column A
      const mockAValues = [['Data A']];
      
      // Expected prompt after replacing references
      const expectedPrompt = 'Column A appears twice: Data A and again Data A';
      
      // Mock sheet and range
      const mockRangeA = {
        getValues: jest.fn().mockReturnValue(mockAValues)
      };
      
      const mockRangeOutput = {
        setValues: jest.fn()
      };
      
      const mockSheet = {
        getRange: jest.fn().mockImplementation((range) => {
          if (range === 'A1:A1') return mockRangeA;
          if (range === 'C1:C1') return mockRangeOutput;
          return null;
        }),
        getLastRow: jest.fn().mockReturnValue(1)
      };
      
      SpreadsheetApp.getActiveSheet.mockReturnValue(mockSheet);
      
      // Mock validateOutputColumn
      validateOutputColumn.mockReturnValue(true);
      
      // Mock the API call result
      makeApiRequest.mockReturnValueOnce({ response: 'Result' });
      
      // Execute the function
      const result = processPrompt(outputColumn, promptTemplate, startRow, endRow);
      
      // Verify results
      expect(result.success).toBe(true);
      
      // Verify API was called with correct prompt
      expect(makeApiRequest).toHaveBeenCalledWith(expectedPrompt, {});
    });
    
    it('should return error for invalid output column', () => {
      // Setup
      validateOutputColumn.mockImplementation(() => {
        throw new Error('Invalid column format');
      });
      
      // Execute
      const result = processPrompt('123', 'Test {A}');
      
      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toBe('Invalid column format');
    });
    
    it('should return error for empty prompt template', () => {
      // Setup
      validateOutputColumn.mockReturnValue(true);
      
      // Execute
      const result = processPrompt('C', '');
      
      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toBe('Prompt template is required and must be a string');
    });
    
    it('should return error for prompt without column references', () => {
      // Setup
      validateOutputColumn.mockReturnValue(true);
      
      // Mock sheet
      const mockSheet = {
        getLastRow: jest.fn().mockReturnValue(10)
      };
      
      SpreadsheetApp.getActiveSheet.mockReturnValue(mockSheet);
      
      // Execute
      const result = processPrompt('C', 'This has no column references');
      
      // Verify
      expect(result.success).toBe(false);
      expect(result.message).toBe('No column references found in prompt template');
    });
    
    it('should return error for invalid row range', () => {
      // Setup
      validateOutputColumn.mockReturnValue(true);
      
      // Mock sheet
      const mockSheet = {
        getLastRow: jest.fn().mockReturnValue(10)
      };
      
      SpreadsheetApp.getActiveSheet.mockReturnValue(mockSheet);
      
      // Test cases
      const testCases = [
        { startRow: 5, endRow: 3, expectedError: 'Start row cannot be greater than end row' },
        { startRow: 0, endRow: 5, expectedError: 'Start row must be at least 1' },
        { startRow: 1, endRow: 15, expectedError: 'End row cannot exceed last data row (10)' }
      ];
      
      testCases.forEach(({ startRow, endRow, expectedError }) => {
        // Execute
        const result = processPrompt('C', 'Test {A}', startRow, endRow);
        
        // Verify
        expect(result.success).toBe(false);
        expect(result.message).toBe(expectedError);
      });
    });
  });

  describe('extractColumnReferences', () => {
    it('should extract column references from template', () => {
      // Test cases
      const testCases = [
        { template: 'Analyze {A}', expected: ['A'] },
        { template: 'Compare {A} with {B}', expected: ['A', 'B'] },
        { template: 'Multiple {A} references {B} and {A} again', expected: ['A', 'B'] },
        { template: 'Using two-letter columns {AA} and {AB}', expected: ['AA', 'AB'] },
        { template: 'No references', expected: [] },
        { template: 'Invalid {123} reference', expected: [] },
        { template: 'Incomplete reference {', expected: [] }
      ];
      
      testCases.forEach(({ template, expected }) => {
        // Execute
        const result = extractColumnReferences(template);
        
        // Verify - result should be an array with unique column references
        expect(result).toEqual(expected);
      });
    });
  });
}); 