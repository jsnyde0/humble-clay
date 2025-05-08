"""Main FastAPI application."""

import logging

from fastapi import FastAPI

# Core modules
from .core.lifespan import lifespan

# Other necessary imports (keep only those still needed in main.py, if any)
# from .auth import verify_api_key # Likely needed by routers, not here
# from .batch.processor import process_multiple_prompts # Moved to prompts router
# from .llm.processor import process_with_llm # Moved to prompts router
from .logging.setup import (
    initialize_logfire,
    setup_fastapi_logging,
)

# Route modules
from .routes import general, prompts  # Import the route modules

# from .models import * # Models are likely used in routers, not directly needed here
# from .response.handlers import prepare_prompt_response # Moved to prompts router
# from .schema.dynamic import create_dynamic_model_from_schema # Moved to prompts router

# Configure Logfire (can stay here)
initialize_logfire(
    service_name="humble-clay-api",
    service_version="0.1.0",
    environment="development",
)

logger = logging.getLogger(__name__)

# Create FastAPI app instance
app = FastAPI(
    title="Humble Clay API",
    description="Backend API for Humble Clay - AI-powered Google Sheets add-on",
    version="0.1.0",
    lifespan=lifespan,
)

# Apply Logfire instrumentation and logging setup (can stay here)
setup_fastapi_logging(app)

# Include routers from route modules
app.include_router(general.router)
app.include_router(prompts.router)

# OLD ENDPOINT DEFINITIONS (REMOVE)
# @app.get("/") ...
# async def get_api_info(): ...

# @app.get("/health") ...
# async def check_health(): ...

# @app.post("/api/v1/prompt", ...) ...
# async def process_single_prompt(...): ...

# @app.post("/api/v1/prompts", ...) ...
# async def process_multiple_prompts_endpoint(...): ...

# Add a simple check for running the app directly (optional)
# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000)
