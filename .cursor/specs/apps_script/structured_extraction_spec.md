# Specification: Structured Data Extraction for Google Sheets Add-on

**Status:** Draft
**Date:** 2024-04-01
**Related Spec:** sheets_integration.md

## 1. Overview & Goal

To allow users to extract specific pieces of information from unstructured text (sourced from selected spreadsheet cells) and output that information either as structured JSON data (conforming to a user-provided JSON Schema) or as a single extracted value from that JSON.

Providing the JSON schema and the field path for extraction are both **optional**. If no schema is provided, standard text generation occurs. If a schema is provided but no field path, the full generated JSON is returned.

This targets technical users comfortable with defining JSON structures.

## 2. Requirements

*   [ ] The system must use the text from the user-selected input range as the source material.
*   [ ] User must be able to **optionally** provide a valid JSON Schema object defining the desired output structure via a UI text area.
*   [ ] The UI schema text area must be pre-filled with a default example schema (see Section 3).
*   [ ] User must **optionally** be able to provide a field path string (only relevant if a schema is also provided) to extract a specific value from the generated JSON.
*   [ ] The Humble Clay API backend must be modified to:
    *   Accept an optional JSON Schema within each prompt object (`/prompts` and `/prompt`).
    *   Accept an optional `extract_field_path` string within each prompt object.
    *   Instruct the LLM to generate output conforming to the schema *if provided*.
    *   Parse the generated JSON and extract the specified field *if both schema and field path are provided*.
    *   Return appropriate errors if schema conformance or field extraction fails.
*   [ ] The system must call the `/prompts` endpoint for sidebar operations, sending prompts, the optional schema definition, and the optional field path in batches.
*   [ ] The system must receive the generated response(s) from the API (either full JSON, extracted value, standard text, or error).
*   [ ] The system must display the value received in the API response's `response` field directly into the corresponding target Google Sheet cell(s).

## 3. User Interaction & UI (Sidebar Focus)

*   **Input:** Uses the existing Input Range and Output Column selectors.
*   **Structure Definition Input (Optional):** 
    *   A dedicated multi-line text area in the sidebar labeled "Output JSON Schema (Optional)", pre-filled with a default example schema. User can edit, replace, or clear it.
    *   **Default Example Schema:**
        ```json
        {
          "name": "weather_report",
          "strict": true,
          "schema": {
            "type": "object",
            "properties": {
              "location": {
                "type": "string",
                "description": "City or location name"
              },
              "temperature": {
                "type": "number",
                "description": "Temperature in Celsius"
              },
              "conditions": {
                "type": "string",
                "description": "Weather conditions description"
              }
            },
            "required": ["location", "temperature", "conditions"],
            "additionalProperties": false
          }
        }
        ```
*   **Field Path Input (Optional):**
    *   A single-line text input field in the sidebar labeled "Extract Field Path (Optional)".
    *   Hint text could be "e.g., location or address.city (Requires Schema)".
*   **Invocation:** 
    *   Uses the existing "Generate" button in the sidebar.
    *   The add-on sends the content of the Schema and Field Path inputs to the API along with the prompts.
*   **Output Display:** 
    *   The value received directly from the API's `response` field for each corresponding input prompt is placed in the output cell.
*   **Persistence:**
    *   [ ] Input Range, Output Column, Output JSON Schema, and Extract Field Path values in the sidebar should **persist** after clicking "Generate"; they should not be cleared.

## 4. API Interaction

*   **Endpoint (Sidebar):** `/api/v1/prompts`.
*   **Request Payload (Batch - `/prompts` - `MultiplePromptsRequest` enhancement needed on backend):**
    ```json
    {
      "prompts": [
        { 
          "prompt": "<input_text_from_cell_1>",
          "response_format": { // Optional field 
            "type": "json_schema",
            "json_schema": { <user_provided_schema_object_or_null> }
          },
          "extract_field_path": "<user_provided_path_or_null>" // Optional field
        },
        // ... more prompts (each potentially with same schema/path from sidebar)
      ]
    }
    ```
    *Note: If schema text area is empty/invalid, `response_format` might be omitted or null. If path text area is empty, `extract_field_path` might be omitted or null.*
*   **Request Payload (Single - `/prompt` - `PromptRequest` enhancement needed on backend):** 
    *(Used internally if ever needed, but primary focus is batch)*
    ```json
    {
      "prompt": "<input_text_from_cell>",
      "response_format": { ... }, // Optional
      "extract_field_path": "..." // Optional
    }
    ```
