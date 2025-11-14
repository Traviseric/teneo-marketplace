#!/usr/bin/env node
/**
 * preflight-check.js - Pre-deployment validation script
 * Validates environment configuration and dependencies before deployment
 *
 * Usage: node scripts/preflight-check.js [environment]
 */

const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ENVIRONMENT = process.argv[2] || 'production';
const PROJECT_ROOT = path.join(__dirname, '..');
const BACKEND_PATH = path.join(PROJECT_ROOT, 'marketplace', 'backend');

// Color codes
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m'
};

let errors = [];
let warnings = [];
let checks = [];

function log(message, color = 'reset') {
    console.log(`${colors[color]}${message}${colors.reset}`);
}

function check(name, fn) {
    checks.push({ name, fn });
}

function error(message) {
    errors.push(message);
    log(`  ❌ ${message}`, 'red');
}

function warn(message) {
    warnings.push(message);
    log(`  ⚠️  ${message}`, 'yellow');
}

function success(message) {
    log(`  ✓ ${message}`, 'green');
}

// Check 1: Node.js version
check('Node.js version', () => {
    const nodeVersion = process.version;
    const majorVersion = parseInt(nodeVersion.slice(1).split('.')[0]);

    if (majorVersion < 14) {
        error(`Node.js version ${nodeVersion} is too old. Minimum required: v14.0.0`);
    } else {
        success(`Node.js ${nodeVersion}`);
    }
});

// Check 2: Required files exist
check('Required files', () => {
    const requiredFiles = [
        'package.json',
        'marketplace/backend/server.js',
        'marketplace/backend/database/init.js',
        'marketplace/frontend/index.html'
    ];

    let allExist = true;
    requiredFiles.forEach(file => {
        const filePath = path.join(PROJECT_ROOT, file);
        if (!fs.existsSync(filePath)) {
            error(`Missing required file: ${file}`);
            allExist = false;
        }
    });

    if (allExist) {
        success('All required files present');
    }
});

// Check 3: Environment file
check('Environment configuration', () => {
    const envPath = path.join(BACKEND_PATH, '.env');

    if (!fs.existsSync(envPath)) {
        error('.env file not found. Run: cp .env.example .env');
        return;
    }

    const envContent = fs.readFileSync(envPath, 'utf8');
    const requiredVars = [
        'SESSION_SECRET',
        'ADMIN_PASSWORD_HASH'
    ];

    const productionVars = [
        'STRIPE_SECRET_KEY',
        'STRIPE_PUBLISHABLE_KEY',
        'FRONTEND_URL'
    ];

    requiredVars.forEach(varName => {
        if (!envContent.includes(`${varName}=`) || envContent.includes(`${varName}=\n`)) {
            error(`Missing required environment variable: ${varName}`);
        }
    });

    if (ENVIRONMENT === 'production') {
        productionVars.forEach(varName => {
            if (!envContent.includes(`${varName}=`) ||
                envContent.includes(`${varName}=\n`) ||
                envContent.includes('CONFIGURE') ||
                envContent.includes('sk_test') ||
                envContent.includes('pk_test')) {
                warn(`Production variable not configured: ${varName}`);
            }
        });
    }

    // Check for dangerous defaults
    if (envContent.includes('ChangeMeInProduction')) {
        error('Default password detected in .env file');
    }

    if (envContent.includes('sk_test') && ENVIRONMENT === 'production') {
        error('Stripe test keys detected in production environment');
    }

    success('Environment file validated');
});

// Check 4: Dependencies installed
check('Node dependencies', () => {
    const nodeModulesPath = path.join(PROJECT_ROOT, 'node_modules');

    if (!fs.existsSync(nodeModulesPath)) {
        error('node_modules not found. Run: npm install');
        return;
    }

    const packageJson = JSON.parse(fs.readFileSync(path.join(PROJECT_ROOT, 'package.json'), 'utf8'));
    const requiredDeps = Object.keys(packageJson.dependencies || {});

    let allInstalled = true;
    requiredDeps.forEach(dep => {
        const depPath = path.join(nodeModulesPath, dep);
        if (!fs.existsSync(depPath)) {
            error(`Missing dependency: ${dep}`);
            allInstalled = false;
        }
    });

    if (allInstalled) {
        success(`All ${requiredDeps.length} dependencies installed`);
    }
});

// Check 5: Git repository status
check('Git repository', () => {
    try {
        const branch = execSync('git rev-parse --abbrev-ref HEAD', { encoding: 'utf8' }).trim();
        const status = execSync('git status --porcelain', { encoding: 'utf8' }).trim();

        if (ENVIRONMENT === 'production' && branch !== 'main') {
            warn(`Deploying from branch '${branch}' instead of 'main'`);
        }

        if (status) {
            warn('Uncommitted changes detected');
        } else {
            success(`On branch '${branch}' with clean working tree`);
        }
    } catch (err) {
        warn('Not a git repository or git not installed');
    }
});

