/**
 * Tests for UI.js
 */

// Import the module to test
const UI = require('../src/UI');

describe('UI', () => {
  beforeEach(() => {
    // Reset all mocks before each test
    resetAllMocks();
    
    // Mock SimpleOutputField functions
    global.parseSimpleSyntax = jest.fn();
    global.generateSchemaFromSyntax = jest.fn();
    global.extractFieldPathFromSyntax = jest.fn();
  });
  
  describe('showSidebar', () => {
    test('creates and shows sidebar with correct settings', () => {
      const mockTemplate = {
        simpleOutputFieldInit: null,
        evaluate: jest.fn().mockReturnValue({
          setTitle: jest.fn().mockReturnThis(),
          setWidth: jest.fn().mockReturnThis()
        })
      };

      const mockUi = {
        showSidebar: jest.fn()
      };

      // Mock HtmlService
      HtmlService.createTemplateFromFile.mockReturnValue(mockTemplate);

      // Mock SpreadsheetApp.getUi()
      SpreadsheetApp.getUi.mockReturnValue(mockUi);

      // Call the method
      UI.showSidebarUI();

      // Verify template creation and function assignment
      expect(HtmlService.createTemplateFromFile).toHaveBeenCalledWith('Sidebar');
      expect(mockTemplate.simpleOutputFieldInit).toContain('var parseSimpleSyntax =');
      expect(mockTemplate.simpleOutputFieldInit).toContain('var generateSchemaFromSyntax =');
      expect(mockTemplate.simpleOutputFieldInit).toContain('var extractFieldPathFromSyntax =');
      
      // Verify HTML settings
      const evaluatedTemplate = mockTemplate.evaluate();
      expect(evaluatedTemplate.setTitle).toHaveBeenCalledWith('Humble Clay');
      expect(evaluatedTemplate.setWidth).toHaveBeenCalledWith(300);

      // Verify sidebar display
      expect(mockUi.showSidebar).toHaveBeenCalled();
    });
  });

  describe('createMenu', () => {
    test('creates menu with correct items', () => {
      const mockMenu = {
        addItem: jest.fn().mockReturnThis(),
        addSeparator: jest.fn().mockReturnThis(),
        addToUi: jest.fn()
      };

      const mockUi = {
        createMenu: jest.fn().mockReturnValue(mockMenu)
      };

      // Mock SpreadsheetApp.getUi()
      SpreadsheetApp.getUi.mockReturnValue(mockUi);

      // Call the method
      UI.createMenu();

      // Verify menu creation
      expect(mockUi.createMenu).toHaveBeenCalledWith('Humble Clay');
      expect(mockMenu.addItem).toHaveBeenCalledWith('Open Sidebar', 'showSidebar');
      expect(mockMenu.addSeparator).toHaveBeenCalled();
      expect(mockMenu.addItem).toHaveBeenCalledWith('Configure API', 'showConfigDialog');
      expect(mockMenu.addItem).toHaveBeenCalledWith('Validate API Configuration', 'validateApiConfig');
      expect(mockMenu.addToUi).toHaveBeenCalled();
    });
  });

  describe('showError', () => {
    test('shows error message in modal dialog', () => {
      const mockUi = {
        alert: jest.fn(),
        ButtonSet: {
          OK: 'OK'
        }
      };

      // Mock SpreadsheetApp.getUi()
      SpreadsheetApp.getUi.mockReturnValue(mockUi);

      // Call the method
      const errorMessage = 'Test error message';
      UI.showError(errorMessage);

      // Verify error display
      expect(mockUi.alert).toHaveBeenCalledWith('Error', errorMessage, mockUi.ButtonSet.OK);
    });
  });
  
  describe('showMessage', () => {
    test('shows information message in modal dialog', () => {
      const mockUi = {
        alert: jest.fn(),
        ButtonSet: {
          OK: 'OK'
        }
      };

      // Mock SpreadsheetApp.getUi()
      SpreadsheetApp.getUi.mockReturnValue(mockUi);

      // Call the method
      const infoMessage = 'Test info message';
      UI.showMessage(infoMessage);

      // Verify message display
      expect(mockUi.alert).toHaveBeenCalledWith('Success', infoMessage, mockUi.ButtonSet.OK);
    });
  });
}); 