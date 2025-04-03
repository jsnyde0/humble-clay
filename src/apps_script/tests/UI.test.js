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
        promptEditorInit: null,
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
      
      // Verify simple output field initialization
      expect(mockTemplate.simpleOutputFieldInit).toContain('var parseSimpleSyntax =');
      expect(mockTemplate.simpleOutputFieldInit).toContain('var generateSchemaFromSyntax =');
      expect(mockTemplate.simpleOutputFieldInit).toContain('var extractFieldPathFromSyntax =');
      
      // Verify prompt editor initialization
      expect(mockTemplate.promptEditorInit).toContain('function validatePromptTemplate');
      expect(mockTemplate.promptEditorInit).toContain('function validateRowRange');
      expect(mockTemplate.promptEditorInit).toContain('function updateStatusIndicator');
      
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

  describe('promptEditor', () => {
    test('validatePromptTemplate should validate prompt templates', () => {
      // Mock template with promptEditorInit
      const mockTemplate = {
        promptEditorInit: null,
        evaluate: jest.fn().mockReturnThis()
      };
      
      // Mock HtmlService
      HtmlService.createTemplateFromFile.mockReturnValue(mockTemplate);
      
      // Call showSidebarUI to initialize the promptEditorInit
      UI.showSidebarUI();
      
      // Extract validatePromptTemplate function from promptEditorInit
      const validatePromptTemplate = new Function(
        'return ' + mockTemplate.promptEditorInit.match(/function validatePromptTemplate\([^)]*\)[^}]*}/)[0]
      )();
      
      // Test cases
      expect(validatePromptTemplate('')).toBe(false); // Empty template
      expect(validatePromptTemplate('This has no column references')).toBe(false); // No references
      expect(validatePromptTemplate('Analyze {A}')).toBe(true); // Valid template
      expect(validatePromptTemplate('Compare {A} with {B}')).toBe(true); // Multiple columns
    });
    
    test('validateRowRange should validate row range inputs', () => {
      // Mock template with promptEditorInit
      const mockTemplate = {
        promptEditorInit: null,
        evaluate: jest.fn().mockReturnThis()
      };
      
      // Mock HtmlService
      HtmlService.createTemplateFromFile.mockReturnValue(mockTemplate);
      
      // Call showSidebarUI to initialize the promptEditorInit
      UI.showSidebarUI();
      
      // Extract validateRowRange function from promptEditorInit
      const validateRowRange = new Function(
        'return ' + mockTemplate.promptEditorInit.match(/function validateRowRange\([^)]*\)[^}]*}/)[0]
      )();
      
      // Test cases
      expect(validateRowRange('', '')).toBe(true); // Empty (use all rows)
      expect(validateRowRange('1', '10')).toBe(true); // Valid range
      expect(validateRowRange('5', '5')).toBe(true); // Single row
      expect(validateRowRange('10', '5')).toBe(false); // Start > End
      expect(validateRowRange('-1', '5')).toBe(false); // Negative start
      expect(validateRowRange('1', '-5')).toBe(false); // Negative end
      expect(validateRowRange('abc', '5')).toBe(false); // Non-numeric start
      expect(validateRowRange('1', 'xyz')).toBe(false); // Non-numeric end
    });
    
    test('updateStatusIndicator should update UI based on processing status', () => {
      // Mock template with promptEditorInit
      const mockTemplate = {
        promptEditorInit: null,
        evaluate: jest.fn().mockReturnThis()
      };
      
      // Mock HtmlService
      HtmlService.createTemplateFromFile.mockReturnValue(mockTemplate);
      
      // Call showSidebarUI to initialize the promptEditorInit
      UI.showSidebarUI();
      
      // Extract updateStatusIndicator function from promptEditorInit
      const updateStatusIndicator = new Function(
        'return ' + mockTemplate.promptEditorInit.match(/function updateStatusIndicator\([^)]*\)[^}]*}/)[0]
      )();
      
      // Mock document.getElementById
      const mockElements = {};
      global.document = {
        getElementById: jest.fn(id => {
          mockElements[id] = mockElements[id] || { style: {}, className: '' };
          return mockElements[id];
        })
      };
      
      // Test processing state
      updateStatusIndicator('processing');
      expect(mockElements['status-indicator'].className).toContain('processing');
      expect(mockElements['status-text'].textContent).toBe('Processing...');
      
      // Test success state
      updateStatusIndicator('success', 'Processed 5 rows');
      expect(mockElements['status-indicator'].className).toContain('success');
      expect(mockElements['status-text'].textContent).toBe('Processed 5 rows');
      
      // Test error state
      updateStatusIndicator('error', 'Failed to process');
      expect(mockElements['status-indicator'].className).toContain('error');
      expect(mockElements['status-text'].textContent).toBe('Failed to process');
    });
    
    test('validateColumnReferences should validate column references', () => {
      // Mock template with promptEditorInit
      const mockTemplate = {
        promptEditorInit: null,
        evaluate: jest.fn().mockReturnThis()
      };
      
      // Mock HtmlService
      HtmlService.createTemplateFromFile.mockReturnValue(mockTemplate);
      
      // Call showSidebarUI to initialize the promptEditorInit
      UI.showSidebarUI();
      
      // Extract validateColumnReferences function from promptEditorInit
      const validateColumnReferences = new Function(
        'return ' + mockTemplate.promptEditorInit.match(/function validateColumnReferences\([^)]*\)[^}]*}/)[0]
      )();
      
      // Mock the sheet's last column
      const mockSheet = {
        getLastColumn: jest.fn().mockReturnValue(3) // Sheet with cols A, B, C
      };
      SpreadsheetApp.getActiveSheet.mockReturnValue(mockSheet);
      
      // Convert column index to letter
      global.columnIndexToLetter = jest.fn(index => {
        return String.fromCharCode(64 + index); // 1 = A, 2 = B, 3 = C
      });
      
      // Test cases
      expect(validateColumnReferences(['A', 'B'])).toBe(true); // Valid columns
      expect(validateColumnReferences(['A', 'C'])).toBe(true); // Valid columns
      expect(validateColumnReferences(['D'])).toBe(false); // Column out of range
      expect(validateColumnReferences(['AA'])).toBe(false); // Column out of range
    });
  });
}); 