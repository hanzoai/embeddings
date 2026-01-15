# Hanzo Embeddings API - Development Commands

.PHONY: dev start build test health clean deploy

# Development server with auto-reload
dev:
	npm run dev

# Production server
start:
	npm start

# Build Docker image
build:
	docker build -t hanzo-embeddings .

# Test the API
test: health
	@echo "Testing embeddings endpoint..."
	@curl -s -X POST http://localhost:3002/v1/embeddings \
		-H "Content-Type: application/json" \
		-d '{"input": "Test embedding", "model": "text-embedding-3-small"}' \
		| jq '.data[0] | {index, object, embedding: (.embedding | length)}'

# Health check
health:
	@echo "Health check..."
	@curl -s http://localhost:3002/health | jq .

# List models
models:
	@echo "Available models..."
	@curl -s http://localhost:3002/v1/models | jq '.data[] | {id, dimensions}'

# Clean up
clean:
	@echo "Stopping any running servers..."
	@pkill -f "node server.js" || true

# Deploy to production
deploy:
	@echo "Deploying to production..."
	./deploy.sh

# Quick start for development
up: clean
	@echo "Starting embeddings API server..."
	@node server.js &
	@sleep 2
	@make health

# Show usage
help:
	@echo "Hanzo Embeddings API - Available commands:"
	@echo "  make dev      - Start development server with auto-reload"
	@echo "  make start    - Start production server"
	@echo "  make up       - Quick start with health check"
	@echo "  make test     - Run API tests"
	@echo "  make health   - Health check"
	@echo "  make models   - List available models"
	@echo "  make build    - Build Docker image"
	@echo "  make deploy   - Deploy to production"
	@echo "  make clean    - Stop running servers"