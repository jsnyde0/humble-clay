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
    beforeEach(() => {
      // Set up proper mock chain for HtmlService
      const mockHtml = {
        setTitle: jest.fn().mockReturnThis(),
        setWidth: jest.fn().mockReturnThis()
      };
      
      const mockTemplate = {
        promptEditorInit: null,
        simpleOutputFieldInit: null,
        evaluate: jest.fn().mockReturnValue(mockHtml)
      };
      
      HtmlService.createTemplateFromFile.mockReturnValue(mockTemplate);
      
      // Mock SpreadsheetApp UI
      const mockUi = {
        showSidebar: jest.fn()
      };
      SpreadsheetApp.getUi.mockReturnValue(mockUi);
    });

    test('validatePromptTemplate should validate prompt templates', () => {
      // Call showSidebarUI to initialize the promptEditorInit
      UI.showSidebarUI();
      
      // Get the mockTemplate after initialization
      const mockTemplate = HtmlService.createTemplateFromFile.mock.results[0].value;
      
      // Create a wrapper function to safely evaluate the client-side code
      function evalClientCode(code) {
        // Create safe environment
        const sandbox = {
          document: { getElementById: () => ({ className: '', textContent: '' }) },
          window: {},
          console: console
        };
        
        // Add the code to evaluate
        const fullCode = mockTemplate.promptEditorInit + '\n' + code;
        
        // Execute in context
        const wrappedCode = `
          with (sandbox) {
            ${fullCode}
            return { result };
          }
        `;
        
        return new Function('sandbox', wrappedCode)({ ...sandbox });
      }
      
      // Test empty template
      let evalResult = evalClientCode(`
        const result = validatePromptTemplate('');
      `);
      expect(evalResult.result).toBe(false);
      
      // Test no references
      evalResult = evalClientCode(`
        const result = validatePromptTemplate('This has no column references');
      `);
      expect(evalResult.result).toBe(false);
      
      // Test with single reference
      evalResult = evalClientCode(`
        const result = validatePromptTemplate('Analyze {A}');
      `);
      expect(evalResult.result).toBe(true);
      
      // Test with multiple references
      evalResult = evalClientCode(`
        const result = validatePromptTemplate('Compare {A} with {B}');
      `);
      expect(evalResult.result).toBe(true);
    });
    
    test('validateRowRange should validate row range inputs', () => {
      // Call showSidebarUI to initialize the promptEditorInit
      UI.showSidebarUI();
      
      // Get the mockTemplate after initialization
      const mockTemplate = HtmlService.createTemplateFromFile.mock.results[0].value;
      
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
      // Call showSidebarUI to initialize the promptEditorInit
      UI.showSidebarUI();
      
      // Get the mockTemplate after initialization
      const mockTemplate = HtmlService.createTemplateFromFile.mock.results[0].value;
      
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
      expect(mockElements['status-indicator'].className).toBe('status-indicator processing');
      expect(mockElements['status-text'].textContent).toBe('Processing...');
      
      // Test success state
      updateStatusIndicator('success', 'Processed 5 rows');
      expect(mockElements['status-indicator'].className).toBe('status-indicator success');
      expect(mockElements['status-text'].textContent).toBe('Processed 5 rows');
      
      // Test error state
      updateStatusIndicator('error', 'Failed to process');
      expect(mockElements['status-indicator'].className).toBe('status-indicator error');
      expect(mockElements['status-text'].textContent).toBe('Failed to process');
    });
    
    test('validateColumnReferences should validate column references', () => {
      // Call showSidebarUI to initialize the promptEditorInit
      UI.showSidebarUI();
      
      // Get the mockTemplate after initialization
      const mockTemplate = HtmlService.createTemplateFromFile.mock.results[0].value;
      
      // Extract validateColumnReferences function from promptEditorInit
      const validateColumnReferences = new Function(
        'return ' + mockTemplate.promptEditorInit.match(/function validateColumnReferences\([^)]*\)[^}]*}/)[0]
      )();
      
      // Mock extractColumnReferences
      global.extractColumnReferences = jest.fn(template => {
        if (template.includes('{A}')) return ['A'];
        if (template.includes('{123}')) return ['123'];
        return [];
      });
      
      // Test cases
      expect(validateColumnReferences('Test {A}')).toBe(true); // Valid column
      expect(validateColumnReferences('Test {123}')).toBe(false); // Invalid column
      expect(validateColumnReferences('No references')).toBe(true); // No references (empty array)
    });
  });
}); 