#!/bin/bash
#
# Synora Deployment Script
# Run this on your server to deploy the application
#

set -e

echo "========================================"
echo "      Synora Deployment Script"
echo "========================================"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check if Docker is installed
if ! command -v docker &> /dev/null; then
    echo -e "${RED}Error: Docker is not installed${NC}"
    exit 1
fi

if ! command -v docker-compose &> /dev/null && ! docker compose version &> /dev/null; then
    echo -e "${RED}Error: Docker Compose is not installed${NC}"
    exit 1
fi

# Determine docker compose command
if docker compose version &> /dev/null; then
    DOCKER_COMPOSE="docker compose"
else
    DOCKER_COMPOSE="docker-compose"
fi

echo -e "${GREEN}✓ Docker and Docker Compose found${NC}"

# Create .env file if it doesn't exist
if [ ! -f .env ]; then
    echo -e "${YELLOW}Creating .env file...${NC}"
    cat > .env << EOF
# Synora Configuration
JWT_SECRET=$(openssl rand -hex 32)
CORS_ORIGINS=http://synora.duckdns.org:81,http://synora.duckdns.org,http://localhost:3000
EOF
    echo -e "${GREEN}✓ .env file created with random JWT secret${NC}"
fi

# Create necessary directories
echo -e "${YELLOW}Creating directories...${NC}"
mkdir -p backend/vault backend/data
echo -e "${GREEN}✓ Directories created${NC}"

# Stop existing containers
echo -e "${YELLOW}Stopping existing containers...${NC}"
$DOCKER_COMPOSE down --remove-orphans 2>/dev/null || true

# Build and start containers
echo -e "${YELLOW}Building and starting containers...${NC}"
$DOCKER_COMPOSE build --no-cache
$DOCKER_COMPOSE up -d

# Wait for services to be ready
echo -e "${YELLOW}Waiting for services to start...${NC}"
sleep 10

# Check health
echo -e "${YELLOW}Checking service health...${NC}"

# Check backend
if curl -s http://localhost:8000/api/health | grep -q "healthy"; then
    echo -e "${GREEN}✓ Backend is healthy${NC}"
else
    echo -e "${RED}✗ Backend health check failed${NC}"
    echo "Checking logs..."
    $DOCKER_COMPOSE logs backend --tail=50
fi

# Check frontend
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is running${NC}"
else
    echo -e "${YELLOW}⚠ Frontend may still be starting...${NC}"
fi

echo ""
echo "========================================"
echo -e "${GREEN}Deployment Complete!${NC}"
echo "========================================"
echo ""
echo "Services:"
echo "  - Backend API:  http://localhost:8000"
echo "  - Frontend:     http://localhost:3000"
echo "  - Via Nginx:    http://localhost:81"
echo ""
echo "Useful commands:"
echo "  View logs:      $DOCKER_COMPOSE logs -f"
echo "  Stop:           $DOCKER_COMPOSE down"
echo "  Restart:        $DOCKER_COMPOSE restart"
echo "  Rebuild:        $DOCKER_COMPOSE up -d --build"
echo ""
