#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const colors = {
  blue: '\x1b[34m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  cyan: '\x1b[36m',
  magenta: '\x1b[35m',
  reset: '\x1b[0m',
  bold: '\x1b[1m'
};

const EXCLUDE_DIRS = ['node_modules', '.git', 'dist', 'build', '.next', '.cache'];
const EXCLUDE_FILES = ['.DS_Store', 'Thumbs.db', '.env'];

const fileCategories = {
  js: { extensions: ['.js'], files: [], totalSize: 0, icon: '📜', color: colors.yellow },
  json: { extensions: ['.json'], files: [], totalSize: 0, icon: '⚙️', color: colors.cyan },
  html: { extensions: ['.html'], files: [], totalSize: 0, icon: '🌐', color: colors.green },
  md: { extensions: ['.md'], files: [], totalSize: 0, icon: '📝', color: colors.blue },
};

function formatFileSize(bytes) {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

function shouldExclude(filePath) {
  const parts = filePath.split(path.sep);
  return parts.some(part => EXCLUDE_DIRS.includes(part)) || 
         EXCLUDE_FILES.includes(path.basename(filePath));
}

function scanDirectory(dir, baseDir = dir) {
  if (!fs.existsSync(dir)) return;
  
  const items = fs.readdirSync(dir);
  
  items.forEach(item => {
    const fullPath = path.join(dir, item);
    const relativePath = path.relative(baseDir, fullPath);
    
    if (shouldExclude(relativePath)) return;
    
    const stat = fs.statSync(fullPath);
    
    if (stat.isDirectory()) {
      scanDirectory(fullPath, baseDir);
    } else if (stat.isFile()) {
      const ext = path.extname(item).toLowerCase();
      
      Object.entries(fileCategories).forEach(([category, config]) => {
        if (config.extensions.includes(ext)) {
          config.files.push({
            path: relativePath,
            size: stat.size,
            modified: stat.mtime
          });
          config.totalSize += stat.size;
        }
      });
    }
  });
}

function printFileList(category, config) {
  if (config.files.length === 0) return;
  
  console.log(`\n${config.color}${config.icon} ${colors.bold}${category.toUpperCase()} Files${colors.reset} ${config.color}(${config.files.length} files, ${formatFileSize(config.totalSize)})${colors.reset}`);
  console.log('─'.repeat(80));
  
  config.files
    .sort((a, b) => a.path.localeCompare(b.path))
    .forEach(file => {
      const size = formatFileSize(file.size).padStart(10);
      console.log(`${config.color}${size}${colors.reset}  ${file.path}`);
    });
}

function generateProjectStructure() {
  const structure = {};
  
  Object.values(fileCategories).forEach(config => {
    config.files.forEach(file => {
      const parts = file.path.split(path.sep);
      let current = structure;
      
      parts.forEach((part, index) => {
        if (index === parts.length - 1) {
          current[part] = 'file';
        } else {
          current[part] = current[part] || {};
          current = current[part];
        }
      });
    });
  });
  
  return structure;
}

function printTree(obj, prefix = '', isLast = true) {
  const entries = Object.entries(obj);
  entries.forEach(([key, value], index) => {
    const isLastEntry = index === entries.length - 1;
    const connector = isLastEntry ? '└── ' : '├── ';
    const extension = isLastEntry ? '    ' : '│   ';
    
    if (value === 'file') {
      const ext = path.extname(key).toLowerCase();
      let color = colors.reset;
      Object.entries(fileCategories).forEach(([_, config]) => {
        if (config.extensions.includes(ext)) color = config.color;
      });
      console.log(`${prefix}${connector}${color}${key}${colors.reset}`);
    } else {
      console.log(`${prefix}${connector}${colors.bold}${key}/${colors.reset}`);
      printTree(value, prefix + extension, isLastEntry);
    }
  });
}

function main() {
  console.log(`${colors.bold}${colors.magenta}\n🔍 Teneo Marketplace - Project File Analysis${colors.reset}\n`);
  
  const projectRoot = path.resolve(__dirname, '..');
  console.log(`${colors.cyan}Project Root:${colors.reset} ${projectRoot}\n`);
  
  console.log('Scanning project files...\n');
  scanDirectory(projectRoot);
  
  // Print file lists by category
  Object.entries(fileCategories).forEach(([category, config]) => {
    printFileList(category, config);
  });
  
  // Print summary statistics
  console.log(`\n${colors.bold}${colors.magenta}📊 Summary Statistics${colors.reset}`);
  console.log('─'.repeat(80));
  
  let totalFiles = 0;
  let totalSize = 0;
  
  Object.entries(fileCategories).forEach(([category, config]) => {
    if (config.files.length > 0) {
      totalFiles += config.files.length;
      totalSize += config.totalSize;
      const percentage = ((config.totalSize / totalSize) * 100).toFixed(1);
      console.log(`${config.color}${config.icon} ${category.toUpperCase().padEnd(12)}${colors.reset} ${String(config.files.length).padStart(4)} files  ${formatFileSize(config.totalSize).padStart(10)}`);
    }
  });
  
  console.log('─'.repeat(80));
  console.log(`${colors.bold}Total:${colors.reset}              ${String(totalFiles).padStart(4)} files  ${formatFileSize(totalSize).padStart(10)}`);
  
  // Print project structure tree
  console.log(`\n${colors.bold}${colors.magenta}🌳 Project Structure${colors.reset}`);
  console.log('─'.repeat(80));
  const structure = generateProjectStructure();
  printTree(structure);
  
  // Print key directories
  console.log(`\n${colors.bold}${colors.magenta}📁 Key Directories${colors.reset}`);
  console.log('─'.repeat(80));
  
  const keyDirs = [
    { path: 'frontend', desc: 'Frontend application code' },
    { path: 'backend', desc: 'Backend API and server code' },
    { path: 'public', desc: 'Static assets and book files' },
    { path: 'tools', desc: 'Utility scripts and tools' },
    { path: 'network', desc: 'Network federation code' },
    { path: 'scripts', desc: 'Build and deployment scripts' }
  ];
  
  keyDirs.forEach(({ path: dirPath, desc }) => {
    const fullPath = path.join(projectRoot, dirPath);
    if (fs.existsSync(fullPath)) {
      console.log(`${colors.green}✓${colors.reset} ${colors.bold}${dirPath.padEnd(15)}${colors.reset} ${desc}`);
    } else {
      console.log(`${colors.yellow}○${colors.reset} ${colors.bold}${dirPath.padEnd(15)}${colors.reset} ${desc} ${colors.yellow}(not found)${colors.reset}`);
    }
  });
  
  // Print important files for review
  console.log(`\n${colors.bold}${colors.magenta}⭐ Priority Files for Code Review${colors.reset}`);
  console.log('─'.repeat(80));
  
  const priorityFiles = [
    'package.json',
    'backend/server.js',
    'backend/api.js',
    'frontend/js/main.js',
    'frontend/js/checkout.js',
    'index.html',
    'README.md',
    'DEPLOYMENT_STATUS.md'
  ];
  
  priorityFiles.forEach(file => {
    const category = Object.entries(fileCategories).find(([_, config]) => 
      config.files.some(f => f.path === file)
    );
    
    if (category) {
      const [_, config] = category;
      const fileData = config.files.find(f => f.path === file);
      console.log(`${config.color}${config.icon}${colors.reset} ${file.padEnd(30)} ${formatFileSize(fileData.size).padStart(10)}`);
    }
  });
  
  console.log(`\n${colors.green}✨ Analysis complete!${colors.reset}\n`);
}

// Run the script
main();