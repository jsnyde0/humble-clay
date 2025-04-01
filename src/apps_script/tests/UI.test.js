const { jest, describe, test, expect } = require('@jest/globals');
const UI = require('../src/UI');

describe('UI', () => {
  describe('showSidebar', () => {
    test('creates and shows sidebar with correct settings', () => {
      const mockHtmlOutput = {
        setTitle: jest.fn().mockReturnThis(),
        setWidth: jest.fn().mockReturnThis()
      };

      const mockUi = {
        showSidebar: jest.fn()
      };

      // Mock HtmlService
      global.HtmlService = {
        createHtmlOutputFromFile: jest.fn().mockReturnValue(mockHtmlOutput)
      };

      // Mock SpreadsheetApp.getUi()
      global.SpreadsheetApp.getUi.mockReturnValue(mockUi);

      // Call the method
      UI.showSidebar();

      // Verify HTML creation
      expect(HtmlService.createHtmlOutputFromFile).toHaveBeenCalledWith('Sidebar');
      expect(mockHtmlOutput.setTitle).toHaveBeenCalledWith('Humble Clay');
      expect(mockHtmlOutput.setWidth).toHaveBeenCalledWith(300);

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
      global.SpreadsheetApp.getUi.mockReturnValue(mockUi);

      // Call the method
      UI.createMenu();

      // Verify menu creation
      expect(mockUi.createMenu).toHaveBeenCalledWith('Humble Clay');
      expect(mockMenu.addItem).toHaveBeenCalledWith('Open Sidebar', 'showSidebar');
      expect(mockMenu.addSeparator).toHaveBeenCalled();
      expect(mockMenu.addItem).toHaveBeenCalledWith('Configure API', 'showApiConfig');
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
      global.SpreadsheetApp.getUi.mockReturnValue(mockUi);

      // Call the method
      const errorMessage = 'Test error message';
      UI.showError(errorMessage);

      // Verify error display
      expect(mockUi.alert).toHaveBeenCalledWith('Error', errorMessage, mockUi.ButtonSet.OK);
    });
  });
}); 