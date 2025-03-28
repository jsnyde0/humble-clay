"""Authentication utilities for the API."""

import os

from fastapi import HTTPException, Security
from fastapi.security import APIKeyHeader

# APIKeyHeader is a FastAPI class that:
# 1. Defines where to look for the API key (in which header)
# 2. Automatically adds this to the OpenAPI documentation
# 3. Handles extracting the key from requests
API_KEY_NAME = "X-API-Key"
api_key_header = APIKeyHeader(
    name=API_KEY_NAME,
    description="API key for authentication",
    auto_error=True,
    scheme_name="API Key Auth",
)


async def verify_api_key(api_key: str = Security(api_key_header)) -> str:
    """Validate the API key."""
    if not api_key:
        raise HTTPException(status_code=403, detail="API key required")

    if not os.getenv("API_KEY"):
        raise HTTPException(status_code=500, detail="API key not configured on server")

    if api_key != os.getenv("API_KEY"):
        raise HTTPException(status_code=403, detail="Invalid API key")
    return api_key
