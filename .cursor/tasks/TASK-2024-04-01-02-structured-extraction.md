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
*   [ ] **Backend:** API accepts optional JSON Schema per prompt.
*   [ ] **Backend:** API accepts optional `extract_field_path` per prompt.
*   [ ] **Backend:** API generates output conforming to schema (if provided).
*   [ ] **Backend:** API extracts field based on path (if provided).
*   [ ] **Backend:** API returns appropriate errors for schema/path issues.
*   [ ] System calls `/prompts` for sidebar ops (batching prompts, schema, path).
*   [ ] System displays API response (`response` field) directly in target cells.
*   [ ] Sidebar inputs (Range, Column, Schema, Path) persist after generation.
*   [ ] Feature implemented using Test-Driven Development principles (tests written prior to implementation code).

## Implementation Steps

1.  **Backend API Changes:**
    *   [ ] Modify `PromptRequest` and `MultiplePromptsRequest` models to include optional `response_format` (containing schema) and `extract_field_path` fields.
    *   [ ] Modify `PromptResponse` and `MultiplePromptsResponse` models to handle flexible `response` type (string, number, boolean, potentially null) and standard `error` messages.
    *   [ ] Implement schema enforcement logic in the LLM interaction (e.g., using `instructor` or specific LLM features).
    *   [ ] Implement field path extraction logic (to be run after successful JSON generation).
    *   [ ] Implement error handling and specific error messages for schema/path failures.
    *   [ ] Add/update backend unit and integration tests for these changes.

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
*   [ ] API errors (e.g., invalid path) are displayed appropriately in output cells.

## Open Questions / Considerations

*   Finalize backend implementation strategy (schema enforcement library, error details).
*   Finalize specific error codes/messages written to cells. 