#!/usr/bin/env node

const fs = require('fs').promises;
const path = require('path');
const https = require('https');

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    bold: '\x1b[1m'
};

function colorize(text, color) {
    return `${colors[color]}${text}${colors.reset}`;
}

class PreLaunchChecker {
    constructor() {
        this.checks = [];
        this.envVars = {};
        this.basePath = path.join(__dirname, '..');
        this.backendPath = path.join(this.basePath, 'marketplace', 'backend');
        this.frontendPath = path.join(this.basePath, 'marketplace', 'frontend');
    }

    async loadEnvironment() {
        try {
            const envPath = path.join(this.backendPath, '.env');
            const envContent = await fs.readFile(envPath, 'utf8');
            
            // Parse .env file
            envContent.split('\n').forEach(line => {
                const [key, ...valueParts] = line.split('=');
                if (key && !key.startsWith('#')) {
                    this.envVars[key.trim()] = valueParts.join('=').trim();
                }
            });
        } catch (error) {
            // .env file doesn't exist
        }
    }

    addCheck(name, description, checkFn) {
        this.checks.push({ name, description, checkFn });
    }

    async runCheck(check) {
        try {
            const result = await check.checkFn();
            return {
                ...check,
                status: result ? '✅' : '❌',
                passed: result
            };
        } catch (error) {
            return {
                ...check,
                status: '❌',
                passed: false,
                error: error.message
            };
        }
    }

    async checkStripeConfiguration() {
        const secretKey = this.envVars.STRIPE_SECRET_KEY;
        const publishableKey = this.envVars.STRIPE_PUBLISHABLE_KEY;
        
        if (!secretKey || !publishableKey) {
            return false;
        }
        
        // Validate key format
        const secretValid = secretKey.startsWith('sk_test_') || secretKey.startsWith('sk_live_');
        const pubValid = publishableKey.startsWith('pk_test_') || publishableKey.startsWith('pk_live_');
        
        if (!secretValid || !pubValid) {
            return false;
        }
        
        // Test Stripe connection
        try {
            const stripe = require('stripe')(secretKey);
            await stripe.balance.retrieve();
            return true;
        } catch (error) {
            console.log(`   ${colorize('Stripe API Error:', 'red')} ${error.message}`);
            return false;
        }
    }

    async checkEmailService() {
        const user = this.envVars.EMAIL_USER;
        const pass = this.envVars.EMAIL_PASS;
        const host = this.envVars.EMAIL_HOST;
        
        if (!user || !pass || !host) {
            return false;
        }
        
        try {
            const nodemailer = require('nodemailer');
            const transporter = nodemailer.createTransporter({
                host: host,
                port: parseInt(this.envVars.EMAIL_PORT || '587'),
                secure: this.envVars.EMAIL_SECURE === 'true',
                auth: { user, pass }
            });
            
            await transporter.verify();
            return true;
        } catch (error) {
            console.log(`   ${colorize('Email Error:', 'red')} ${error.message}`);
            return false;
        }
    }

    async checkPDFFiles() {
        const booksDir = path.join(this.frontendPath, 'books');
        let foundPDFs = false;
        
        try {
            const brands = await fs.readdir(booksDir);
            
            for (const brand of brands) {
                const brandPath = path.join(booksDir, brand);
                const stat = await fs.stat(brandPath);
                
                if (stat.isDirectory()) {
                    const files = await fs.readdir(brandPath);
                    const pdfFiles = files.filter(file => file.endsWith('.pdf'));
                    
                    if (pdfFiles.length > 0) {
                        foundPDFs = true;
                        console.log(`   Found ${pdfFiles.length} PDFs in ${brand} brand`);
                    }
                }
            }
        } catch (error) {
            return false;
        }
        
        return foundPDFs;
    }

    async checkDatabase() {
        const dbPath = path.join(this.backendPath, this.envVars.DATABASE_PATH || './database/marketplace.db');
        
        try {
            await fs.access(dbPath);
            
            // Try to connect to database
            const sqlite3 = require('sqlite3').verbose();
            return new Promise((resolve) => {
                const db = new sqlite3.Database(dbPath, (err) => {
                    if (err) {
                        resolve(false);
                    } else {
                        db.get('SELECT COUNT(*) as count FROM customers', (err, row) => {
                            db.close();
                            resolve(!err);
                        });
                    }
                });
            });
        } catch (error) {
            return false;
        }
    }

    async checkEnvironmentVariables() {
        const required = [
            'STRIPE_SECRET_KEY',
            'STRIPE_PUBLISHABLE_KEY',
            'SITE_URL',
            'ADMIN_EMAIL'
        ];
        
        return required.every(key => this.envVars[key]);
    }

    async checkSSLCertificate() {
        const siteUrl = this.envVars.SITE_URL;
        
        if (!siteUrl || !siteUrl.startsWith('https://')) {
            console.log(`   ${colorize('Warning:', 'yellow')} Site URL is not HTTPS`);
            return false;
        }
        
        return new Promise((resolve) => {
            const hostname = siteUrl.replace('https://', '').replace('http://', '').split('/')[0];
            
            const options = {
                hostname: hostname,
                port: 443,
                path: '/',
                method: 'HEAD',
                timeout: 5000
            };
            
            const req = https.request(options, (res) => {
                resolve(res.statusCode < 400);
            });
            
            req.on('error', () => resolve(false));
            req.on('timeout', () => resolve(false));
            req.end();
        });
    }

