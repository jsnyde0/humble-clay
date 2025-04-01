/**
 * UI management for the Google Sheets add-on
 */

/**
 * Creates and shows the sidebar
 */
function showSidebarUI() {
  const html = HtmlService.createHtmlOutputFromFile('Sidebar')
    .setTitle('Humble Clay')
    .setWidth(300);
  
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * Creates the add-on menu
 */
function createMenu() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('Humble Clay')
    .addItem('Open Sidebar', 'showSidebar')
    .addSeparator()
    .addItem('Configure API', 'showConfigDialog')
    .addItem('Validate API Configuration', 'validateApiConfig')
    .addToUi();
}

/**
 * Shows the API configuration dialog
 * @param {string} currentApiKey - Current API key value
 * @param {string} currentApiUrl - Current API URL value
 * @returns {Object} Dialog result with buttonClicked and values
 */
function showApiConfigDialog(currentApiKey, currentApiUrl) {
  const ui = SpreadsheetApp.getUi();
  
  // Create the dialog HTML
  const html = `
    <div style="padding: 10px;">
      <style>
        .form-group { margin-bottom: 15px; }
        label { display: block; margin-bottom: 5px; }
        input { width: 100%; padding: 5px; }
        .hint { font-size: 0.8em; color: #666; margin-top: 3px; }
      </style>
      <div class="form-group">
        <label for="apiKey">API Key:</label>
        <input type="password" id="apiKey" value="${currentApiKey}" />
        <div class="hint">Your Humble Clay API key</div>
      </div>
      <div class="form-group">
        <label for="apiUrl">API URL:</label>
        <input type="text" id="apiUrl" value="${currentApiUrl}" />
        <div class="hint">Example: https://api.example.com</div>
      </div>
    </div>
  `;

  // Show the dialog
  const result = ui.showModalDialog(
    HtmlService.createHtmlOutput(html)
      .setWidth(400)
      .setHeight(200),
    'API Configuration'
  );

  return result;
}

/**
 * Shows an error message in a modal dialog
 * @param {string} message - The error message to display
 */
function showError(message) {
  const ui = SpreadsheetApp.getUi();
  ui.alert('Error', message, ui.ButtonSet.OK);
}

/**
 * Shows a success message in a modal dialog
 * @param {string} message - The message to display
 */
function showMessage(message) {
  const ui = SpreadsheetApp.getUi();
  ui.alert('Success', message, ui.ButtonSet.OK);
}

// Only export for tests
if (typeof module !== 'undefined') {
  module.exports = {
    showSidebarUI,
    createMenu,
    showApiConfigDialog,
    showError,
    showMessage
  };
} 