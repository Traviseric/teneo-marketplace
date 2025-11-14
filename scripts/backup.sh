#!/bin/bash
# backup.sh - Automated backup script for Teneo Marketplace
# Creates timestamped backups of database, environment, and critical files
# Usage: ./backup.sh [backup-directory]

set -e  # Exit on error

BACKUP_DIR=${1:-"/var/backups/teneo-marketplace"}
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TIMESTAMP=$(date +%Y%m%d_%H%M%S)
BACKUP_NAME="teneo-marketplace-${TIMESTAMP}"
BACKUP_PATH="${BACKUP_DIR}/${BACKUP_NAME}"

# Color codes
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}📦 Starting Teneo Marketplace Backup${NC}"
echo "Timestamp: ${TIMESTAMP}"
echo "Backup directory: ${BACKUP_PATH}"
echo ""

# Create backup directory
echo -e "${YELLOW}Creating backup directory...${NC}"
mkdir -p "${BACKUP_PATH}"

# Backup database
echo -e "${YELLOW}📊 Backing up databases...${NC}"
if [ -f "${PROJECT_ROOT}/marketplace/backend/database/marketplace.db" ]; then
    cp "${PROJECT_ROOT}/marketplace/backend/database/marketplace.db" \
       "${BACKUP_PATH}/marketplace.db"
    echo -e "${GREEN}✓ Marketplace database backed up${NC}"
fi

if [ -f "${PROJECT_ROOT}/marketplace/backend/database/orders.db" ]; then
    cp "${PROJECT_ROOT}/marketplace/backend/database/orders.db" \
       "${BACKUP_PATH}/orders.db"
    echo -e "${GREEN}✓ Orders database backed up${NC}"
fi

if [ -f "${PROJECT_ROOT}/marketplace/backend/database/lulu.db" ]; then
    cp "${PROJECT_ROOT}/marketplace/backend/database/lulu.db" \
       "${BACKUP_PATH}/lulu.db"
    echo -e "${GREEN}✓ Lulu database backed up${NC}"
fi

# Backup environment file
echo -e "${YELLOW}⚙️  Backing up configuration...${NC}"
if [ -f "${PROJECT_ROOT}/marketplace/backend/.env" ]; then
    cp "${PROJECT_ROOT}/marketplace/backend/.env" \
       "${BACKUP_PATH}/.env"
    chmod 600 "${BACKUP_PATH}/.env"
    echo -e "${GREEN}✓ Environment configuration backed up${NC}"
fi

# Backup brand configurations
echo -e "${YELLOW}🏷️  Backing up brand configurations...${NC}"
if [ -d "${PROJECT_ROOT}/marketplace/frontend/brands" ]; then
    mkdir -p "${BACKUP_PATH}/brands"
    cp -r "${PROJECT_ROOT}/marketplace/frontend/brands/"* "${BACKUP_PATH}/brands/" 2>/dev/null || true
    echo -e "${GREEN}✓ Brand configurations backed up${NC}"
fi

# Backup network registry
echo -e "${YELLOW}🌐 Backing up network registry...${NC}"
if [ -f "${PROJECT_ROOT}/marketplace/shared/network-registry.json" ]; then
    cp "${PROJECT_ROOT}/marketplace/shared/network-registry.json" \
       "${BACKUP_PATH}/network-registry.json"
    echo -e "${GREEN}✓ Network registry backed up${NC}"
fi

# Create manifest
echo -e "${YELLOW}📝 Creating backup manifest...${NC}"
cat > "${BACKUP_PATH}/MANIFEST.txt" << EOF
Teneo Marketplace Backup
========================

Timestamp: ${TIMESTAMP}
Backup Location: ${BACKUP_PATH}
Created: $(date)

Contents:
---------
EOF

# List contents
ls -lh "${BACKUP_PATH}" >> "${BACKUP_PATH}/MANIFEST.txt"

# Calculate sizes
BACKUP_SIZE=$(du -sh "${BACKUP_PATH}" | cut -f1)
echo ""  >> "${BACKUP_PATH}/MANIFEST.txt"
echo "Total backup size: ${BACKUP_SIZE}" >> "${BACKUP_PATH}/MANIFEST.txt"

echo -e "${GREEN}✓ Manifest created${NC}"

# Compress backup
echo -e "${YELLOW}🗜️  Compressing backup...${NC}"
cd "${BACKUP_DIR}"
tar -czf "${BACKUP_NAME}.tar.gz" "${BACKUP_NAME}"
COMPRESSED_SIZE=$(du -sh "${BACKUP_NAME}.tar.gz" | cut -f1)

# Remove uncompressed backup
rm -rf "${BACKUP_NAME}"

echo -e "${GREEN}✓ Backup compressed (${COMPRESSED_SIZE})${NC}"

# Cleanup old backups (keep last 7 days)
echo -e "${YELLOW}🧹 Cleaning up old backups...${NC}"
find "${BACKUP_DIR}" -name "teneo-marketplace-*.tar.gz" -mtime +7 -delete
REMAINING=$(ls -1 "${BACKUP_DIR}"/teneo-marketplace-*.tar.gz 2>/dev/null | wc -l)
echo -e "${GREEN}✓ ${REMAINING} backups retained${NC}"

# Summary
echo ""
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✅ Backup completed successfully!${NC}"
echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""
echo "Backup file: ${BACKUP_DIR}/${BACKUP_NAME}.tar.gz"
echo "Compressed size: ${COMPRESSED_SIZE}"
echo "Backups retained: ${REMAINING}"
echo ""
echo -e "${YELLOW}📋 Restore instructions:${NC}"
echo "  1. Extract: tar -xzf ${BACKUP_NAME}.tar.gz"
echo "  2. Stop application: pm2 stop teneo-marketplace"
echo "  3. Copy files to project directory"
echo "  4. Start application: pm2 start teneo-marketplace"
echo ""
