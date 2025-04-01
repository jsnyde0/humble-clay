/**
 * Tests for Config.js module
 */

const {
  getApiKey,
  setApiKey,
  showConfigDialog,
  isConfigured,
  validateConfig,
  validateApiKey
} = require('../src/Config.js');

describe('Config', () => {
  let mockScriptProperties;
  
  beforeEach(() => {
    // Mock PropertiesService
    mockScriptProperties = {
      getProperty: jest.fn(),
      setProperty: jest.fn()
    };
    
    global.PropertiesService = {
      getScriptProperties: () => mockScriptProperties
    };

    // Mock SpreadsheetApp.getUi() for dialog tests
    global.SpreadsheetApp = {
      getUi: jest.fn().mockReturnValue({
        showModalDialog: jest.fn()
      })
    };

    // Mock HtmlService for dialog creation
    global.HtmlService = {
      createHtmlOutput: jest.fn().mockReturnValue({
        setWidth: jest.fn().mockReturnThis(),
        setHeight: jest.fn().mockReturnThis(),
        setTitle: jest.fn().mockReturnThis()
      })
    };
  });

  describe('getApiKey', () => {
    it('should return null when no API key is set', () => {
      mockScriptProperties.getProperty.mockReturnValue(null);
      expect(getApiKey()).toBeNull();
      expect(mockScriptProperties.getProperty).toHaveBeenCalledWith('HUMBLE_CLAY_API_KEY');
    });

    it('should return the stored API key', () => {
      const testKey = 'hc_1234567890abcdef1234567890abcdef';
      mockScriptProperties.getProperty.mockReturnValue(testKey);
      expect(getApiKey()).toBe(testKey);
    });
  });

  describe('setApiKey', () => {
    it('should store valid API key', () => {
      const validKey = 'hc_1234567890abcdef1234567890abcdef';
      setApiKey(validKey);
      expect(mockScriptProperties.setProperty).toHaveBeenCalledWith('HUMBLE_CLAY_API_KEY', validKey);
    });

    it('should throw error for invalid API key format', () => {
      const invalidKeys = [
        'invalid_key',
        'hc_short',
        'hc_' + 'a'.repeat(33), // Too long
        null,
        undefined,
        123
      ];

      invalidKeys.forEach(key => {
        expect(() => setApiKey(key)).toThrow('Invalid API key format');
      });
    });
  });

  describe('isConfigured', () => {
    it('should return true when API key is configured', () => {
      mockScriptProperties.getProperty.mockReturnValue('hc_1234567890abcdef1234567890abcdef');
      expect(isConfigured()).toBe(true);
    });

    it('should return false when API key is not configured', () => {
      mockScriptProperties.getProperty.mockReturnValue(null);
      expect(isConfigured()).toBe(false);
    });

    it('should return false when API key is empty string', () => {
      mockScriptProperties.getProperty.mockReturnValue('');
      expect(isConfigured()).toBe(false);
    });
  });

  describe('validateConfig', () => {
    it('should return valid status for properly configured API key', () => {
      const validKey = 'hc_1234567890abcdef1234567890abcdef';
      mockScriptProperties.getProperty.mockReturnValue(validKey);
      
      const result = validateConfig();
      expect(result).toEqual({
        isValid: true,
        message: 'Configuration is valid'
      });
    });

    it('should return invalid status when API key is not configured', () => {
      mockScriptProperties.getProperty.mockReturnValue(null);
      
      const result = validateConfig();
      expect(result).toEqual({
        isValid: false,
        message: 'API key not configured'
      });
    });

    it('should return invalid status for malformed API key', () => {
      mockScriptProperties.getProperty.mockReturnValue('invalid_key');
      
      const result = validateConfig();
      expect(result).toEqual({
        isValid: false,
        message: 'Invalid API key format'
      });
    });
  });

  describe('showConfigDialog', () => {
    it('should create and show modal dialog', () => {
      showConfigDialog();
      
      expect(HtmlService.createHtmlOutput).toHaveBeenCalled();
      expect(SpreadsheetApp.getUi).toHaveBeenCalled();
      expect(SpreadsheetApp.getUi().showModalDialog).toHaveBeenCalled();
    });
  });
}); 