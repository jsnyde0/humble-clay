import os
from typing import Optional

import httpx
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, Field

app = FastAPI(
    title="Humble Clay API",
    description="Backend API for Humble Clay - AI-powered Google Sheets add-on",
    version="0.1.0",
)


# Pydantic models
class PromptRequest(BaseModel):
    prompt: str = Field(
        ..., min_length=1, description="The prompt to send to the AI model"
    )


class PromptResponse(BaseModel):
    response: Optional[str] = None
    status: str = "success"
    error: Optional[str] = None


async def process_with_llm(prompt: str) -> str:
    """Process prompt with OpenRouter API using Gemini Flash 2.0 Lite."""
    api_key = os.getenv("OPENROUTER_API_KEY")
    if not api_key:
        raise Exception("OpenRouter API key not configured")

    async with httpx.AsyncClient() as client:
        response = await client.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {api_key}",
                "HTTP-Referer": "https://github.com/jsnyde0/humble-clay",  # Required by OpenRouter
            },
            json={
                "model": "google/gemini-pro",  # Gemini Flash 2.0 Lite
                "messages": [{"role": "user", "content": prompt}],
            },
        )

        if response.status_code != 200:
            raise Exception(f"OpenRouter API error: {response.text}")

        result = response.json()
        return result["choices"][0]["message"]["content"]


@app.post("/api/v1/prompt", response_model=PromptResponse)
async def process_prompt(request: PromptRequest):
    """Process a single prompt using Gemini Flash 2.0 Lite."""
    try:
        response_text = await process_with_llm(request.prompt)
        return PromptResponse(response=response_text)
    except Exception as e:
        # Raise HTTP exception instead of returning response
        raise HTTPException(status_code=500, detail=str(e))


class HealthResponse(BaseModel):
    status: str
    version: str


@app.get("/health", response_model=HealthResponse)
async def health_check():
    """Simple health check endpoint."""
    return HealthResponse(status="healthy", version="0.1.0")


@app.get("/")
async def root():
    """Root endpoint with basic information."""
    return {
        "name": "Humble Clay",
        "description": "AI-powered Google Sheets add-on",
        "version": "0.1.0",
    }
