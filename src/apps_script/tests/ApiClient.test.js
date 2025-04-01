/**
 * Tests for ApiClient.js module
 */

const {
  makeApiRequest,
  validateApiKey,
  processRangeWithApi,
  formatRequestPayload,
  handleApiResponse,
  API_CONFIG,
  getApiBaseUrl,
  setApiBaseUrl
} = require('../src/ApiClient.js');

describe('ApiClient', () => {
  let mockScriptProperties;
  let mockUrlFetchApp;
  let mockResponse;
  const TEST_API_URL = 'https://api.test.com';
  
  beforeEach(() => {
    // Mock PropertiesService for API key and URL
    mockScriptProperties = {
      getProperty: jest.fn(),
      setProperty: jest.fn()
    };
    global.PropertiesService = {
      getScriptProperties: () => mockScriptProperties
    };

    // Set up default API URL
    mockScriptProperties.getProperty
      .mockImplementation((key) => {
        if (key === 'HUMBLE_CLAY_API_URL') return TEST_API_URL;
        if (key === 'HUMBLE_CLAY_API_KEY') return 'hc_1234567890abcdef1234567890abcdef';
        return null;
      });

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

    // Mock Utilities.sleep for retry delays
    global.Utilities = {
      sleep: jest.fn()
    };
  });

  describe('API_CONFIG', () => {
    it('should have correct default values', () => {
      expect(API_CONFIG).toEqual({
        maxRetries: 3,
        initialRetryDelay: 1000,
        maxBatchSize: 10,
        endpoints: {
          single: '/api/v1/prompt',
          batch: '/api/v1/prompts'
        }
      });
    });
  });

  describe('API URL Management', () => {
    it('should get API URL from script properties', () => {
      const url = getApiBaseUrl();
      expect(url).toBe(TEST_API_URL);
      expect(mockScriptProperties.getProperty).toHaveBeenCalledWith('HUMBLE_CLAY_API_URL');
    });

    it('should throw error when API URL is not configured', () => {
      mockScriptProperties.getProperty.mockReturnValue(null);
      expect(() => getApiBaseUrl()).toThrow('API URL not configured');
    });

    it('should set valid API URL', () => {
      setApiBaseUrl('https://api.example.com');
      expect(mockScriptProperties.setProperty).toHaveBeenCalledWith(
        'HUMBLE_CLAY_API_URL',
        'https://api.example.com'
      );
    });

    it('should reject invalid API URLs', () => {
      const invalidUrls = [
        null,
        undefined,
        '',
        'not-a-url',
        'ftp://invalid.com'
      ];

      invalidUrls.forEach(url => {
        expect(() => setApiBaseUrl(url)).toThrow('Invalid API URL format');
      });
    });
  });

  describe('formatRequestPayload', () => {
    it('should format valid input correctly', () => {
      const input = 'test input';
      const options = {
        systemPrompt: 'test prompt',
        outputStructure: 'json',
        extractField: 'data'
      };

      const payload = formatRequestPayload(input, options);
      expect(payload).toEqual({
        input: 'test input',
        systemPrompt: 'test prompt',
        outputStructure: 'json',
        extractField: 'data'
      });
    });

    it('should trim input text', () => {
      const input = '  test input  ';
      const payload = formatRequestPayload(input);
      expect(payload.input).toBe('test input');
    });

    it('should throw error for invalid input', () => {
      const invalidInputs = [null, undefined, '', 123, {}];
      invalidInputs.forEach(input => {
        expect(() => formatRequestPayload(input)).toThrow('Input text is required and must be a string');
      });
    });

    it('should validate optional fields', () => {
      const input = 'test';
      const invalidOptions = [
        { systemPrompt: 123 },
        { outputStructure: {} },
        { extractField: [] }
      ];

      invalidOptions.forEach(options => {
        expect(() => formatRequestPayload(input, options)).toThrow();
      });
    });
  });

  describe('handleApiResponse', () => {
    it('should parse successful response', () => {
      const responseData = { response: 'test result' };
      mockResponse.getResponseCode.mockReturnValue(200);
      mockResponse.getContentText.mockReturnValue(JSON.stringify(responseData));

      const result = handleApiResponse(mockResponse);
      expect(result).toEqual({ output: 'test result' });
    });

    it('should throw error for invalid response format', () => {
      mockResponse.getResponseCode.mockReturnValue(200);
      mockResponse.getContentText.mockReturnValue(JSON.stringify({ invalid: 'format' }));

      expect(() => handleApiResponse(mockResponse)).toThrow('Invalid response format');
    });

    it('should handle different error codes', () => {
      const errorCases = [
        { code: 400, message: 'Bad request' },
        { code: 401, message: 'Invalid API key' },
        { code: 429, message: 'Rate limit exceeded' },
        { code: 500, message: 'Internal server error' }
      ];

      errorCases.forEach(({ code, message }) => {
        mockResponse.getResponseCode.mockReturnValue(code);
        mockResponse.getContentText.mockReturnValue(message);
        expect(() => handleApiResponse(mockResponse)).toThrow();
      });
    });
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
      mockScriptProperties.getProperty
        .mockImplementation((key) => {
          if (key === 'HUMBLE_CLAY_API_KEY') return validApiKey;
          if (key === 'HUMBLE_CLAY_API_URL') return TEST_API_URL;
          return null;
        });
    });

    it('should make successful API request', () => {
      const expectedResponse = { response: 'Processed result' };
      mockResponse.getResponseCode.mockReturnValue(200);
      mockResponse.getContentText.mockReturnValue(JSON.stringify(expectedResponse));

      const result = makeApiRequest(testInput, testOptions);
      
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
        `${TEST_API_URL}${API_CONFIG.endpoints.single}`,
        expect.objectContaining({
          method: 'post',
          contentType: 'application/json',
          headers: {
            'Authorization': `Bearer ${validApiKey}`,
            'Accept': 'application/json'
          },
          payload: JSON.stringify({
            prompt: testInput.trim(),
            systemPrompt: 'Test prompt'
          }),
          muteHttpExceptions: true
        })
      );

      expect(result).toEqual({ output: 'Processed result' });
    });

    it('should retry on retryable errors', () => {
      const retryableErrors = [
        'Rate limit exceeded',
        'Internal server error',
        'network error',
        'timeout'
      ];

      retryableErrors.forEach(errorMsg => {
        mockResponse.getResponseCode.mockReturnValue(500);
        mockResponse.getContentText.mockReturnValue(errorMsg);

        // First two calls fail, third succeeds
        mockUrlFetchApp.fetch
          .mockImplementationOnce(() => {
            throw new Error(errorMsg);
          })
          .mockImplementationOnce(() => {
            throw new Error(errorMsg);
          })
          .mockImplementationOnce(() => {
            mockResponse.getResponseCode.mockReturnValue(200);
            mockResponse.getContentText.mockReturnValue(JSON.stringify({ response: 'success' }));
            return mockResponse;
          });

        const result = makeApiRequest(testInput);
        expect(result).toEqual({ output: 'success' });
        expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(3);
        expect(Utilities.sleep).toHaveBeenCalledTimes(2);

        // Reset mocks
        mockUrlFetchApp.fetch.mockReset();
        Utilities.sleep.mockReset();
      });
    });

    it('should not retry on non-retryable errors', () => {
      mockResponse.getResponseCode.mockReturnValue(400);
      mockResponse.getContentText.mockReturnValue('Bad request');

      expect(() => makeApiRequest(testInput)).toThrow('Bad request');
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(1);
      expect(Utilities.sleep).not.toHaveBeenCalled();
    });

    it('should throw error when max retries exceeded', () => {
      mockResponse.getResponseCode.mockReturnValue(429);
      mockResponse.getContentText.mockReturnValue('Rate limit exceeded');

      expect(() => makeApiRequest(testInput)).toThrow('Rate limit exceeded');
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledTimes(API_CONFIG.maxRetries);
      expect(Utilities.sleep).toHaveBeenCalledTimes(API_CONFIG.maxRetries - 1);
    });
  });

  describe('processRangeWithApi', () => {
    const testValues = [
      ['Input 1', 'Input 2', 'Input 3', 'Input 4', 'Input 5'],
      ['Input 6', '', 'Input 7', 'Input 8', 'Input 9']
    ];

    beforeEach(() => {
      mockResponse.getResponseCode.mockReturnValue(200);
      mockScriptProperties.getProperty
        .mockImplementation((key) => {
          if (key === 'HUMBLE_CLAY_API_KEY') return 'hc_1234567890abcdef1234567890abcdef';
          if (key === 'HUMBLE_CLAY_API_URL') return TEST_API_URL;
          return null;
        });
    });

    it('should process values in batches', () => {
      mockUrlFetchApp.fetch.mockImplementation((url, options) => {
        const payload = JSON.parse(options.payload);
        mockResponse.getContentText.mockReturnValue(JSON.stringify({
          response: {
            responses: payload.prompts.map(p => ({
              response: `Processed ${p.prompt}`
            }))
          }
        }));
        return mockResponse;
      });

      const result = processRangeWithApi(testValues);
      
      // Should process in batches of API_CONFIG.maxBatchSize
      expect(result[0].length).toBe(5);
      expect(result[1].length).toBe(5);
      expect(result[1][1]).toBe(''); // Empty cell should remain empty
      
      // Verify batch endpoint was used
      expect(mockUrlFetchApp.fetch).toHaveBeenCalledWith(
        `${TEST_API_URL}${API_CONFIG.endpoints.batch}`,
        expect.any(Object)
      );
    });

    it('should handle batch errors gracefully', () => {
      mockUrlFetchApp.fetch.mockImplementation((url, options) => {
        const payload = JSON.parse(options.payload);
        mockResponse.getContentText.mockReturnValue(JSON.stringify({
          response: {
            responses: payload.prompts.map((p, i) => ({
              response: i % 2 === 0 ? `Processed ${p.prompt}` : undefined,
              error: i % 2 === 0 ? undefined : 'API error'
            }))
          }
        }));
        return mockResponse;
      });

      const result = processRangeWithApi(testValues);
      
      // Should have mix of successful and error results
      expect(result[0].some(r => r.startsWith('Processed'))).toBe(true);
      expect(result[0].some(r => r.startsWith('Error:'))).toBe(true);
    });

    it('should handle invalid input gracefully', () => {
      const invalidInputs = [
        null,
        undefined,
        [],
        [null],
        [undefined],
        ['not an array']
      ];

      invalidInputs.forEach(input => {
        expect(() => processRangeWithApi(input)).toThrow('Values array cannot be empty');
      });
    });

    it('should continue processing after errors', () => {
      let callCount = 0;
      mockUrlFetchApp.fetch.mockImplementation(() => {
        callCount++;
        if (callCount % 2 === 0) {
          throw new Error('API error');
        }
        mockResponse.getContentText.mockReturnValue(
          JSON.stringify({
            response: {
              responses: [{ response: 'Success' }]
            }
          })
        );
        return mockResponse;
      });

      const result = processRangeWithApi(testValues);
      
      // Should have mix of successful and error results
      expect(result.flat().some(r => r === 'Success')).toBe(true);
      expect(result.flat().some(r => r.startsWith('Error:'))).toBe(true);
    });
  });
}); 