*   **Expected Response (Batch - `/prompts` - `MultiplePromptsResponse`):**
    ```json
    {
      "responses": [
        // Example: Full JSON returned
        { "status": "success", "response": "{\"location\": \"London\", ...}", "error": null }, 
        // Example: Extracted value returned
        { "status": "success", "response": "London", "error": null }, 
        // Example: Standard text generation returned (no schema provided)
        { "status": "success", "response": "A standard text response...", "error": null },
        // Example: Error returned
        { "status": "error", "response": null, "error": "Invalid field path: xyz" }, 
        { "status": "error", "response": null, "error": "Failed to conform to schema" }
      ]
    }
    ```
    *The `response` field's type depends on whether extraction occurred. It could be a string (JSON or text), number, boolean.* 
*   **Expected Response (Single - `/prompt` - `PromptResponse`):** 
    *Similar structure, `response` field contains JSON string, extracted value, standard text, or null if error.*

## 5. Apps Script Logic

*   **Sidebar "Generate" Button Click:**
    *   Read input range and output column.
    *   Read schema string from "Output JSON Schema" text area.
    *   Read path string from "Extract Field Path" text area.
    *   Initialize `schemaObject = null`, `fieldPath = null`.
    *   **If Schema string is not empty:**
        *   Try to parse schema string using `JSON.parse()` to check basic syntax. If error, display error to user (e.g., using `SpreadsheetApp.getUi().alert()`) and stop.
        *   If parse successful, `schemaObject = parsedSchema`.
    *   **If Path string is not empty:**
        *   `fieldPath = pathString.trim()`.
    *   Get all input text values from the selected range.
    *   Prepare the list of prompt objects for the batch request:
        *   For each input text:
            *   Create prompt object: `{ prompt: inputText }`
            *   If `schemaObject` is not null, add `response_format: { type: "json_schema", json_schema: schemaObject }`.
            *   If `fieldPath` is not null, add `extract_field_path: fieldPath`.
    *   Call `processBatch` with the list of prompt objects (Note: `processBatch` input type needs update - see Section 9).
    *   Map the results from the API response array back to the output cells:
        *   For each result in the response array:
            *   If `result.status === "success"`, write `result.response` (which could be JSON string, extracted value, or standard text) to the corresponding output cell.
            *   If `result.status === "error"`, write `#API_ERROR!: ${result.error}` or similar to the corresponding output cell.

## (Section 6 Custom Function Removed)

## 7. Error Handling

*   Invalid JSON syntax in Schema provided by user (UI detects parse error before sending).
*   API error during generation (network, auth, rate limit - handled by `ApiClient`).
*   API returns `status: "error"` with details like:
    *   "Invalid JSON schema provided"
    *   "Failed to conform to schema"
    *   "Invalid field path: [path]"

## 8. Acceptance Criteria

*   **Example 1 (Sidebar - Full JSON):**
    *   Input Cell (A1): "The weather in London today is 15 degrees Celsius and cloudy."
    *   Output Column: B
    *   Schema Text Area: (Contains weather schema JSON)
    *   Extract Field Path: (empty)
    *   Click "Generate".
    *   Expected Output Cell (B1): (String containing) `{"location": "London", "temperature": 15, "conditions": "cloudy"}`
*   **Example 2 (Sidebar - Extracted Field):**
    *   Input Cell (A1): "The weather in London today is 15 degrees Celsius and cloudy."
    *   Output Column: B
    *   Schema Text Area: (Contains weather schema JSON)
    *   Extract Field Path: `location`
    *   Click "Generate".
    *   Expected Output Cell (B1): `London`
*   **Example 3 (Sidebar - Standard Generation):**
    *   Input Cell (A1): "Tell me a short fact about London."
    *   Output Column: B
    *   Schema Text Area: (empty)
    *   Extract Field Path: (empty)
    *   Click "Generate".
    *   Expected Output Cell (B1): (Standard text response like "London is the capital of England.")

## 9. Open Questions / Considerations

*   Backend: Need to modify `PromptRequest`, `MultiplePromptsRequest`, `PromptResponse`, `MultiplePromptsResponse` models for optional `response_format`, optional `extract_field_path`, and flexible `response` type.
*   Backend: Implement schema enforcement logic.
*   Backend: Implement field path extraction logic.
*   Backend: Define specific error messages for schema/path failures.
*   Schema complexity limitations.
*   Specific error message format for user-facing errors written to cells (e.g., `#API_ERROR!: ...`).
*   Apps Script: `processBatch` function in `ApiClient.js` needs modification to accept `Array<Object>` (prompt objects) instead of `string[]`. 