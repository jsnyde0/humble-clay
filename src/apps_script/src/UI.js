/**
 * UI management for the Google Sheets add-on
 */
class UI {
  /**
   * Creates and shows the sidebar
   */
  static showSidebar() {
    const html = HtmlService.createHtmlOutputFromFile('Sidebar')
      .setTitle('Range Processor')
      .setWidth(300);
    
    SpreadsheetApp.getUi().showSidebar(html);
  }

  /**
   * Creates the add-on menu
   */
  static createMenu() {
    const ui = SpreadsheetApp.getUi();
    ui.createMenu('Range Processor')
      .addItem('Open Sidebar', 'UI.showSidebar')
      .addToUi();
  }

  /**
   * Shows an error message in a modal dialog
   * @param {string} message - The error message to display
   */
  static showError(message) {
    const ui = SpreadsheetApp.getUi();
    ui.alert('Error', message, ui.ButtonSet.OK);
  }
}

// Export for use in Google Apps Script
if (typeof module !== 'undefined') {
  module.exports = UI;
} 