# TASK-2023-06-11-01 - Refactor main.py

## Description
Refactor the FastAPI application's main.py file to improve maintainability by splitting it into smaller, more focused modules. The current file is too large and contains multiple responsibilities that should be separated.

## Relevant Specifications
- Keep the API functionality identical (maintain backwards compatibility)
- Create a modular structure that's easier to maintain
- Support running tests after each refactoring step to ensure functionality is preserved
- Prepare the codebase for future improvements like concurrent batch processing

## Acceptance Criteria
- [x] API endpoints maintain the same behavior
- [x] All tests pass after each refactoring step
- [x] Code is organized into logical modules with clear responsibilities
- [x] Main.py file is significantly smaller and focused on API route definitions
- [x] Documentation is updated to reflect the new structure

## Implementation Steps

### Bundle 1: Extract Schema Handling
1. Create `src/api/schema/` directory with `__init__.py` and `dynamic.py` files
2. Move `create_dynamic_model_from_schema` function to `schema/dynamic.py`
3. Update imports in `main.py` to use the new module
4. Run tests to verify functionality

### Bundle 2: Extract Response Handling
1. Create `src/api/response/` directory with `__init__.py` and `handlers.py` files
2. Extract response formatting logic into functions:
   - Create `format_llm_response()` to handle different response types (Pydantic, dict, string)
   - Create `extract_field_if_needed()` to handle field extraction
3. Update imports and refactor the route handlers to use these functions
4. Run tests to verify functionality

### Bundle 3: Extract Logging Setup
1. Create `src/api/logging/` directory with `__init__.py` and `setup.py` files
2. Move Logfire configuration and setup to `logging/setup.py`
3. Create helper functions for common logging patterns
4. Update imports in `main.py`
5. Run tests to verify functionality

### Bundle 4: Extract Batch Processing Logic
1. Create `src/api/batch/` directory with `__init__.py` and `processor.py` files
2. Move the batch processing logic from `/api/v1/prompts` endpoint to `batch/processor.py`
3. Create a `process_prompt_batch()` function that handles a list of prompts
4. Add proper logging and error handling in the new module
5. Update the endpoint in `main.py` to use this new function
6. Run tests to verify functionality

### Bundle 5: Clean Up Main.py
1. Review and organize imports in `main.py`
2. Ensure consistent docstrings and comments
3. Update the FastAPI app configuration if needed
4. Run tests to verify everything still works
5. Measure the line count reduction in main.py

## Learnings
- Document any challenges encountered during refactoring
- Note any potential optimizations identified for future tasks
- Capture insights about the application architecture

## Metadata
- ID: TASK-2023-06-11-01
- Start date: 2023-06-11
- End date: TBD
- State: 📝 Open
