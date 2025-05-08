/**
 * Tests for the Google Apps Script client batching behavior
 * 
 * This test verifies that the client properly batches multiple requests into a single API call
 * instead of making separate API calls for each row.
 */

// Import only what we need to mock
jest.mock('../src/ApiClient', () => {
  return {
    processBatch: jest.fn(prompts => {
      // Mock implementation that returns a processed result for each prompt
      return prompts.map(p => `Processed: ${p}`);
    })
  };
});

// Get the mocked version
const apiClient = require('../src/ApiClient');

// Import the function after mocking
const Code = require('../src/Code');

describe('Client Batching Tests', () => {
  // Mock for the sheet and range objects
  const mockSheet = {
    getLastRow: jest.fn().mockReturnValue(5),
    getRange: jest.fn().mockImplementation((rangeSpec) => {
      if (typeof rangeSpec === 'string' && rangeSpec.includes(':')) {
        // Column data
        return {
          getValues: jest.fn().mockReturnValue([['Value1'], ['Value2'], ['Value3'], ['Value4'], ['Value5']])
        };
      } else {
        // Output range
        return {
          setValues: jest.fn()
        };
      }
    })
  };

  // Set up global mocks before all tests
  beforeAll(() => {
    // Mock SpreadsheetApp global
    global.SpreadsheetApp = {
      getActiveSheet: jest.fn().mockReturnValue(mockSheet)
    };

    // Mock Logger global
    global.Logger = {
      log: jest.fn()
    };

    // Mock console methods
    global.console = {
      ...console, // Keep original console methods for test output
      error: jest.fn()
    };

    // Mock PropertiesService global
    global.PropertiesService = {
      getScriptProperties: jest.fn().mockReturnValue({
        getProperty: jest.fn().mockImplementation((key) => {
          if (key === 'HUMBLE_CLAY_API_KEY') return 'hc_1234567890abcdef1234567890abcdef';
          if (key === 'HUMBLE_CLAY_API_URL') return 'https://api.example.com';
          return null;
        })
      })
    };

    // Add globally used functions to global scope
    global.columnToIndex = jest.fn().mockImplementation((col) => {
      // Simple implementation for testing
      return col.charCodeAt(0) - 'A'.charCodeAt(0) + 1;
    });
    
    global.extractColumnReferences = jest.fn().mockImplementation((template) => {
      const matches = template.match(/\{[A-Z]+\}/g) || [];
      return [...new Set(matches.map(match => match.slice(1, -1)))];
    });
    
    // Add processBatch function to global scope (needed by Code.js)
    global.processBatch = apiClient.processBatch;
  });

  // Reset mocks before each test
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('should make a single API call for multiple rows with our fix', () => {
    // Call the processPrompt function with a template that uses column A
    Code.processPrompt('B', 'Process this: {A}', 1, 5);

    // Verify that processBatch was called exactly once with all 5 prompts
    expect(apiClient.processBatch).toHaveBeenCalledTimes(1);
    
    // Verify that the batch contains all 5 prompts
    const batchArg = apiClient.processBatch.mock.calls[0][0];
    expect(batchArg.length).toBe(5);
    
    // Further validate that the prompts are correctly formatted
    expect(batchArg).toContain('Process this: Value1');
    expect(batchArg).toContain('Process this: Value5');
  });

  it('should handle large datasets with a single API call', () => {
    // Create a larger mock sheet with 25 rows
    const largeValues = Array(25).fill(0).map((_, i) => [`Value${i+1}`]);
    
    // Update the mock sheet for this test
    mockSheet.getLastRow.mockReturnValue(25);
    mockSheet.getRange.mockImplementation((rangeSpec) => {
      if (typeof rangeSpec === 'string' && rangeSpec.includes(':')) {
        return {
          getValues: jest.fn().mockReturnValue(largeValues)
        };
      } else {
        return {
          setValues: jest.fn()
        };
      }
    });
    
    // Call the processPrompt function
    Code.processPrompt('B', 'Process this: {A}', 1, 25);
    
    // After our fix, it should make a single call with all 25 prompts
    expect(apiClient.processBatch).toHaveBeenCalledTimes(1);
    
    // Verify that the batch contains all 25 prompts in a single call
    const batchArg = apiClient.processBatch.mock.calls[0][0];
    expect(batchArg.length).toBe(25);
    
    // Check for first and last values to confirm correctness
    expect(batchArg).toContain('Process this: Value1');
    expect(batchArg).toContain('Process this: Value25');
  });
}); 