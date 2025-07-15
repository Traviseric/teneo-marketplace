#!/usr/bin/env node
const fs = require('fs');
const path = require('path');

const colors = {
    green: '\x1b[32m',
    blue: '\x1b[34m',
    yellow: '\x1b[33m',
    reset: '\x1b[0m'
};

const outputDir = 'claude-files-flat';
const excludeDirs = ['node_modules', '.git', 'build', 'dist', '.next', 'coverage'];
const excludeFiles = ['.env', '.env.local', '.env.production'];
const includeExtensions = ['.js', '.json', '.html', '.md', '.css', '.sql', '.yaml', '.yml'];

let fileCount = 0;
let totalSize = 0;

// Create output directory
if (fs.existsSync(outputDir)) {
    fs.rmSync(outputDir, { recursive: true });
}
fs.mkdirSync(outputDir);

// Create manifest
const manifest = [];

function shouldInclude(filePath) {
    const ext = path.extname(filePath).toLowerCase();
    const basename = path.basename(filePath);
    
    if (excludeFiles.includes(basename)) return false;
    if (filePath.endsWith('.pdf') || filePath.endsWith('.sqlite')) return false;
    if (basename === '.env.example') return true;
    
    return includeExtensions.includes(ext);
}

function copyFiles(dir, baseDir = '') {
    const items = fs.readdirSync(dir);
    
    items.forEach(item => {
        const fullPath = path.join(dir, item);
        const relativePath = path.join(baseDir, item);
        const stat = fs.statSync(fullPath);
        
        if (stat.isDirectory()) {
            if (!excludeDirs.includes(item)) {
                copyFiles(fullPath, relativePath);
            }
        } else if (shouldInclude(fullPath)) {
            // Create flat filename
            const flatName = relativePath.replace(/[\\\/]/g, '-');
            const destPath = path.join(outputDir, flatName);
            
            // Copy file
            fs.copyFileSync(fullPath, destPath);
            fileCount++;
            totalSize += stat.size;
            
            // Add to manifest
            manifest.push(`${flatName} = ${relativePath}`);
            
            // Show progress
            const size = (stat.size / 1024).toFixed(1);
            console.log(`${colors.green}✓${colors.reset} ${flatName} ${colors.blue}(${size} KB)${colors.reset}`);
        }
    });
}

console.log(`${colors.yellow}Creating flat file structure for Claude...${colors.reset}\n`);

// Start copying
copyFiles('.');

// Write manifest
fs.writeFileSync(path.join(outputDir, '_manifest.txt'), manifest.join('\n'));

// Write README
const readme = `# Claude Project Files

This folder contains all important files from the Teneo Marketplace project in a flat structure.

Total Files: ${fileCount}
Total Size: ${(totalSize / 1024 / 1024).toFixed(2)} MB

## How to use:
1. Select all files (Ctrl+A)
2. Drag into Claude's project files
3. All files will be imported at once

## File naming:
Files are renamed to preserve their original path:
- marketplace-backend-server.js was marketplace/backend/server.js
- See _manifest.txt for complete mapping
`;

fs.writeFileSync(path.join(outputDir, '_README.txt'), readme);

console.log(`\n${colors.green}✅ Complete!${colors.reset}`);
console.log(`📁 Files copied: ${fileCount}`);
console.log(`💾 Total size: ${(totalSize / 1024 / 1024).toFixed(2)} MB`);
console.log(`📍 Location: ${path.resolve(outputDir)}`);
console.log(`\n${colors.yellow}➡️  Open the folder and drag all files to Claude${colors.reset}`);