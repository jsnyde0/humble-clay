# Task: Implement Structured Data Extraction Feature

Status: 🔄 Active
Started: 2024-04-01
Priority: Medium
Related Spec: specs/apps_script/structured_extraction_spec.md
Dependencies: TASK-2024-04-01-01 ✅

## Requirements

*(Based on structured_extraction_spec.md Section 2)*

*   [ ] System uses text from selected input range.
*   [ ] User can optionally provide valid JSON Schema via UI text area.
*   [ ] UI schema text area is pre-filled with a default example.
*   [ ] User can optionally provide a field path string for extraction.
*   [x] **Backend:** API accepts optional JSON Schema per prompt. (Handled via response_model)
*   [ ] **Backend:** API accepts optional `extract_field_path` per prompt.
*   [x] **Backend:** API generates output conforming to schema (if provided). (Implemented via Instructor)
*   [x] **Backend:** API extracts field based on path (if provided).
*   [x] **Backend:** API returns appropriate errors for schema/path issues. (2024-04-02)
*   [ ] System calls `/prompts` for sidebar ops (batching prompts, schema, path).
*   [ ] System displays API response (`response` field) directly in target cells.
*   [ ] Sidebar inputs (Range, Column, Schema, Path) persist after generation.
*   [x] Feature implemented using Test-Driven Development principles (tests written prior to implementation code). (Backend part)

## Implementation Steps

1.  **Backend API Changes:**
    *   [x] Modify `PromptRequest` and `MultiplePromptsRequest` models to include optional `response_format` (containing schema) and `extract_field_path` fields. (2024-04-01) - Note: `response_format` now handled by `response_model` argument.
    *   [x] Modify `PromptResponse` and `MultiplePromptsResponse` models to handle flexible `response` type (`str | int | float | bool | None`) and standard `error` messages. (2024-04-01)
    *   [x] Implement schema enforcement logic in the LLM interaction (using Instructor). (2024-04-02)
    *   [x] Implement field path extraction logic (to be run after successful JSON generation).
    *   [x] Implement error handling and specific error messages for schema/path failures (2024-04-02):
        *   Added specific handling for connection errors
        *   Improved error message formatting
        *   Added error logging for debugging
        *   Updated tests to handle both success and error cases
    *   [x] Add/update backend unit and integration tests for these changes (2024-04-02):
        *   Added comprehensive test coverage for error scenarios
        *   Updated integration tests to handle connection issues gracefully
        *   Added test cases for schema validation

2.  **Apps Script UI Changes (`Sidebar.html` and associated client-side JS):**
    *   [ ] Add multi-line text area for "Output JSON Schema (Optional)".
    *   [ ] Pre-fill the schema text area with the default example schema on load.
    *   [ ] Add single-line text input for "Extract Field Path (Optional)".
    *   [ ] Implement logic to persist all sidebar input values after clicking "Generate".
    *   [ ] (Optional) Add a status/error display area to the sidebar.

3.  **Apps Script Core Logic Changes (`Code.js`, `ApiClient.js`):**
    *   [ ] Modify the sidebar "Generate" button's handler function (e.g., `processRange` in `Code.js`):
        *   Read schema string and path string from UI.
        *   Perform basic `JSON.parse()` check on schema string.
        *   Prepare the array of complex prompt objects (including `prompt`, optional `response_format`, optional `extract_field_path`).
        *   Adapt the call to `processBatch` to pass this array.
    *   [ ] Modify `ApiClient.js`:
        *   Update the `processBatch` function signature to accept `Array<Object>` instead of `string[]`.
        *   Ensure `processBatch` correctly sends the complex prompt objects in the payload to `/prompts`.
        *   (No changes needed to `handleApiResponse` or `makeApiRequest` based on current spec).
    *   [ ] Update result mapping logic to place the received `response` value directly into the cell and handle API errors.

4.  **Testing (Apps Script):**
    *   [ ] Update/add tests for the sidebar handler logic (reading inputs, constructing payload).
    *   [ ] Update/add tests for `processBatch` verifying the correct payload is sent (mocking `UrlFetchApp`).
    *   [ ] Update/add tests for result mapping.

## Acceptance Criteria

*(Based on structured_extraction_spec.md Section 8)*

*   [ ] Sidebar generation with schema produces full JSON output when path is empty.
*   [ ] Sidebar generation with schema and path produces extracted value.
*   [ ] Sidebar generation with empty schema produces standard text output.
*   [ ] Sidebar inputs persist after generation.
*   [x] API errors (e.g., invalid path, connection issues) are displayed appropriately. (2024-04-02)

## Open Questions / Considerations

*   ✅ Finalized backend implementation strategy: Using Instructor for schema enforcement.
*   ✅ Improved error handling with specific error types and better formatting.
*   Next focus: Implement field path extraction logic.
*   Note: Switched from attempting Marvin (unstable during testing) to Instructor for schema enforcement. 