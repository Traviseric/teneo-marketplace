# Docker Deployment Guide

This guide covers deploying the Teneo Marketplace using Docker containers for easy, consistent deployment across different environments.

## Overview

The Docker setup includes:
- **Main Application**: Node.js/Express server with frontend
- **Redis**: Caching and session storage
- **PostgreSQL**: Database (for future features)
- **Nginx**: Reverse proxy (production only)

## Prerequisites

### Required Software
- [Docker](https://docs.docker.com/get-docker/) (version 20.10+)
- [Docker Compose](https://docs.docker.com/compose/install/) (version 2.0+)

### System Requirements
- **Memory**: 2GB RAM minimum, 4GB recommended
- **Storage**: 5GB free space minimum
- **CPU**: 2 cores recommended

## Quick Start

### 1. Clone and Setup
```bash
git clone https://github.com/TravisEric/teneo-marketplace.git
cd teneo-marketplace
```

### 2. Configure Environment
```bash
# Copy environment template
cp marketplace/backend/.env.example marketplace/backend/.env

# Edit with your actual values
nano marketplace/backend/.env
```

**Required Environment Variables:**
```env
# Stripe Configuration (get from https://dashboard.stripe.com)
STRIPE_PUBLISHABLE_KEY=pk_test_your_key_here
STRIPE_SECRET_KEY=sk_test_your_key_here

# Database (optional for MVP)
POSTGRES_PASSWORD=your_secure_password
```

### 3. Launch Application
```bash
# Start all services
docker-compose up -d

# View logs
docker-compose logs -f teneo-marketplace
```

### 4. Access Application
- **Frontend**: http://localhost:3001
- **API**: http://localhost:3001/api
- **Health Check**: http://localhost:3001/api/health

## Development Setup

For development with hot reload:

```bash
# Use development compose file
docker-compose -f docker-compose.dev.yml up

# Or run in background
docker-compose -f docker-compose.dev.yml up -d
```

**Development Features:**
- Hot reload for code changes
- Node.js debugger on port 9229
- Development dependencies included
- Source code mounted as volume

## Configuration Options

### Environment Variables

**Application Settings:**
```env
NODE_ENV=production          # production | development
PORT=3001                   # Application port
CORS_ORIGIN=http://localhost:3001  # CORS allowed origin
```

**Stripe Integration:**
```env
STRIPE_PUBLISHABLE_KEY=pk_test_... # From Stripe dashboard
STRIPE_SECRET_KEY=sk_test_...      # Keep secret!
STRIPE_WEBHOOK_SECRET=whsec_...    # For webhook verification
```

**Database (Optional):**
```env
DATABASE_URL=postgresql://user:pass@postgres:5432/teneo_marketplace
POSTGRES_DB=teneo_marketplace
POSTGRES_USER=teneo
POSTGRES_PASSWORD=your_secure_password
```

**Redis (Optional):**
```env
REDIS_URL=redis://redis:6379
```

### Service Configuration

**Scale Services:**
```bash
# Run multiple app instances
docker-compose up --scale teneo-marketplace=3
```

**Resource Limits:**
```yaml
# Add to docker-compose.yml services
deploy:
  resources:
    limits:
      memory: 512M
      cpus: '0.5'
```

## Production Deployment

### 1. Production Configuration

Create `docker-compose.prod.yml`:
```yaml
version: '3.8'
services:
  teneo-marketplace:
    image: teneo-marketplace:latest
    environment:
      - NODE_ENV=production
    restart: always
    deploy:
      replicas: 2
      resources:
        limits:
          memory: 512M
```

### 2. Build Production Image
```bash
# Build optimized image
docker build -t teneo-marketplace:latest .

# Or use multi-stage build
docker build -f Dockerfile.prod -t teneo-marketplace:latest .
```

### 3. Deploy with Nginx
```bash
# Start with production profile
docker-compose --profile production up -d
```

### 4. SSL/HTTPS Setup

**Create SSL certificates:**
```bash
# Create ssl directory
mkdir -p nginx/ssl

# Generate self-signed cert (for testing)
openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
  -keyout nginx/ssl/teneo.key \
  -out nginx/ssl/teneo.crt

# Or use Let's Encrypt (recommended)
certbot certonly --webroot -w ./nginx/ssl -d yourdomain.com
```

**Nginx Configuration** (`nginx/nginx.conf`):
```nginx
events {
    worker_connections 1024;
}

http {
    upstream teneo_app {
        server teneo-marketplace:3001;
    }

    server {
        listen 80;
        server_name yourdomain.com;
        return 301 https://$server_name$request_uri;
    }

    server {
        listen 443 ssl;
        server_name yourdomain.com;

        ssl_certificate /etc/nginx/ssl/teneo.crt;
        ssl_certificate_key /etc/nginx/ssl/teneo.key;

        location / {
            proxy_pass http://teneo_app;
            proxy_set_header Host $host;
            proxy_set_header X-Real-IP $remote_addr;
        }
    }
}
```

## Database Setup

### PostgreSQL Initialization

Create `scripts/init-db.sql`:
```sql
-- Create initial database schema
CREATE TABLE IF NOT EXISTS books (
    id SERIAL PRIMARY KEY,
    title VARCHAR(255) NOT NULL,
    author VARCHAR(255) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    stock INTEGER DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create users table for future
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

### Database Migration
```bash
# Connect to database
docker-compose exec postgres psql -U teneo -d teneo_marketplace

# Run migrations
docker-compose exec teneo-marketplace npm run migrate
```

## Monitoring and Logging

### Health Checks
```bash
# Check service health
docker-compose ps

# View health status
docker inspect --format='{{.State.Health.Status}}' teneo-marketplace-app
```

### Logs Management
```bash
# View all logs
docker-compose logs

# Follow specific service
docker-compose logs -f teneo-marketplace

# View last 100 lines
docker-compose logs --tail=100 teneo-marketplace
```

### Log Rotation
Add to `docker-compose.yml`:
```yaml
services:
  teneo-marketplace:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## Backup and Recovery

### Database Backup
```bash
# Create backup
docker-compose exec postgres pg_dump -U teneo teneo_marketplace > backup.sql

# Automated backup script
#!/bin/bash
BACKUP_DIR="/backups/$(date +%Y%m%d)"
mkdir -p $BACKUP_DIR
docker-compose exec postgres pg_dump -U teneo teneo_marketplace > $BACKUP_DIR/db_backup.sql
```

### Application Data Backup
```bash
# Backup uploads and logs
tar -czf backup_$(date +%Y%m%d).tar.gz uploads/ logs/
```

### Restore from Backup
```bash
# Restore database
docker-compose exec -T postgres psql -U teneo teneo_marketplace < backup.sql

# Restore files
tar -xzf backup_20250112.tar.gz
```

## Troubleshooting

### Common Issues

**Port Already in Use:**
```bash
# Check what's using port 3001
lsof -i :3001

# Use different port
PORT=3002 docker-compose up
```

**Permission Errors:**
```bash
# Fix file permissions
sudo chown -R $USER:$USER uploads/ logs/

# Or run with correct user
docker-compose exec --user $(id -u):$(id -g) teneo-marketplace bash
```

**Out of Memory:**
```bash
# Check memory usage
docker stats

# Increase memory limit in docker-compose.yml
deploy:
  resources:
    limits:
      memory: 1G
```

**Container Won't Start:**
```bash
# Check container logs
docker-compose logs teneo-marketplace

# Debug by running bash
docker-compose run --rm teneo-marketplace bash

# Check environment variables
docker-compose exec teneo-marketplace env
```

### Performance Optimization

**Image Size Optimization:**
```dockerfile
# Use multi-stage build
FROM node:18-alpine AS builder
COPY package*.json ./
RUN npm ci --only=production

FROM node:18-alpine
COPY --from=builder /app/node_modules ./node_modules
```

**Memory Management:**
```bash
# Limit container memory
docker run -m 512m teneo-marketplace

# Monitor memory usage
docker stats --no-stream
```

## Security Best Practices

### Container Security
- Run as non-root user (already configured)
- Use specific image tags, not `latest`
- Scan images for vulnerabilities
- Keep base images updated

### Network Security
```yaml
# Use custom networks
networks:
  frontend:
    driver: bridge
  backend:
    driver: bridge
    internal: true
```

### Secrets Management
```bash
# Use Docker secrets
echo "sk_test_secret_key" | docker secret create stripe_secret -

# Reference in compose
services:
  teneo-marketplace:
    secrets:
      - stripe_secret
```

## Scaling and Load Balancing

### Horizontal Scaling
```bash
# Scale application instances
docker-compose up --scale teneo-marketplace=3

# Use load balancer
docker-compose -f docker-compose.yml -f docker-compose.scale.yml up
```

### Health Check Configuration
```yaml
healthcheck:
  test: ["CMD", "curl", "-f", "http://localhost:3001/api/health"]
  interval: 30s
  timeout: 10s
  retries: 3
  start_period: 40s
```

## CI/CD Integration

### GitHub Actions Example
```yaml
name: Deploy to Production
on:
  push:
    branches: [main]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Deploy to server
        run: |
          docker-compose pull
          docker-compose up -d
```

### Automated Testing
```bash
# Run tests in container
docker-compose run --rm teneo-marketplace npm test

# Integration tests
docker-compose -f docker-compose.test.yml up --abort-on-container-exit
```

## Useful Commands

```bash
# Quick deployment
docker-compose up -d

# Update and restart
docker-compose pull && docker-compose up -d

# View running containers
docker-compose ps

# Stop all services
docker-compose down

# Clean up (removes containers, networks, volumes)
docker-compose down -v

# Rebuild and restart
docker-compose up --build

# Shell into container
docker-compose exec teneo-marketplace bash

# View resource usage
docker-compose top
```

## Support

For issues with Docker deployment:
1. Check logs: `docker-compose logs`
2. Verify environment variables
3. Ensure required ports are available
4. Check Docker and Docker Compose versions
5. Review this guide for configuration options

For application-specific issues, see the main README.md and other documentation in the `docs/` directory.