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
  validateApiKey,
  getSerperApiKey,
  setSerperApiKey,
  validateSerperApiKey
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

  // --- Serper API Key Tests ---
  describe('Serper API Key Management', () => {
    beforeEach(() => {
      // Reset PropertiesService mock before each test
      PropertiesService.getScriptProperties().getProperty.mockClear();
      PropertiesService.getScriptProperties().setProperty.mockClear();
      // Clear the underlying mock storage if necessary (depends on setup.js)
      // If scriptProperties is global in setup.js, clear it: 
      // Object.keys(scriptProperties).forEach(key => delete scriptProperties[key]);
      // Or ensure resetAllMocks() handles it.
      if (global.resetAllMocks) { resetAllMocks(); }
    });

    describe('validateSerperApiKey', () => {
      it('should validate correct Serper API key format', () => {
        const validKey = 'a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2c3d4e5f6a1b2';
        expect(validateSerperApiKey(validKey)).toBe(true);
      });

      it('should reject invalid Serper API key formats', () => {
        expect(validateSerperApiKey(null)).toBe(false);
        expect(validateSerperApiKey(123)).toBe(false);
        expect(validateSerperApiKey('')).toBe(false);
        expect(validateSerperApiKey('shortkey')).toBe(false);
        expect(validateSerperApiKey('g'.repeat(64))).toBe(false); // Invalid hex
        expect(validateSerperApiKey('a'.repeat(65))).toBe(false); // Too long
      });
    });

    describe('getSerperApiKey', () => {
      it('should return null when no Serper key is set', () => {
        PropertiesService.getScriptProperties().getProperty.mockReturnValue(null);
        expect(getSerperApiKey()).toBeNull();
        expect(PropertiesService.getScriptProperties().getProperty).toHaveBeenCalledWith('SERPER_API_KEY');
      });

      it('should return the stored Serper key', () => {
        const storedKey = 'f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2d3c4b5a6f1e2';
        PropertiesService.getScriptProperties().getProperty.mockReturnValue(storedKey);
        expect(getSerperApiKey()).toBe(storedKey);
        expect(PropertiesService.getScriptProperties().getProperty).toHaveBeenCalledWith('SERPER_API_KEY');
      });
    });

    describe('setSerperApiKey', () => {
      it('should store valid Serper API key', () => {
        const validKey = 'c1d2e3f4a5b6c1d2e3f4a5b6c1d2e3f4a5b6c1d2e3f4a5b6c1d2e3f4a5b6c1d2';
        setSerperApiKey(validKey);
        expect(PropertiesService.getScriptProperties().setProperty).toHaveBeenCalledWith('SERPER_API_KEY', validKey);
      });

      it('should throw error for invalid Serper API key format', () => {
        const invalidKey = 'invalid-key-format';
        expect(() => setSerperApiKey(invalidKey)).toThrow('Invalid Serper API key format');
        expect(PropertiesService.getScriptProperties().setProperty).not.toHaveBeenCalled();
      });
    });
  });
}); 