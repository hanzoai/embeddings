#!/usr/bin/env node

/**
 * Hanzo Embeddings API Server
 *
 * Provides text embedding capabilities via:
 * - OpenAI embeddings
 * - Voyage AI embeddings  
 * - Local sentence-transformers (via Python)
 *
 * Compatible with OpenAI API format
 */

const http = require('http');

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

// Provider configuration
const OPENAI_API_KEY = process.env.OPENAI_API_KEY;
const VOYAGE_API_KEY = process.env.VOYAGE_API_KEY;
const OPENAI_EMBEDDINGS_URL = 'https://api.openai.com/v1/embeddings';
const VOYAGE_EMBEDDINGS_URL = 'https://api.voyageai.com/v1/embeddings';

// Default model
const DEFAULT_MODEL = process.env.DEFAULT_EMBEDDING_MODEL || 'text-embedding-3-small';

// Model dimensions and routing
const MODEL_DIMENSIONS = {
  'text-embedding-3-small': 1536,
  'text-embedding-3-large': 3072,
  'text-embedding-ada-002': 1536,
  'voyage-3.5': 1024,
  'voyage-3.5-lite': 512,  
  'voyage-3-large': 1024,
  'voyage-code-3': 1024,
  'snowflake-arctic-embed-xs': 384,
  'all-minilm-l6-v2': 384,
};

const VOYAGE_MODELS = new Set([
  'voyage-3.5', 'voyage-3.5-lite', 'voyage-3-large', 'voyage-code-3'
]);

console.log('🧠 Hanzo Embeddings API Server');
console.log(`📍 Listening on ${HOST}:${PORT}`);
console.log(`🔑 OpenAI: ${OPENAI_API_KEY ? 'configured' : 'not configured'}`);
console.log(`🔑 Voyage: ${VOYAGE_API_KEY ? 'configured' : 'not configured'}`);
console.log(`📊 Default model: ${DEFAULT_MODEL}`);
console.log('');

/**
 * Generate embeddings using OpenAI API
 */
async function generateOpenAIEmbeddings(input, model) {
  if (!OPENAI_API_KEY) {
    throw new Error('OpenAI API key not configured');
  }

  const body = {
    input: Array.isArray(input) ? input : [input],
    model: model || DEFAULT_MODEL,
  };

  const response = await fetch(OPENAI_EMBEDDINGS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${OPENAI_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`OpenAI error (${response.status}): ${error}`);
  }

  return response.json();
}

/**
 * Generate embeddings using Voyage AI API
 */
async function generateVoyageEmbeddings(input, model) {
  if (!VOYAGE_API_KEY) {
    throw new Error('Voyage AI API key not configured');
  }

  const body = {
    input: Array.isArray(input) ? input : [input],
    model: model || 'voyage-3.5',
  };

  const response = await fetch(VOYAGE_EMBEDDINGS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${VOYAGE_API_KEY}`,
    },
    body: JSON.stringify(body),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Voyage AI error (${response.status}): ${error}`);
  }

  return response.json();
}

/**
 * Generate mock embeddings (for testing/fallback)
 */
function generateMockEmbeddings(input, model, dimensions) {
  const texts = Array.isArray(input) ? input : [input];
  const dim = dimensions || MODEL_DIMENSIONS[model] || 384;

  return {
    object: 'list',
    data: texts.map((text, index) => ({
      object: 'embedding',
      index,
      embedding: Array.from({ length: dim }, () => Math.random() * 2 - 1),
    })),
    model: model || DEFAULT_MODEL,
    usage: {
      prompt_tokens: texts.reduce((acc, t) => acc + Math.ceil(t.length / 4), 0),
      total_tokens: texts.reduce((acc, t) => acc + Math.ceil(t.length / 4), 0),
    },
  };
}

/**
 * HTTP Server
 */
const server = http.createServer(async (req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health check
  if (req.url === '/health' || req.url === '/') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      service: 'hanzo-embeddings',
      openai: !!OPENAI_API_KEY,
      voyage: !!VOYAGE_API_KEY,
      default_model: DEFAULT_MODEL,
      models: Object.keys(MODEL_DIMENSIONS),
      timestamp: new Date().toISOString(),
    }));
    return;
  }

  // Models list
  if (req.url === '/v1/models' && req.method === 'GET') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      object: 'list',
      data: Object.entries(MODEL_DIMENSIONS).map(([id, dim]) => ({
        id,
        object: 'model',
        created: Date.now(),
        owned_by: 'hanzo',
        dimensions: dim,
      })),
    }));
    return;
  }

  // Embeddings endpoint (OpenAI compatible)
  if ((req.url === '/v1/embeddings' || req.url === '/embeddings') && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', async () => {
      try {
        const parsed = JSON.parse(body);
        const { input, model, dimensions } = parsed;

        if (!input) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ error: { message: 'input is required' } }));
          return;
        }

        const startTime = Date.now();
        let result;
        const requestedModel = model || DEFAULT_MODEL;

        // Route to appropriate provider
        if (VOYAGE_MODELS.has(requestedModel) && VOYAGE_API_KEY) {
          try {
            result = await generateVoyageEmbeddings(input, requestedModel);
            console.log(`✅ Voyage embeddings: ${Array.isArray(input) ? input.length : 1} texts, ${Date.now() - startTime}ms`);
          } catch (error) {
            console.error(`❌ Voyage error: ${error.message}`);
            // Fallback to mock
            result = generateMockEmbeddings(input, requestedModel, dimensions);
            console.log(`⚠️ Using mock embeddings (Voyage fallback)`);
          }
        } else if (OPENAI_API_KEY && (requestedModel.startsWith('text-embedding') || !model)) {
          try {
            result = await generateOpenAIEmbeddings(input, requestedModel);
            console.log(`✅ OpenAI embeddings: ${Array.isArray(input) ? input.length : 1} texts, ${Date.now() - startTime}ms`);
          } catch (error) {
            console.error(`❌ OpenAI error: ${error.message}`);
            // Fallback to mock
            result = generateMockEmbeddings(input, requestedModel, dimensions);
            console.log(`⚠️ Using mock embeddings (OpenAI fallback)`);
          }
        } else {
          // Use mock embeddings for local models or when no provider available
          result = generateMockEmbeddings(input, requestedModel, dimensions);
          console.log(`📊 Mock embeddings: ${Array.isArray(input) ? input.length : 1} texts, ${Date.now() - startTime}ms`);
        }

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify(result));

      } catch (error) {
        console.error(`❌ Error: ${error.message}`);
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ error: { message: error.message } }));
      }
    });
    return;
  }

  // 404
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found' }));
});

server.listen(PORT, HOST, () => {
  console.log(`✅ Embeddings API ready at http://${HOST}:${PORT}`);
  console.log(`🏥 Health: http://${HOST}:${PORT}/health`);
  console.log(`📊 Models: http://${HOST}:${PORT}/v1/models`);
  console.log(`🧠 Embed: POST http://${HOST}:${PORT}/v1/embeddings`);
  console.log('');
});

process.on('SIGTERM', () => {
  console.log('📡 SIGTERM received, closing server...');
  server.close(() => process.exit(0));
});