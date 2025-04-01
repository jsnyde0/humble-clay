/**
 * Tests for ApiClient.js module
 */

const {
  makeApiRequest,
  validateApiKey,
  processRangeWithApi
} = require('../src/ApiClient.js');

describe('ApiClient', () => {
  let mockScriptProperties;
  let mockUrlFetchApp;
  let mockResponse;
  
  beforeEach(() => {
    // Mock PropertiesService for API key
    mockScriptProperties = {
      getProperty: jest.fn()
    };
    global.PropertiesService = {
      getScriptProperties: () => mockScriptProperties
    };

    // Mock response object
    mockResponse = {
      getResponseCode: jest.fn(),
      getContentText: jest.fn()
    };

    // Mock UrlFetchApp for API requests
    mockUrlFetchApp = {
      fetch: jest.fn().mockReturnValue(mockResponse)
    };
    global.UrlFetchApp = mockUrlFetchApp;

    // Mock console.error for error logging
    global.console = {
      error: jest.fn()
    };
  });

  describe('validateApiKey', () => {
    it('should validate correct API key format', () => {
      const validKey = 'hc_1234567890abcdef1234567890abcdef';
      expect(validateApiKey(validKey)).toBe(true);
    });

    it('should reject invalid API key formats', () => {
      const invalidKeys = [
        'invalid_key',
        'hc_short',
        'hc_' + 'a'.repeat(33), // Too long
        null,
        undefined,
        123,
        ''
      ];

      invalidKeys.forEach(key => {
        expect(validateApiKey(key)).toBe(false);
      });
    });
  });

  describe('makeApiRequest', () => {
    const validApiKey = 'hc_1234567890abcdef1234567890abcdef';
    const testInput = 'Test input';
    const testOptions = { systemPrompt: 'Test prompt' };

    beforeEach(() => {
      mockScriptProperties.getProperty.mockReturnValue(validApiKey);
    });

    it('should make successful API request', async () => {
      const expectedResponse = { output: 'Processed result' };
      mockResponse.getResponseCode.mockReturnValue(200);
      mockResponse.getContentText.mockReturnValue(JSON.stringify(expectedResponse));

      const result = makeApiRequest(testInput, testOptions);
      
      // Verify request configuration
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
        'https://api.humbleclay.com/v1/process',
        expect.objectContaining({
          method: 'post',
          contentType: 'application/json',
          headers: {
            'Authorization': `Bearer ${validApiKey}`,
            'Accept': 'application/json'
          },
          payload: JSON.stringify({
            input: testInput,
            systemPrompt: 'Test prompt'
          }),
          muteHttpExceptions: true
        })
      );

      // Verify response handling
      expect(result).toEqual(expectedResponse);
    });

    it('should throw error when API key is not configured', () => {
      mockScriptProperties.getProperty.mockReturnValue(null);
      
      expect(() => makeApiRequest(testInput))
        .toThrow('API key not configured. Please set up your API key in the configuration.');
    });

    it('should handle authentication error (401)', () => {
      mockResponse.getResponseCode.mockReturnValue(401);
      mockResponse.getContentText.mockReturnValue('Invalid API key');

      expect(() => makeApiRequest(testInput))
        .toThrow('Invalid API key. Please check your configuration.');
    });

    it('should handle rate limit error (429)', () => {
      mockResponse.getResponseCode.mockReturnValue(429);
      mockResponse.getContentText.mockReturnValue('Rate limit exceeded');

      expect(() => makeApiRequest(testInput))
        .toThrow('Rate limit exceeded. Please try again later.');
    });

    it('should handle other API errors', () => {
      mockResponse.getResponseCode.mockReturnValue(500);
      mockResponse.getContentText.mockReturnValue('Internal server error');

      expect(() => makeApiRequest(testInput))
        .toThrow('API request failed with status 500: Internal server error');
    });

    it('should handle network errors', () => {
      mockUrlFetchApp.fetch.mockImplementation(() => {
        throw new Error('Network error');
      });

      expect(() => makeApiRequest(testInput))
        .toThrow('API request failed: Network error');
    });
  });

  describe('processRangeWithApi', () => {
    const testValues = [
      ['Input 1', 'Input 2'],
      ['Input 3', '']
    ];

    beforeEach(() => {
      // Mock successful API response
      mockResponse.getResponseCode.mockReturnValue(200);
      // Mock API key
      mockScriptProperties.getProperty.mockReturnValue('hc_1234567890abcdef1234567890abcdef');
    });

    it('should process non-empty cells through API', () => {
      // Mock fetch to capture input and return processed value
      mockUrlFetchApp.fetch.mockImplementation((url, options) => {
        const payload = JSON.parse(options.payload);
        mockResponse.getContentText.mockReturnValue(
          JSON.stringify({ output: `Processed ${payload.input}` })
        );
        return mockResponse;
      });

      const result = processRangeWithApi(testValues);
      
      // Should process non-empty cells
      expect(result[0][0]).toEqual(['Processed Input 1']);
      expect(result[0][1]).toEqual(['Processed Input 2']);
      expect(result[1][0]).toEqual(['Processed Input 3']);
      // Should keep empty cells empty
      expect(result[1][1]).toEqual(['']);
    });

    it('should handle API errors for individual cells', () => {
      mockUrlFetchApp.fetch.mockImplementation(() => {
        throw new Error('API error');
      });

      const result = processRangeWithApi(testValues);
      
      // Should contain error messages for failed cells
      expect(result[0][0]).toEqual(['Error: API request failed: API error']);
      expect(result[0][1]).toEqual(['Error: API request failed: API error']);
      expect(result[1][0]).toEqual(['Error: API request failed: API error']);
      // Should still keep empty cells empty
      expect(result[1][1]).toEqual(['']);

      // Should log errors
      expect(console.error).toHaveBeenCalledTimes(3);
    });

    it('should handle empty input gracefully', () => {
      const emptyValues = [['', ''], ['', '']];
      const result = processRangeWithApi(emptyValues);
      
      // Should return array of empty strings
      expect(result).toEqual([[[''], ['']], [[''], ['']]]);
      // Should not make any API calls
      expect(mockUrlFetchApp.fetch).not.toHaveBeenCalled();
    });
  });
}); 