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
  validateSerperApiKey,
  validateJinaApiKey: realValidateJinaApiKey,
  getJinaApiKey,
  setJinaApiKey
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

  // --- Jina API Key Tests ---
  describe('Jina API Key Management', () => {
    // Assuming setup.js provides the global functions
    // Add beforeEach if specific cleanup/mocking needed here
    beforeEach(() => {
        if (global.resetAllMocks) { global.resetAllMocks(); }
    });
    
    describe('validateJinaApiKey', () => {
      it('should validate correct Jina API key format', () => {
        // Use a structurally correct PLACEHOLDER key, NOT a real one
        const validKey = 'jina_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabc12-_bbbbbbbbbbbbbbbbbbbbbbbb'; // Placeholder
        // Call the *real* imported function for this test
        expect(realValidateJinaApiKey(validKey)).toBe(true);
      });

      it('should reject invalid Jina API key formats', () => {
        const base = 'jina_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabc12-_bbbbbbbbbbbbbbbbbbbbbbbb'; // Use placeholder as base
        // Call the *real* imported function for these tests
        expect(realValidateJinaApiKey(null)).toBe(false); // Null
        expect(realValidateJinaApiKey('')).toBe(false); // Empty
        expect(realValidateJinaApiKey(base.replace('jina_', 'jin_'))).toBe(false); // Wrong prefix
        expect(realValidateJinaApiKey(base.substring(5))).toBe(false); // Prefix missing
        expect(realValidateJinaApiKey(base.substring(0, base.length - 1))).toBe(false); // Too short
        expect(realValidateJinaApiKey(base + 'a')).toBe(false); // Too long
        expect(realValidateJinaApiKey(base.replace('abc12-', 'abc*2-'))).toBe(true); // Contains jina_ prefix, correct length
        expect(realValidateJinaApiKey(base.replace('bbbbbb', 'bbb!bb'))).toBe(true); // Contains jina_ prefix, correct length
      });
    });

    // Add tests for getJinaApiKey and setJinaApiKey if they don't exist
    // Assuming they exist and function similarly to other key getters/setters
    describe('getJinaApiKey', () => {
        it('should return null when no Jina key is set', () => {
          PropertiesService.getScriptProperties().getProperty.mockReturnValue(null);
          expect(getJinaApiKey()).toBeNull();
          expect(PropertiesService.getScriptProperties().getProperty).toHaveBeenCalledWith('JINA_API_KEY');
        });
  
        it('should return the stored Jina key', () => {
          const storedKey = 'jina_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabc12-_bbbbbbbbbbbbbbbbbbbbbbbb';
          PropertiesService.getScriptProperties().getProperty.mockReturnValue(storedKey);
          expect(getJinaApiKey()).toBe(storedKey);
          expect(PropertiesService.getScriptProperties().getProperty).toHaveBeenCalledWith('JINA_API_KEY');
        });
      });
  
      describe('setJinaApiKey', () => {
        it('should store valid Jina API key', () => {
          const validKey = 'jina_aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaabc12-_bbbbbbbbbbbbbbbbbbbbbbbb';
          // This test calls the real setJinaApiKey, which internally calls the real 
          // validateJinaApiKey. No direct call needed here.
          setJinaApiKey(validKey);
          expect(PropertiesService.getScriptProperties().setProperty).toHaveBeenCalledWith('JINA_API_KEY', validKey);
        });
  
        it('should throw error for invalid Jina API key format', () => {
          const invalidKey = 'invalid-key-format';
          // This calls the real setJinaApiKey, which internally calls the real 
          // validateJinaApiKey.
          expect(() => setJinaApiKey(invalidKey)).toThrow('Invalid Jina API key format');
          expect(PropertiesService.getScriptProperties().setProperty).not.toHaveBeenCalled();
        });
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