    async checkBrandConfiguration() {
        const brandsDir = path.join(this.frontendPath, 'brands');
        
        try {
            const brands = await fs.readdir(brandsDir);
            let hasValidBrand = false;
            
            for (const brand of brands) {
                const brandPath = path.join(brandsDir, brand);
                const stat = await fs.stat(brandPath);
                
                if (stat.isDirectory()) {
                    const catalogPath = path.join(brandPath, 'catalog.json');
                    
                    try {
                        const catalogContent = await fs.readFile(catalogPath, 'utf8');
                        const catalog = JSON.parse(catalogContent);
                        
                        if (catalog.books && catalog.books.length > 0) {
                            hasValidBrand = true;
                            console.log(`   Brand "${brand}" has ${catalog.books.length} books`);
                        }
                    } catch (error) {
                        // Invalid catalog
                    }
                }
            }
            
            return hasValidBrand;
        } catch (error) {
            return false;
        }
    }

    async checkServerHealth() {
        try {
            // Try to start the server briefly to test
            const { spawn } = require('child_process');
            const serverProcess = spawn('node', ['server.js'], {
                cwd: this.backendPath,
                stdio: 'pipe'
            });
            
            return new Promise((resolve) => {
                let resolved = false;
                
                const timeout = setTimeout(() => {
                    if (!resolved) {
                        resolved = true;
                        serverProcess.kill();
                        resolve(false);
                    }
                }, 5000);
                
                serverProcess.stdout.on('data', (data) => {
                    if (data.toString().includes('Server running') && !resolved) {
                        resolved = true;
                        clearTimeout(timeout);
                        serverProcess.kill();
                        resolve(true);
                    }
                });
                
                serverProcess.stderr.on('data', (data) => {
                    if (!resolved) {
                        resolved = true;
                        clearTimeout(timeout);
                        serverProcess.kill();
                        resolve(false);
                    }
                });
            });
        } catch (error) {
            return false;
        }
    }

    async run() {
        console.log(colorize('\n🚀 Pre-Launch Checklist', 'bold'));
        console.log(colorize('====================\n', 'blue'));
        
        await this.loadEnvironment();
        
        // Register all checks
        this.addCheck(
            'Environment Variables',
            'Required environment variables are configured',
            () => this.checkEnvironmentVariables()
        );
        
        this.addCheck(
            'Stripe Configuration',
            'Stripe API keys are valid and connected',
            () => this.checkStripeConfiguration()
        );
        
        this.addCheck(
            'Email Service',
            'Email service is configured and working',
            () => this.checkEmailService()
        );
        
        this.addCheck(
            'PDF Files',
            'At least one PDF book exists',
            () => this.checkPDFFiles()
        );
        
        this.addCheck(
            'Database',
            'SQLite database is initialized',
            () => this.checkDatabase()
        );
        
        this.addCheck(
            'Brand Configuration',
            'At least one brand has books configured',
            () => this.checkBrandConfiguration()
        );
        
        this.addCheck(
            'Server Health',
            'Backend server can start successfully',
            () => this.checkServerHealth()
        );
        
        if (this.envVars.SITE_URL && this.envVars.SITE_URL.startsWith('https://')) {
            this.addCheck(
                'SSL Certificate',
                'HTTPS certificate is valid (production only)',
                () => this.checkSSLCertificate()
            );
        }
        
        // Run all checks
        const results = [];
        for (const check of this.checks) {
            process.stdout.write(`${check.status || '⏳'} ${check.name}... `);
            const result = await this.runCheck(check);
            process.stdout.write(`\r${result.status} ${check.name}\n`);
            
            if (result.error) {
                console.log(`   ${colorize('Error:', 'red')} ${result.error}`);
            }
            
            results.push(result);
        }
        
        // Summary
        const passed = results.filter(r => r.passed).length;
        const total = results.length;
        
        console.log(colorize('\n📊 Summary', 'bold'));
        console.log(colorize('=========\n', 'blue'));
        
        console.log(`${colorize('Checks Passed:', 'bold')} ${passed}/${total}`);
        
        if (passed === total) {
            console.log(colorize('\n🎉 All checks passed! You\'re ready to launch!', 'green'));
            console.log(colorize('\n🚀 Launch Commands:', 'bold'));
            console.log('• npm start (development)');
            console.log('• npm run start:prod (production)');
        } else {
            console.log(colorize('\n⚠️  Some checks failed. Please fix the issues above before launching.', 'yellow'));
            
            const failedChecks = results.filter(r => !r.passed);
            console.log(colorize('\n❌ Failed Checks:', 'bold'));
            failedChecks.forEach(check => {
                console.log(`• ${check.name}: ${check.description}`);
            });
            
            console.log(colorize('\n💡 Quick Fixes:', 'bold'));
            if (!this.envVars.STRIPE_SECRET_KEY) {
                console.log('• Run: node deploy/setup-wizard.js');
            }
            if (failedChecks.some(c => c.name === 'PDF Files')) {
                console.log('• Run: npm run generate:pdfs');
            }
            if (failedChecks.some(c => c.name === 'Database')) {
                console.log('• Run: npm run setup:db');
            }
        }
        
        console.log(colorize('\n📚 Documentation: https://github.com/TravisEric/teneo-marketplace', 'blue'));
        console.log(colorize('💬 Support: https://discord.gg/teneebooks\n', 'blue'));
        
        process.exit(passed === total ? 0 : 1);
    }
}

// Run the checker
const checker = new PreLaunchChecker();
checker.run().catch(console.error);