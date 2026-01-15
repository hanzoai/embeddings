# Hanzo Embeddings API

A lightweight, OpenAI-compatible embeddings API server that provides text embedding capabilities through multiple providers.

## Features

- **OpenAI Compatible API** - Drop-in replacement for OpenAI embeddings endpoints
- **Multiple Providers** - Support for OpenAI and local models
- **Zero Dependencies** - Pure Node.js implementation with no external dependencies
- **Health Monitoring** - Built-in health checks and status endpoints
- **Mock Embeddings** - Fallback to mock embeddings when providers are unavailable

## Quick Start

### Local Development

```bash
# Start the server
npm start

# Or with auto-reload for development
npm run dev
```

### Docker

```bash
# Build the image
docker build -t hanzo-embeddings .

# Run the container
docker run -p 3002:3002 \
  -e OPENAI_API_KEY=your_openai_key \
  hanzo-embeddings
```

## API Endpoints

### Health Check
```
GET /health
GET /
```

### List Models
```
GET /v1/models
```

### Generate Embeddings
```
POST /v1/embeddings
POST /embeddings
```

Example request:
```bash
curl -X POST http://localhost:3002/v1/embeddings \
  -H "Content-Type: application/json" \
  -d '{
    "input": "Hello world",
    "model": "text-embedding-3-small"
  }'
```

## Configuration

Environment variables:

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | `3002` | Server port |
| `HOST` | `0.0.0.0` | Server host |
| `OPENAI_API_KEY` | - | OpenAI API key (optional) |
| `DEFAULT_EMBEDDING_MODEL` | `text-embedding-3-small` | Default model |

## Supported Models

- `text-embedding-3-small` (1536 dimensions)
- `text-embedding-3-large` (3072 dimensions) 
- `text-embedding-ada-002` (1536 dimensions)
- `snowflake-arctic-embed-xs` (384 dimensions)
- `all-minilm-l6-v2` (384 dimensions)

## Architecture

The service automatically:
1. Routes OpenAI models to OpenAI API when API key is provided
2. Falls back to mock embeddings for testing/development
3. Provides deterministic mock embeddings for local models

## Integration

This service is designed to integrate with the Hanzo AI ecosystem:

- **LLM Gateway** - Can be used as an embedding provider
- **Vector Databases** - Compatible with any vector DB expecting OpenAI format
- **RAG Systems** - Drop-in replacement for OpenAI embeddings in RAG pipelines

## Development

The server is implemented as a single Node.js file with no dependencies for maximum portability and minimal overhead.

### Project Structure

```
embeddings/
├── server.js         # Main server implementation
├── package.json      # Node.js package configuration
├── Dockerfile        # Container configuration
└── README.md         # This file
```
