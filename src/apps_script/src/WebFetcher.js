/**
 * Fetches the HTML content of a given URL.
 *
 * @param {string} url The URL of the web page to fetch.
 * @return {string} The HTML content of the page, or null if an error occurs.
 * @customfunction
 */
function fetchWebPageContent(url) {
  if (!url) {
    Logger.log('URL parameter is required.');
    return null;
  }

  try {
    const response = UrlFetchApp.fetch(url, {
      muteHttpExceptions: true // Prevents script failure on HTTP errors (like 404)
    });
    
    const responseCode = response.getResponseCode();
    const content = response.getContentText();

    if (responseCode === 200) {
      Logger.log(`Successfully fetched content from ${url}`);
      return content;
    } else {
      Logger.log(`Failed to fetch ${url}. Response code: ${responseCode}. Content: ${content}`);
      return null; // Or perhaps return an error object/message
    }
  } catch (error) {
    Logger.log(`Error fetching URL ${url}: ${error}`);
    return null; // Indicate failure
  }
}

/**
 * Converts basic HTML tags to Markdown after cleaning non-essential tags.
 * WARNING: This is a very simplistic converter and will not handle
 * complex HTML structures, nested tags improperly, or many common tags.
 *
 * @param {string} html The HTML content string.
 * @return {string} The converted Markdown string.
 */
function convertHtmlToBasicMarkdown(html) {
  if (!html) {
    return '';
  }

  let cleanHtml = html;

  // 1. Attempt to isolate body content (case-insensitive)
  const bodyMatch = cleanHtml.match(/<body[^>]*>([\s\S]*)<\/body>/i);
  if (bodyMatch && bodyMatch[1]) {
    cleanHtml = bodyMatch[1];
    Logger.log('Extracted content within <body> tags.');
  } else {
    Logger.log('Could not find specific <body> tags, processing whole input.');
    // If no body tag found, proceed with the whole HTML, but still strip script/style
  }

  // 2. Strip <script> blocks (including content) - crucial to do early
  cleanHtml = cleanHtml.replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '');
  
  // 3. Strip <style> blocks (including content) - crucial to do early
  cleanHtml = cleanHtml.replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '');

  // 4. Strip HTML comments
  cleanHtml = cleanHtml.replace(/<!--[\s\S]*?-->/g, '');

  // --- Now perform the Markdown conversion on the cleaned HTML ---
  let markdown = cleanHtml;

  // Basic replacements - order can matter
  
  // Block elements (with newlines)
  markdown = markdown.replace(/<h1[^>]*>(.*?)<\/h1>/gi, '\n# $1\n');
  markdown = markdown.replace(/<h2[^>]*>(.*?)<\/h2>/gi, '\n## $1\n');
  markdown = markdown.replace(/<h3[^>]*>(.*?)<\/h3>/gi, '\n### $1\n');
  markdown = markdown.replace(/<h4[^>]*>(.*?)<\/h4>/gi, '\n#### $1\n');
  markdown = markdown.replace(/<h5[^>]*>(.*?)<\/h5>/gi, '\n##### $1\n');
  markdown = markdown.replace(/<h6[^>]*>(.*?)<\/h6>/gi, '\n###### $1\n');
  markdown = markdown.replace(/<p[^>]*>(.*?)<\/p>/gi, '\n$1\n');
  markdown = markdown.replace(/<li[^>]*>(.*?)<\/li>/gi, '\n* $1'); // List items
  markdown = markdown.replace(/<ul[^>]*>/gi, '\n'); // Remove <ul> tags but add newline
  markdown = markdown.replace(/<\/ul>/gi, '\n');
  markdown = markdown.replace(/<ol[^>]*>/gi, '\n'); // Remove <ol> tags but add newline
  markdown = markdown.replace(/<\/ol>/gi, '\n');
  markdown = markdown.replace(/<br\s*\/?>/gi, '\n'); // Line breaks

  // Inline elements
  markdown = markdown.replace(/<a[^>]*href="([^"]*)"[^>]*>(.*?)<\/a>/gi, '[$2]($1)');
  markdown = markdown.replace(/<strong[^>]*>(.*?)<\/strong>/gi, '**$1**');
  markdown = markdown.replace(/<b[^>]*>(.*?)<\/b>/gi, '**$1**');
  markdown = markdown.replace(/<em[^>]*>(.*?)<\/em>/gi, '*$1*');
  markdown = markdown.replace(/<i[^>]*>(.*?)<\/i>/gi, '*$1*');

  // Strip remaining HTML tags AFTER specific conversions
  markdown = markdown.replace(/<[^>]+>/g, '');

  // Clean up extra whitespace/newlines
  markdown = markdown.replace(/(\n\s*){3,}/g, '\n\n'); // Replace 3+ newlines with 2
  markdown = markdown.trim(); // Remove leading/trailing whitespace

  return markdown;
}


