#!/usr/bin/env node

const readline = require('readline');
const fs = require('fs').promises;
const path = require('path');
const crypto = require('crypto');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

// Colors for terminal output
const colors = {
    reset: '\x1b[0m',
    red: '\x1b[31m',
    green: '\x1b[32m',
    yellow: '\x1b[33m',
    blue: '\x1b[34m',
    magenta: '\x1b[35m',
    cyan: '\x1b[36m',
    white: '\x1b[37m',
    bold: '\x1b[1m'
};

function colorize(text, color) {
    return `${colors[color]}${text}${colors.reset}`;
}

function question(prompt) {
    return new Promise((resolve) => {
        rl.question(prompt, resolve);
    });
}

async function validateEmail(email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
}

async function validateStripeKey(key, type) {
    if (type === 'secret') {
        return key.startsWith('sk_test_') || key.startsWith('sk_live_');
    } else {
        return key.startsWith('pk_test_') || key.startsWith('pk_live_');
    }
}

async function testEmailConnection(config) {
    console.log(colorize('\n🧪 Testing email connection...', 'yellow'));
    
    try {
        const nodemailer = require('nodemailer');
        const transporter = nodemailer.createTransporter({
            host: config.EMAIL_HOST,
            port: config.EMAIL_PORT,
            secure: config.EMAIL_SECURE === 'true',
            auth: {
                user: config.EMAIL_USER,
                pass: config.EMAIL_PASS
            }
        });
        
        await transporter.verify();
        console.log(colorize('✅ Email connection successful!', 'green'));
        return true;
    } catch (error) {
        console.log(colorize(`❌ Email connection failed: ${error.message}`, 'red'));
        return false;
    }
}

async function testStripeConnection(secretKey) {
    console.log(colorize('\n🧪 Testing Stripe connection...', 'yellow'));
    
    try {
        const stripe = require('stripe')(secretKey);
        await stripe.balance.retrieve();
        console.log(colorize('✅ Stripe connection successful!', 'green'));
        return true;
    } catch (error) {
        console.log(colorize(`❌ Stripe connection failed: ${error.message}`, 'red'));
        return false;
    }
}

async function generateSecrets() {
    return {
        JWT_SECRET: crypto.randomBytes(64).toString('hex'),
        SESSION_SECRET: crypto.randomBytes(32).toString('hex')
    };
}

async function createBrandFromTemplate(brandName, template) {
    const brandDir = path.join(__dirname, '..', 'marketplace', 'frontend', 'brands', brandName);
    const templateDir = path.join(__dirname, '..', 'marketplace', 'frontend', 'brands', template);
    
    try {
        // Copy template directory
        await fs.mkdir(brandDir, { recursive: true });
        
        const files = await fs.readdir(templateDir);
        for (const file of files) {
            const content = await fs.readFile(path.join(templateDir, file), 'utf8');
            await fs.writeFile(path.join(brandDir, file), content);
        }
        
        console.log(colorize(`✅ Created brand "${brandName}" from ${template} template`, 'green'));
        return true;
    } catch (error) {
        console.log(colorize(`❌ Failed to create brand: ${error.message}`, 'red'));
        return false;
    }
}

