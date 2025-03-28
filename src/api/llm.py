"""LLM processing utilities."""

import os

import httpx


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
                "HTTP-Referer": "https://github.com/jsnyde0/humble-clay",
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