/**
 * Fetches the content of a given URL and attempts to convert it to basic Markdown.
 *
 * @param {string} url The URL of the web page to fetch.
 * @return {string} The converted Markdown content, or null if fetching fails.
 * @customfunction
 */
function fetchWebPageAsMarkdown(url) {
  const htmlContent = fetchWebPageContent(url);
  
  if (htmlContent) {
    Logger.log(`Converting HTML from ${url} to Markdown.`);
    const markdownContent = convertHtmlToBasicMarkdown(htmlContent);
    Logger.log(`Conversion complete for ${url}.`);
    return markdownContent;
  } else {
    Logger.log(`Could not fetch content from ${url} to convert to Markdown.`);
    return null; // Fetching failed
  }
}

/**
 * Fetches the Markdown content of a given URL using the Jina Reader API.
 * See: https://jina.ai/reader/
 *
 * @param {string} targetUrl The original URL of the web page to fetch and convert.
 * @return {string} The Markdown content from Jina Reader, or null if an error occurs.
 * @customfunction
 */
function fetchWebPageAsMarkdownJina(targetUrl) {
  if (!targetUrl) {
    Logger.log('Target URL parameter is required for Jina Reader.');
    return null;
  }

  // Construct the Jina Reader API URL
  const jinaReaderUrl = `https://r.jina.ai/${targetUrl}`;
  Logger.log(`Using Jina Reader API: ${jinaReaderUrl}`);

  try {
    // Retrieve Jina API Key using Config module
    const jinaApiKey = getJinaApiKey(); // Use the function from Config.js
    Logger.log(jinaApiKey ? 'Jina API Key found.' : 'Jina API Key not found.');

    const options = {
      muteHttpExceptions: true, 
      method: 'get',
      headers: {
        // Conditionally add the API key header if it exists
        ...(jinaApiKey && { 'X-API-Key': jinaApiKey }) 
      }
    };
    
    const response = UrlFetchApp.fetch(jinaReaderUrl, options);
    const responseCode = response.getResponseCode();
    const content = response.getContentText(); // Jina Reader returns Markdown/text directly

    if (responseCode === 200) {
      Logger.log(`Successfully fetched and converted content from ${targetUrl} via Jina Reader.`);
      // The content *should* already be Markdown, but check for the character limit
      // If using as a custom function, truncation might still be needed
      const LIMIT = 49900; // Stay safely below 50k for custom functions
      if (content && content.length > LIMIT) {
         Logger.log(`Jina Reader content exceeded limit (${content.length} chars). Truncating.`);
         const lastSpace = content.lastIndexOf(' ', LIMIT);
         const truncatedContent = (lastSpace > 0) ? content.substring(0, lastSpace) + '...' : content.substring(0, LIMIT) + '...';
         return truncatedContent;
      }
      return content; 
    } else {
      Logger.log(`Jina Reader failed for ${targetUrl}. Response code: ${responseCode}. Content: ${content}`);
      return null; // Indicate failure
    }
  } catch (error) {
    Logger.log(`Error calling Jina Reader for URL ${targetUrl}: ${error}`);
    Logger.log(`Failed URL: ${jinaReaderUrl}`);
    return null; // Indicate failure
  }
}

// Export functions if using modules with clasp
// Add appropriate export syntax if needed based on your project setup
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { 
    fetchWebPageContent, 
    fetchWebPageAsMarkdown, 
    convertHtmlToBasicMarkdown,
    fetchWebPageAsMarkdownJina
  };
} 