async function main() {
    console.log(colorize('\n🧠 Teneo Marketplace Setup Wizard', 'bold'));
    console.log(colorize('====================================\n', 'cyan'));
    
    const config = {};
    
    // Store Configuration
    console.log(colorize('📚 Store Configuration', 'bold'));
    console.log(colorize('────────────────────────\n', 'cyan'));
    
    config.STORE_NAME = await question('What is your store name? ');
    config.ADMIN_EMAIL = await question('What is your admin email? ');
    
    while (!await validateEmail(config.ADMIN_EMAIL)) {
        console.log(colorize('❌ Please enter a valid email address', 'red'));
        config.ADMIN_EMAIL = await question('Admin email: ');
    }
    
    config.SITE_URL = await question('What is your site URL? (e.g., https://yourdomain.com) ');
    
    // Brand Selection
    console.log(colorize('\n🎨 Brand Configuration', 'bold'));
    console.log(colorize('─────────────────────\n', 'cyan'));
    
    console.log('Available brand templates:');
    console.log('1. Teneo - AI consciousness and paradigm shifts');
    console.log('2. True Earth - Hidden knowledge and alternative history');
    console.log('3. WealthWise - Elite financial strategies');
    console.log('4. Default - Clean, professional template');
    console.log('5. Create custom brand');
    
    const brandChoice = await question('\nSelect a brand template (1-5): ');
    
    const brandMap = {
        '1': 'teneo',
        '2': 'true-earth', 
        '3': 'wealth-wise',
        '4': 'default'
    };
    
    if (brandChoice === '5') {
        const customBrandName = await question('Enter your custom brand name: ');
        const templateChoice = await question('Which template to base it on? (teneo/true-earth/wealth-wise/default): ');
        
        config.PRIMARY_BRAND = customBrandName.toLowerCase().replace(/\s+/g, '-');
        await createBrandFromTemplate(config.PRIMARY_BRAND, templateChoice);
    } else {
        config.PRIMARY_BRAND = brandMap[brandChoice] || 'default';
    }
    
    // Stripe Configuration
    console.log(colorize('\n💳 Payment Configuration (Stripe)', 'bold'));
    console.log(colorize('──────────────────────────────────\n', 'cyan'));
    
    console.log('Get your Stripe keys from: https://dashboard.stripe.com/apikeys');
    
    config.STRIPE_SECRET_KEY = await question('Stripe Secret Key (sk_test_... or sk_live_...): ');
    while (!await validateStripeKey(config.STRIPE_SECRET_KEY, 'secret')) {
        console.log(colorize('❌ Invalid Stripe secret key format', 'red'));
        config.STRIPE_SECRET_KEY = await question('Stripe Secret Key: ');
    }
    
    config.STRIPE_PUBLISHABLE_KEY = await question('Stripe Publishable Key (pk_test_... or pk_live_...): ');
    while (!await validateStripeKey(config.STRIPE_PUBLISHABLE_KEY, 'publishable')) {
        console.log(colorize('❌ Invalid Stripe publishable key format', 'red'));
        config.STRIPE_PUBLISHABLE_KEY = await question('Stripe Publishable Key: ');
    }
    
    const isLiveMode = config.STRIPE_SECRET_KEY.includes('live');
    config.STRIPE_MODE = isLiveMode ? 'live' : 'test';
    
    if (isLiveMode) {
        console.log(colorize('⚠️  LIVE MODE DETECTED - Real payments will be processed!', 'yellow'));
        const confirm = await question('Are you sure you want to use live mode? (yes/no): ');
        if (confirm.toLowerCase() !== 'yes') {
            console.log(colorize('Please use test keys for development', 'yellow'));
            process.exit(1);
        }
    }
    
    // Test Stripe connection
    await testStripeConnection(config.STRIPE_SECRET_KEY);
    
    // Email Configuration
    console.log(colorize('\n📧 Email Configuration', 'bold'));
    console.log(colorize('─────────────────────\n', 'cyan'));
    
    console.log('Choose email service:');
    console.log('1. Gmail (easiest setup)');
    console.log('2. SendGrid (recommended for production)');
    console.log('3. Custom SMTP');
    console.log('4. Skip email setup (emails will be logged to console)');
    
    const emailChoice = await question('Select email service (1-4): ');
    
    if (emailChoice === '4') {
        console.log(colorize('⚠️  Skipping email setup - emails will be logged to console', 'yellow'));
    } else {
        config.EMAIL_FROM = `${config.STORE_NAME} <noreply@${config.SITE_URL.replace('https://', '').replace('http://', '')}>`;
        
        if (emailChoice === '1') {
            // Gmail setup
            config.EMAIL_HOST = 'smtp.gmail.com';
            config.EMAIL_PORT = '587';
            config.EMAIL_SECURE = 'false';
            
            console.log('\nGmail Setup Instructions:');
            console.log('1. Enable 2-factor authentication on your Google account');
            console.log('2. Go to https://myaccount.google.com/security');
            console.log('3. Select "2-Step Verification" > "App passwords"');
            console.log('4. Generate a password for "Mail"');
            console.log('5. Use that password below (not your regular Gmail password)\n');
            
            config.EMAIL_USER = await question('Gmail address: ');
            config.EMAIL_PASS = await question('App-specific password: ');
            
        } else if (emailChoice === '2') {
            // SendGrid setup
            config.EMAIL_HOST = 'smtp.sendgrid.net';
            config.EMAIL_PORT = '587';
            config.EMAIL_SECURE = 'false';
            config.EMAIL_USER = 'apikey';
            
            console.log('\nSendGrid Setup Instructions:');
            console.log('1. Create account at https://sendgrid.com');
            console.log('2. Verify your sender identity');
            console.log('3. Create API key with "Mail Send" permissions\n');
            
            config.EMAIL_PASS = await question('SendGrid API Key: ');
            
        } else {
            // Custom SMTP
            config.EMAIL_HOST = await question('SMTP Host: ');
            config.EMAIL_PORT = await question('SMTP Port (587/465/25): ');
            config.EMAIL_SECURE = await question('Use SSL/TLS? (true/false): ');
            config.EMAIL_USER = await question('SMTP Username: ');
            config.EMAIL_PASS = await question('SMTP Password: ');
        }
        
        // Test email connection
        if (emailChoice !== '4') {
            await testEmailConnection(config);
        }
    }
    
    // Generate security secrets
    console.log(colorize('\n🔐 Generating security secrets...', 'yellow'));
    const secrets = await generateSecrets();
    Object.assign(config, secrets);
    
    // Additional configuration
    config.NODE_ENV = 'production';
    config.PORT = '3001';
    config.DATABASE_PATH = './database/marketplace.db';
    
    // Generate .env file
    console.log(colorize('\n📝 Creating .env file...', 'yellow'));
    
    const envContent = `# Teneo Marketplace Configuration
# Generated by setup wizard on ${new Date().toISOString()}

# Server Configuration
NODE_ENV=${config.NODE_ENV}
PORT=${config.PORT}

# Site Configuration
SITE_URL=${config.SITE_URL}
ADMIN_EMAIL=${config.ADMIN_EMAIL}

# Stripe Configuration
STRIPE_SECRET_KEY=${config.STRIPE_SECRET_KEY}
STRIPE_PUBLISHABLE_KEY=${config.STRIPE_PUBLISHABLE_KEY}
STRIPE_MODE=${config.STRIPE_MODE}

# Email Configuration
${config.EMAIL_HOST ? `EMAIL_HOST=${config.EMAIL_HOST}` : '# EMAIL_HOST=smtp.gmail.com'}
${config.EMAIL_PORT ? `EMAIL_PORT=${config.EMAIL_PORT}` : '# EMAIL_PORT=587'}
${config.EMAIL_SECURE ? `EMAIL_SECURE=${config.EMAIL_SECURE}` : '# EMAIL_SECURE=false'}
${config.EMAIL_USER ? `EMAIL_USER=${config.EMAIL_USER}` : '# EMAIL_USER=your-email@gmail.com'}
${config.EMAIL_PASS ? `EMAIL_PASS=${config.EMAIL_PASS}` : '# EMAIL_PASS=your-app-password'}
EMAIL_FROM=${config.EMAIL_FROM}

# Database Configuration
DATABASE_PATH=${config.DATABASE_PATH}

# Security
JWT_SECRET=${config.JWT_SECRET}
SESSION_SECRET=${config.SESSION_SECRET}

# Feature Flags
ENABLE_EMAIL=${config.EMAIL_USER ? 'true' : 'false'}
ENABLE_ANALYTICS=true
ENABLE_WEBHOOKS=true
`;
    
    const envPath = path.join(__dirname, '..', 'marketplace', 'backend', '.env');
    await fs.writeFile(envPath, envContent);
    
    console.log(colorize('✅ .env file created successfully!', 'green'));
    
    // Final summary
    console.log(colorize('\n🎉 Setup Complete!', 'bold'));
    console.log(colorize('==================\n', 'cyan'));
    
    console.log(`${colorize('Store Name:', 'bold')} ${config.STORE_NAME}`);
    console.log(`${colorize('Primary Brand:', 'bold')} ${config.PRIMARY_BRAND}`);
    console.log(`${colorize('Stripe Mode:', 'bold')} ${config.STRIPE_MODE}`);
    console.log(`${colorize('Email Enabled:', 'bold')} ${config.EMAIL_USER ? 'Yes' : 'No'}`);
    console.log(`${colorize('Admin Email:', 'bold')} ${config.ADMIN_EMAIL}`);
    
    console.log(colorize('\n🚀 Next Steps:', 'bold'));
    console.log('1. Run: npm start');
    console.log(`2. Visit: ${config.SITE_URL || 'http://localhost:3001'}`);
    console.log('3. Add your PDF books to: marketplace/frontend/books/');
    console.log('4. Update your brand catalog: marketplace/frontend/brands/');
    
    if (config.STRIPE_MODE === 'test') {
        console.log(colorize('\n💡 Test your store with these Stripe test cards:', 'yellow'));
        console.log('• Success: 4242 4242 4242 4242');
        console.log('• Decline: 4000 0000 0000 9995');
    }
    
    console.log(colorize('\nHappy selling! 🎉', 'green'));
    
    rl.close();
}

// Handle errors gracefully
process.on('unhandledRejection', (error) => {
    console.error(colorize(`\n❌ Setup failed: ${error.message}`, 'red'));
    process.exit(1);
});

process.on('SIGINT', () => {
    console.log(colorize('\n\nSetup cancelled by user', 'yellow'));
    process.exit(0);
});

// Run the wizard
main().catch(console.error);