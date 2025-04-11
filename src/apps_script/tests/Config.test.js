/**
 * Tests for Config.js module
 */

// Import the module to test
const {
  getApiKey,
  setApiKey,
  showConfigDialog,
  isConfigured,
  validateConfig,
  validateApiKey
} = require('../src/Config.js');

describe('Config', () => {
  beforeEach(() => {
    // Reset all mocks
    resetAllMocks();
    
    // Set up mocks for specific tests
    PropertiesService.getScriptProperties().getProperty.mockImplementation(key => {
      if (key === 'HUMBLE_CLAY_API_KEY') return null;
      return null;
    });
  });

  describe('getApiKey', () => {
    it('should return null when no API key is set', () => {
      PropertiesService.getScriptProperties().getProperty.mockReturnValue(null);
      expect(getApiKey()).toBeNull();
      expect(PropertiesService.getScriptProperties().getProperty).toHaveBeenCalledWith('HUMBLE_CLAY_API_KEY');
    });

    it('should return the stored API key', () => {
      const testKey = 'hc_1234567890abcdef1234567890abcdef';
      PropertiesService.getScriptProperties().getProperty.mockReturnValue(testKey);
      expect(getApiKey()).toBe(testKey);
    });
  });

  describe('setApiKey', () => {
    it('should store valid API key', () => {
      const validKey = 'hc_1234567890abcdef1234567890abcdef';
      setApiKey(validKey);
      expect(PropertiesService.getScriptProperties().setProperty).toHaveBeenCalledWith('HUMBLE_CLAY_API_KEY', validKey);
    });

    it('should throw error for invalid API key format', () => {
      const invalidKey = 'invalid_key'; // This is too short to pass validation
      expect(() => setApiKey(invalidKey)).toThrow('Invalid API key format');
    });
  });

  describe('isConfigured', () => {
    it('should return true when API key is configured', () => {
      PropertiesService.getScriptProperties().getProperty.mockReturnValue('hc_1234567890abcdef1234567890abcdef');
      expect(isConfigured()).toBe(true);
    });

    it('should return false when API key is not configured', () => {
      PropertiesService.getScriptProperties().getProperty.mockReturnValue(null);
      expect(isConfigured()).toBe(false);
    });

    it('should return false when API key is empty string', () => {
      PropertiesService.getScriptProperties().getProperty.mockReturnValue('');
      expect(isConfigured()).toBe(false);
    });
  });

  describe('validateConfig', () => {
    it('should return valid status for properly configured API key', () => {
      const validKey = 'hc_1234567890abcdef1234567890abcdef';
      PropertiesService.getScriptProperties().getProperty.mockReturnValue(validKey);
      
      const result = validateConfig();
      expect(result).toEqual({
        isValid: true,
        message: 'Configuration is valid'
      });
    });

    it('should return invalid status when API key is not configured', () => {
      PropertiesService.getScriptProperties().getProperty.mockReturnValue(null);
      
      const result = validateConfig();
      expect(result).toEqual({
        isValid: false,
        message: 'API key not configured'
      });
    });

    it('should return invalid status for malformed API key', () => {
      PropertiesService.getScriptProperties().getProperty.mockReturnValue('invalid_key');
      
      const result = validateConfig();
      expect(result).toEqual({
        isValid: false,
        message: 'Invalid API key format'
      });
    });
  });

  describe('showConfigDialog', () => {
    it('should create and show modal dialog', () => {
      // Set up mocks for HTML Service
      const mockHtmlOutput = {
        setWidth: jest.fn().mockReturnThis(),
        setHeight: jest.fn().mockReturnThis(),
        setTitle: jest.fn().mockReturnThis()
      };
      
      HtmlService.createHtmlOutput = jest.fn().mockReturnValue(mockHtmlOutput);
      
      const mockUi = {
        showModalDialog: jest.fn()
      };
      
      SpreadsheetApp.getUi.mockReturnValue(mockUi);
      
      // Call the function
      showConfigDialog();
      
      // Verify expectations
      expect(HtmlService.createHtmlOutput).toHaveBeenCalled();
      expect(mockHtmlOutput.setWidth).toHaveBeenCalledWith(400);
      expect(mockHtmlOutput.setHeight).toHaveBeenCalledWith(380);
      expect(mockUi.showModalDialog).toHaveBeenCalled();
    });
  });
}); 