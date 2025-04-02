/**
 * Tests for ApiClient.js
 */

// Import the functions to test
const {
  API_CONFIG,
  getApiBaseUrl,
  setApiBaseUrl,
  getApiKey,
  setApiKey,
  loadApiConfig,
  formatRequestPayload,
  handleApiResponse,
  validateApiKey,
  makeApiRequest,
  processRangeWithApi
} = require('../src/ApiClient.js');

describe('ApiClient', () => {
  const TEST_API_URL = 'https://api.test.com';
  const TEST_API_KEY = 'hc_1234567890abcdef1234567890abcdef';
  
  beforeEach(() => {
    // Reset all mocks
    resetAllMocks();

    // Set up default API URL and key in script properties
    PropertiesService.getScriptProperties().getProperty
      .mockImplementation((key) => {
        if (key === 'HUMBLE_CLAY_API_URL') return TEST_API_URL;
        if (key === 'HUMBLE_CLAY_API_KEY') return TEST_API_KEY;
        return null;
      });
  });

  describe('API_CONFIG', () => {
    it('should have correct default values', () => {
      expect(API_CONFIG).toHaveProperty('maxRetries');
      expect(API_CONFIG).toHaveProperty('initialRetryDelay');
      expect(API_CONFIG).toHaveProperty('maxBatchSize');
      expect(API_CONFIG).toHaveProperty('endpoints');
      expect(API_CONFIG.endpoints).toHaveProperty('single');
      expect(API_CONFIG.endpoints).toHaveProperty('batch');
    });
  });

  describe('getApiBaseUrl', () => {
    it('should get API base URL from script properties', () => {
      // Execute
      const result = getApiBaseUrl();

      // Verify
      expect(result).toBe(TEST_API_URL);
      expect(PropertiesService.getScriptProperties().getProperty).toHaveBeenCalledWith('HUMBLE_CLAY_API_URL');
    });

    it('should throw error if API URL is not configured', () => {
      // Setup
      PropertiesService.getScriptProperties().getProperty.mockReturnValue(null);

      // Verify
      expect(() => getApiBaseUrl()).toThrow('API URL not configured');
    });
  });

  describe('setApiBaseUrl', () => {
    it('should set API base URL in script properties', () => {
      // Execute
      setApiBaseUrl('https://api.example.com');

      // Verify
      expect(PropertiesService.getScriptProperties().setProperty)
        .toHaveBeenCalledWith('HUMBLE_CLAY_API_URL', 'https://api.example.com');
    });

    it('should throw error for invalid URL', () => {
      // Verify
      expect(() => setApiBaseUrl('')).toThrow('Invalid API URL format');
      expect(() => setApiBaseUrl(null)).toThrow('Invalid API URL format');
      expect(() => setApiBaseUrl('not-a-url')).toThrow('Invalid API URL format');
    });
  });

  describe('getApiKey', () => {
    it('should get API key from script properties', () => {
      // Execute
      const result = getApiKey();

      // Verify
      expect(result).toBe(TEST_API_KEY);
      expect(PropertiesService.getScriptProperties().getProperty).toHaveBeenCalledWith('HUMBLE_CLAY_API_KEY');
    });
  });

  describe('setApiKey', () => {
    it('should set valid API key in script properties', () => {
      // Setup
      const validKey = 'hc_abcdefghijklmnopqrstuvwxyz123456';
      
      // Execute
      setApiKey(validKey);

      // Verify
      expect(PropertiesService.getScriptProperties().setProperty)
        .toHaveBeenCalledWith('HUMBLE_CLAY_API_KEY', validKey);
    });

    it('should throw error for invalid API key', () => {
      // Setup
      const invalidKeys = ['invalid_key', '', null, undefined];
      
      // Verify
      invalidKeys.forEach(key => {
        expect(() => setApiKey(key)).toThrow('Invalid API key format');
      });
    });
  });

  describe('loadApiConfig', () => {
    it('should load config from script properties', () => {
      // Execute
      const config = loadApiConfig();

      // Verify
      expect(config).toEqual({
        apiKey: TEST_API_KEY,
        apiUrl: TEST_API_URL
      });
    });
  });

  describe('validateApiKey', () => {
    it('should validate correct API key format', () => {
      // Setup
      const validKey = 'hc_abcdefghijklmnopqrstuvwxyz123456';
      
      // Execute & Verify
      expect(validateApiKey(validKey)).toBe(true);
    });

    it('should reject invalid API key formats', () => {
      // Setup
      const invalidKeys = [
        'invalid_key',
        'hc_short',
        'hc_' + 'a'.repeat(33), // Too long
        123,
        '',
        null
      ];

      // Execute & Verify
      invalidKeys.forEach(key => {
        expect(validateApiKey(key)).toBe(false);
      });
    });
  });

  describe('formatRequestPayload', () => {
    it('should format valid input correctly', () => {
      // Setup
      const input = 'test input';
      const options = {
        systemPrompt: 'test prompt',
        outputStructure: 'json',
        extractField: 'data'
      };

      // Execute
      const payload = formatRequestPayload(input, options);

      // Verify
      expect(payload).toEqual({
        input: 'test input',
        systemPrompt: 'test prompt',
        outputStructure: 'json',
        extractField: 'data'
      });
    });

    it('should trim input text', () => {
      // Setup
      const input = '  test input  ';

      // Execute
      const payload = formatRequestPayload(input);

      // Verify
      expect(payload.input).toBe('test input');
    });

    it('should throw error for invalid input', () => {
      // Setup
      const invalidInputs = [null, '', 123, {}];

      // Execute & Verify
      invalidInputs.forEach(input => {
        expect(() => formatRequestPayload(input)).toThrow('Input text is required');
      });
    });
  });

  describe('handleApiResponse', () => {
    let mockResponse;

    beforeEach(() => {
      mockResponse = {
        getResponseCode: jest.fn().mockReturnValue(200),
        getContentText: jest.fn().mockReturnValue(JSON.stringify({ response: 'test result' }))
      };
    });

    it('should parse successful response', () => {
      // Setup
      mockResponse.getContentText.mockReturnValue(JSON.stringify({ response: 'test result' }));

      // Execute
      const result = handleApiResponse(mockResponse);

      // Verify
      expect(result).toEqual({ response: 'test result' });
    });

    it('should parse batch response', () => {
      // Setup
      mockResponse.getContentText.mockReturnValue(JSON.stringify({ 
        responses: [
          { status: 'success', response: 'result1' },
          { status: 'success', response: 'result2' }
        ]
      }));

      // Execute
      const result = handleApiResponse(mockResponse);

      // Verify
      expect(result).toHaveProperty('responses');
      expect(result.responses).toHaveLength(2);
    });

    it('should throw error for invalid response format', () => {
      // Setup
      mockResponse.getContentText.mockReturnValue(JSON.stringify({ invalid: 'format' }));

      // Execute & Verify
      expect(() => handleApiResponse(mockResponse)).toThrow('Invalid response format');
    });

    it('should handle different error codes', () => {
      // Setup
      const errorCodes = [
        { code: 400, message: 'Bad request' },
        { code: 401, message: 'Invalid API key' },
        { code: 429, message: 'Rate limit exceeded' },
        { code: 500, message: 'Internal server error' }
      ];

      // Execute & Verify
      errorCodes.forEach(({ code, message }) => {
        mockResponse.getResponseCode.mockReturnValue(code);
        expect(() => handleApiResponse(mockResponse)).toThrow(message);
      });
    });
  });

  describe('makeApiRequest', () => {
    it('should make successful API request', () => {
      // Setup
      const testInput = 'Test input';
      const testOptions = { systemPrompt: 'Test prompt' };
      
      // Execute
      const result = makeApiRequest(testInput, testOptions);

      // Verify
      expect(UrlFetchApp.fetch).toHaveBeenCalledWith(
        `${TEST_API_URL}${API_CONFIG.endpoints.single}`,
        expect.objectContaining({
          method: 'post',
          headers: expect.objectContaining({
            'X-API-Key': TEST_API_KEY
          })
        })
      );
    });

    it('should throw error if API key is not configured', () => {
      // Setup - empty API key
      PropertiesService.getScriptProperties().getProperty
        .mockImplementation(key => {
          if (key === 'HUMBLE_CLAY_API_KEY') return null;
          if (key === 'HUMBLE_CLAY_API_URL') return TEST_API_URL;
          return null;
        });

      // Execute & Verify
      expect(() => makeApiRequest('Test input')).toThrow('API key not configured');
    });
  });

  describe('processRangeWithApi', () => {
    it('should reject invalid input arrays', () => {
      // Setup
      const invalidInputs = [null, {}, [], [1, 2, 3]];

      // Execute & Verify
      invalidInputs.forEach(input => {
        expect(() => processRangeWithApi(input)).toThrow('Values array cannot be empty');
      });
    });

    it('should process values in batches', () => {
      // Setup
      const testValues = [
        ['input1', 'input2'],
        ['input3', 'input4']
      ];
      
      // Mock batch response
      UrlFetchApp.fetch.mockReturnValue({
        getResponseCode: jest.fn().mockReturnValue(200),
        getContentText: jest.fn().mockReturnValue(JSON.stringify({
          responses: [
            { status: 'success', response: 'result1' },
            { status: 'success', response: 'result2' },
            { status: 'success', response: 'result3' },
            { status: 'success', response: 'result4' }
          ]
        }))
      });

      // Execute
      const result = processRangeWithApi(testValues);

      // Verify correct structure
      expect(result).toEqual([
        ['result1', 'result2'],
        ['result3', 'result4']
      ]);
    });

    it('should handle empty cells correctly', () => {
      // Setup
      const testValues = [
        ['input1', ''],
        ['', 'input4']
      ];
      
      // Mock response
      UrlFetchApp.fetch.mockReturnValue({
        getResponseCode: jest.fn().mockReturnValue(200),
        getContentText: jest.fn().mockReturnValue(JSON.stringify({
          responses: [
            { status: 'success', response: 'result1' },
            { status: 'success', response: 'result4' }
          ]
        }))
      });

      // Execute
      const result = processRangeWithApi(testValues);

      // Verify empty cells remain empty
      expect(result).toEqual([
        ['result1', ''],
        ['', 'result4']
      ]);
    });
  });
}); 