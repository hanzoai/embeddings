FROM node:18-slim

WORKDIR /app

# Copy package files
COPY package*.json ./
COPY package.json ./

# Install dependencies 
RUN npm install --only=production

# Copy application code
COPY server.js ./

# Expose port
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=30s --retries=3 \
  CMD curl -f http://localhost:3001/health || exit 1

# Run as non-root user
RUN groupadd -g 1001 -r nodejs && useradd -r -g nodejs -u 1001 nodejs
USER nodejs

CMD ["node", "server.js"]