// Check 6: Sensitive files not committed
check('Sensitive files protection', () => {
    const gitignorePath = path.join(PROJECT_ROOT, '.gitignore');

    if (!fs.existsSync(gitignorePath)) {
        error('.gitignore file missing');
        return;
    }

    const gitignore = fs.readFileSync(gitignorePath, 'utf8');
    const requiredIgnores = [
        '.env',
        '*.db',
        '*.sqlite',
        'node_modules',
        '*.pdf'
    ];

    let allProtected = true;
    requiredIgnores.forEach(pattern => {
        if (!gitignore.includes(pattern)) {
            error(`Missing from .gitignore: ${pattern}`);
            allProtected = false;
        }
    });

    if (allProtected) {
        success('Sensitive files properly ignored');
    }
});

// Check 7: Database schema
check('Database schema', () => {
    const schemaPath = path.join(BACKEND_PATH, 'database', 'schema.sql');

    if (!fs.existsSync(schemaPath)) {
        error('Database schema file not found');
        return;
    }

    const schema = fs.readFileSync(schemaPath, 'utf8');
    const requiredTables = ['orders', 'download_tokens', 'audit_log'];

    let allTables = true;
    requiredTables.forEach(table => {
        if (!schema.includes(`CREATE TABLE ${table}`) && !schema.includes(`CREATE TABLE IF NOT EXISTS ${table}`)) {
            error(`Missing table definition: ${table}`);
            allTables = false;
        }
    });

    if (allTables) {
        success('Database schema valid');
    }
});

// Check 8: Port availability
check('Port availability', () => {
    try {
        const netstat = execSync('netstat -tuln 2>/dev/null || ss -tuln', { encoding: 'utf8' });
        const port = process.env.PORT || 3001;

        if (netstat.includes(`:${port} `)) {
            warn(`Port ${port} is already in use`);
        } else {
            success(`Port ${port} is available`);
        }
    } catch (err) {
        warn('Unable to check port availability');
    }
});

// Check 9: Directory permissions
check('Directory permissions', () => {
    const writableDirs = [
        path.join(BACKEND_PATH, 'database'),
        path.join(PROJECT_ROOT, 'marketplace', 'frontend', 'brands')
    ];

    let allWritable = true;
    writableDirs.forEach(dir => {
        try {
            if (fs.existsSync(dir)) {
                const testFile = path.join(dir, '.write-test');
                fs.writeFileSync(testFile, 'test');
                fs.unlinkSync(testFile);
            }
        } catch (err) {
            error(`Directory not writable: ${dir}`);
            allWritable = false;
        }
    });

    if (allWritable) {
        success('All directories writable');
    }
});

// Check 10: Security configuration
check('Security configuration', () => {
    const serverPath = path.join(BACKEND_PATH, 'server.js');
    const serverContent = fs.readFileSync(serverPath, 'utf8');

    if (!serverContent.includes('csrf')) {
        warn('CSRF protection not detected');
    }

    if (!serverContent.includes('helmet') && !serverContent.includes('requireHTTPS')) {
        warn('Security headers middleware not detected');
    }

    if (serverContent.includes('app.use(cors())') && !serverContent.includes('origin:')) {
        warn('CORS configured to allow all origins');
    }

    success('Security configuration checked');
});

// Run all checks
async function runChecks() {
    log('\n🔍 Running pre-flight checks for deployment...', 'blue');
    log(`Environment: ${ENVIRONMENT}\n`, 'blue');

    for (const { name, fn } of checks) {
        log(`\n${name}:`, 'yellow');
        await fn();
    }

    // Summary
    log('\n' + '='.repeat(60), 'blue');
    log('PRE-FLIGHT CHECK SUMMARY', 'blue');
    log('='.repeat(60), 'blue');

    log(`\n✓ Passed: ${checks.length - errors.length - warnings.length}`, 'green');

    if (warnings.length > 0) {
        log(`⚠️  Warnings: ${warnings.length}`, 'yellow');
    }

    if (errors.length > 0) {
        log(`❌ Errors: ${errors.length}`, 'red');
    }

    log('\n');

    if (errors.length > 0) {
        log('❌ PRE-FLIGHT CHECK FAILED', 'red');
        log('Fix the errors above before deploying.\n', 'red');
        process.exit(1);
    } else if (warnings.length > 0) {
        log('⚠️  PRE-FLIGHT CHECK PASSED WITH WARNINGS', 'yellow');
        log('Review warnings before deploying to production.\n', 'yellow');
        process.exit(0);
    } else {
        log('✅ PRE-FLIGHT CHECK PASSED', 'green');
        log('Ready for deployment!\n', 'green');
        process.exit(0);
    }
}

runChecks().catch(err => {
    log(`\nFatal error during pre-flight check: ${err.message}`, 'red');
    process.exit(1);
});
