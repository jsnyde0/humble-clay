# Humble Clay

Humble API version of Clay's AI Agent.

## Development Setup

### Prerequisites

- Python 3.12 or higher
- `uv` package manager

### Installation

1. Clone the repository:
```bash
git clone https://github.com/jsnyde0/humble-clay.git
cd humble-clay
```

2. Install dependencies using `uv`:
```bash
uv pip install -e .
```

### Running the API

Start the development server:
```bash
uv run uvicorn humble_clay.src.api.main:app --reload
```

The API will be available at `http://localhost:8000`

### API Documentation

Once the server is running, you can access:
- Interactive API docs (Swagger UI): `http://localhost:8000/docs`

### Running Tests

```bash
uv run pytest
```

## Project Structure

```
humble_clay/
├── src/
│   └── api/
│       └── main.py         # FastAPI application
├── tests/
│   └── test_api.py        # API tests
└── pyproject.toml         # Project configuration
```

## Development Guidelines
Install pre-commit hooks:

```bash
uv run pre-commit install
```
