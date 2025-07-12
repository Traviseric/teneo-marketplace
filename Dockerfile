# Use official Node.js runtime as base image
FROM node:18-alpine

# Set working directory in container
WORKDIR /app

# Create app user for security
RUN addgroup -g 1001 -S nodejs
RUN adduser -S teneo -u 1001

# Copy package files first for better layer caching
COPY marketplace/backend/package*.json ./

# Install dependencies
RUN npm ci --only=production && npm cache clean --force

# Copy application code
COPY marketplace/backend/ ./backend/
COPY marketplace/frontend/ ./frontend/

# Create necessary directories and set permissions
RUN mkdir -p /app/logs /app/uploads
RUN chown -R teneo:nodejs /app

# Expose port
EXPOSE 3001

# Add health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
  CMD curl -f http://localhost:3001/api/health || exit 1

# Switch to non-root user
USER teneo

# Set environment variables
ENV NODE_ENV=production
ENV PORT=3001

# Start the application
CMD ["node", "backend/server.js"]