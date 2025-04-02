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
  processRangeWithApi,
  processBatch
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
    beforeEach(() => {
      resetAllMocks();
      // Mock UrlFetchApp.fetch
      global.UrlFetchApp = {
        fetch: jest.fn().mockReturnValue({
          getResponseCode: jest.fn().mockReturnValue(200),
          getContentText: jest.fn().mockReturnValue('{"response":"test"}')
        })
      };
      // Mock PropertiesService
      global.PropertiesService = {
        getScriptProperties: jest.fn().mockReturnValue({
          getProperty: jest.fn((key) => {
            if (key === 'HUMBLE_CLAY_API_KEY') return 'hc_12345678901234567890123456789012';
            if (key === 'HUMBLE_CLAY_API_URL') return 'https://api.example.com';
            return null;
          })
        })
      };
    });

    test('correctly formats JSON schema for the API', () => {
      // Test schema
      const testSchema = {
        "type": "object",
        "properties": {
          "age": { "type": "number" }
        },
        "required": ["age"]
      };
      
      // Test input
      const input = "I'm 35 years old";
      
      // Call makeApiRequest with schema
      makeApiRequest(input, { responseFormat: testSchema });
      
      // Get the call arguments from UrlFetchApp.fetch
      const fetchCall = UrlFetchApp.fetch.mock.calls[0];
      expect(fetchCall[0]).toBe('https://api.example.com/api/v1/prompt');
      
      // Parse the payload to verify format
      const payload = JSON.parse(fetchCall[1].payload);
      
      // Verify the payload structure
      expect(payload).toHaveProperty('prompt', input.trim());
      expect(payload).toHaveProperty('response_format');
      expect(payload.response_format).toHaveProperty('type', 'json_schema');
      expect(payload.response_format).toHaveProperty('json_schema');
      expect(payload.response_format.json_schema).toHaveProperty('name', 'DynamicSchema');
      expect(payload.response_format.json_schema).toHaveProperty('schema');
      expect(payload.response_format.json_schema.schema).toEqual(testSchema);
    });
    
    test('correctly formats extractFieldPath for the API', () => {
      // Test schema and field path
      const testSchema = {
        "type": "object",
        "properties": {
          "age": { "type": "number" }
        },
        "required": ["age"]
      };
      const fieldPath = "age";
      
      // Test input
      const input = "I'm 35 years old";
      
      // Call makeApiRequest with schema and field path
      makeApiRequest(input, { 
        responseFormat: testSchema,
        extractFieldPath: fieldPath 
      });
      
      // Get the call arguments from UrlFetchApp.fetch
      const fetchCall = UrlFetchApp.fetch.mock.calls[0];
      
      // Parse the payload to verify format
      const payload = JSON.parse(fetchCall[1].payload);
      
      // Verify the field path is included
      expect(payload).toHaveProperty('extract_field_path', fieldPath);
    });

    it('should make successful API request', () => {
      // Setup
      const testInput = 'Test input';
      const expectedOutput = { response: 'Test response' };
      
      // Configure PropertiesService mock
      PropertiesService.getScriptProperties().getProperty.mockImplementation(key => {
        if (key === 'HUMBLE_CLAY_API_KEY') return 'hc_1234567890abcdef1234567890abcdef';
        if (key === 'HUMBLE_CLAY_API_URL') return 'https://api.example.com';
        return null;
      });
      
      UrlFetchApp.fetch.mockReturnValue({
        getResponseCode: jest.fn().mockReturnValue(200),
        getContentText: jest.fn().mockReturnValue(JSON.stringify(expectedOutput))
      });
      
      // Execute
      const result = makeApiRequest(testInput);
      
      // Verify
      expect(result).toEqual(expectedOutput);
      expect(UrlFetchApp.fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/prompt',
        expect.objectContaining({
          payload: JSON.stringify({ prompt: 'Test input' })
        })
      );
    });

    test('should include schema and field path in request payload', () => {
      // Setup
      resetAllMocks();
      
      // Set up test data
      const schemaObj = { type: 'object', properties: { name: { type: 'string' }}};
      const expectedSchema = {
        type: "json_schema",
        json_schema: {
          name: "DynamicSchema",
          schema: schemaObj
        }
      };
      
      const expectedPayload = {
        prompt: 'Test input',
        response_format: expectedSchema,
        extract_field_path: 'name'
      };
      
      // Set up mocks
      UrlFetchApp.fetch.mockReturnValue({
        getResponseCode: jest.fn().mockReturnValue(200),
        getContentText: jest.fn().mockReturnValue('{"response":"test"}')
      });
      
      PropertiesService.getScriptProperties().getProperty.mockImplementation((key) => {
        if (key === 'HUMBLE_CLAY_API_KEY') return 'hc_1234567890abcdef1234567890abcdef';
        if (key === 'HUMBLE_CLAY_API_URL') return 'https://api.example.com';
        return null;
      });
      
      // Call function with schema and field path
      makeApiRequest('Test input', { 
        responseFormat: schemaObj, 
        extractFieldPath: 'name' 
      });
      
      // Verify
      expect(UrlFetchApp.fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/prompt',
        expect.objectContaining({
          payload: JSON.stringify(expectedPayload)
        })
      );
    });

    it('should throw error if API key is not configured', () => {
      // Setup
      PropertiesService.getScriptProperties().getProperty.mockImplementation(key => {
        if (key === 'HUMBLE_CLAY_API_KEY') return null;
        if (key === 'HUMBLE_CLAY_API_URL') return 'https://api.example.com';
        return null;
      });
      
      // Verify
      expect(() => makeApiRequest('Test')).toThrow('API key not configured');
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

  describe('processBatch', () => {
    beforeEach(() => {
      resetAllMocks();
      // Mock UrlFetchApp.fetch
      global.UrlFetchApp = {
        fetch: jest.fn().mockReturnValue({
          getResponseCode: jest.fn().mockReturnValue(200),
          getContentText: jest.fn().mockReturnValue('{"responses":[{"status":"success","response":"test"}]}')
        })
      };
      // Mock PropertiesService
      global.PropertiesService = {
        getScriptProperties: jest.fn().mockReturnValue({
          getProperty: jest.fn((key) => {
            if (key === 'HUMBLE_CLAY_API_KEY') return 'hc_12345678901234567890123456789012';
            if (key === 'HUMBLE_CLAY_API_URL') return 'https://api.example.com';
            return null;
          })
        })
      };
      // Mock Logger
      global.Logger = {
        log: jest.fn()
      };
    });

    test('correctly formats schema in batch requests', () => {
      // Test schema
      const testSchema = {
        "type": "object",
        "properties": {
          "age": { "type": "number" }
        },
        "required": ["age"]
      };
      
      // Test input batch
      const batch = ["I'm 35 years old", "She is 28 years old"];
      
      // Call processBatch with schema
      processBatch(batch, { responseFormat: testSchema });
      
      // Get the call arguments from UrlFetchApp.fetch
      const fetchCall = UrlFetchApp.fetch.mock.calls[0];
      expect(fetchCall[0]).toBe('https://api.example.com/api/v1/prompts');
      
      // Parse the payload to verify format
      const payload = JSON.parse(fetchCall[1].payload);
      
      // Verify the payload structure
      expect(payload).toHaveProperty('prompts');
      expect(Array.isArray(payload.prompts)).toBe(true);
      expect(payload.prompts.length).toBe(2);
      
      // Check both prompt requests have proper schema format
      payload.prompts.forEach(promptRequest => {
        expect(promptRequest).toHaveProperty('response_format');
        expect(promptRequest.response_format).toHaveProperty('type', 'json_schema');
        expect(promptRequest.response_format).toHaveProperty('json_schema');
        expect(promptRequest.response_format.json_schema).toHaveProperty('name', 'DynamicSchema');
        expect(promptRequest.response_format.json_schema).toHaveProperty('schema');
        expect(promptRequest.response_format.json_schema.schema).toEqual(testSchema);
      });
    });

    test('should process batch with schema and field path options', () => {
      // Test setup
      resetAllMocks();
      
      // Prepare test options
      const options = {
        responseFormat: {
          type: 'object',
          properties: {
            name: { type: 'string' }
          }
        },
        extractFieldPath: 'name'
      };
      
      // Expected schema format passed to the API
      const expectedSchema = {
        type: "json_schema",
        json_schema: {
          name: "DynamicSchema",
          schema: options.responseFormat
        }
      };
      
      // Expected prompts in the request
      const expectedPrompts = [
        {
          prompt: 'input1',
          response_format: expectedSchema,
          extract_field_path: 'name'
        },
        {
          prompt: 'input2',
          response_format: expectedSchema,
          extract_field_path: 'name'
        }
      ];
      
      // Mock services
      UrlFetchApp.fetch.mockReturnValue({
        getResponseCode: jest.fn().mockReturnValue(200),
        getContentText: jest.fn().mockReturnValue('{"responses":[{"status":"success","response":"test1"},{"status":"success","response":"test2"}]}')
      });
      
      PropertiesService.getScriptProperties().getProperty.mockImplementation((key) => {
        if (key === 'HUMBLE_CLAY_API_KEY') return 'hc_1234567890abcdef1234567890abcdef';
        if (key === 'HUMBLE_CLAY_API_URL') return 'https://api.example.com';
        return null;
      });
      
      // Call the batch function
      const result = processBatch(['input1', 'input2'], options);
      
      // Verify - using objectContaining to allow for system_prompt addition
      expect(UrlFetchApp.fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/prompts',
        expect.objectContaining({
          payload: expect.stringContaining('"prompts":[{')
        })
      );
      
      // Verify the request payload was properly formatted
      const actualPayload = JSON.parse(UrlFetchApp.fetch.mock.calls[0][1].payload);
      expect(actualPayload).toHaveProperty('prompts');
      expect(actualPayload.prompts).toHaveLength(2);
      
      // Check first prompt properties
      expect(actualPayload.prompts[0]).toMatchObject({
        prompt: 'input1',
        response_format: expectedSchema,
        extract_field_path: 'name'
      });
      
      // Check second prompt properties
      expect(actualPayload.prompts[1]).toMatchObject({
        prompt: 'input2',
        response_format: expectedSchema,
        extract_field_path: 'name'
      });
      
      // Verify system_prompt is not included
      expect(actualPayload.prompts[0]).not.toHaveProperty('system_prompt');
      expect(actualPayload.prompts[1]).not.toHaveProperty('system_prompt');
      
      // Verify result
      expect(result).toEqual(['test1', 'test2']);
    });
    
    test('should integrate with SimpleOutputField to generate schema and field path', () => {
      // Test setup
      resetAllMocks();
      
      // Mock parseSimpleSyntax to return parsed syntax
      global.parseSimpleSyntax = jest.fn().mockReturnValue({
        fieldName: 'age',
        fieldType: 'integer'
      });
      
      // Mock generateSchemaFromSyntax to return schema
      global.generateSchemaFromSyntax = jest.fn().mockReturnValue({
        type: 'object',
        properties: {
          age: { type: 'integer' }
        }
      });
      
      // Mock extractFieldPathFromSyntax to return field path
      global.extractFieldPathFromSyntax = jest.fn().mockReturnValue('age');
      
      // Mock UrlFetchApp response
      UrlFetchApp.fetch.mockReturnValue({
        getResponseCode: jest.fn().mockReturnValue(200),
        getContentText: jest.fn().mockReturnValue('{"responses":[{"status":"success","response":"42"}]}')
      });
      
      // Mock PropertiesService
      PropertiesService.getScriptProperties().getProperty.mockImplementation((key) => {
        if (key === 'HUMBLE_CLAY_API_KEY') return 'hc_1234567890abcdef1234567890abcdef';
        if (key === 'HUMBLE_CLAY_API_URL') return 'https://api.example.com';
        return null;
      });
      
      // Manually convert simple field to options
      const simpleField = 'age: int';
      const parsedSyntax = parseSimpleSyntax(simpleField);
      const schema = generateSchemaFromSyntax(parsedSyntax);
      const fieldPath = extractFieldPathFromSyntax(parsedSyntax);
      
      const options = {
        responseFormat: schema,
        extractFieldPath: fieldPath
      };
      
      // Call process batch with the generated options
      const result = processBatch(['I am 42 years old'], options);
      
      // Expected wrapped schema format
      const expectedSchema = {
        type: "json_schema",
        json_schema: {
          name: "DynamicSchema",
          schema: schema
        }
      };
      
      // Verify - using a more flexible check for the request payload
      expect(UrlFetchApp.fetch).toHaveBeenCalledWith(
        'https://api.example.com/api/v1/prompts',
        expect.objectContaining({
          payload: expect.stringContaining('I am 42 years old')
        })
      );
      
      // Parse the actual payload and verify its contents
      const actualPayload = JSON.parse(UrlFetchApp.fetch.mock.calls[0][1].payload);
      expect(actualPayload).toHaveProperty('prompts');
      expect(actualPayload.prompts).toHaveLength(1);
      expect(actualPayload.prompts[0]).toMatchObject({
        prompt: 'I am 42 years old',
        response_format: expectedSchema,
        extract_field_path: 'age'
      });
      
      // Check that system_prompt is not present
      expect(actualPayload.prompts[0]).not.toHaveProperty('system_prompt');
      
      // Verify result
      expect(result).toEqual(['42']);
    });
  });
}); 