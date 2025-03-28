"""Generate a secure API key."""

import secrets


def generate_api_key() -> str:
    """Generate a secure random API key."""
    return secrets.token_urlsafe(32)


if __name__ == "__main__":
    api_key = generate_api_key()
    print("\nGenerated API Key:")
    print("-----------------")
    print(api_key)
    print("\nAdd this to your .env file:")
    print("API_KEY=" + api_key)
