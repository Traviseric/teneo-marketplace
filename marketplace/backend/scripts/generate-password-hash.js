#!/usr/bin/env node

// Script to generate a secure password hash for production use
// Usage: node generate-password-hash.js <password>

const bcrypt = require('bcrypt');
const crypto = require('crypto');

async function generatePasswordHash(password) {
    const saltRounds = 10;
    const hash = await bcrypt.hash(password, saltRounds);
    return hash;
}

async function generateSecurePassword() {
    // Generate a cryptographically secure random password
    const length = 16;
    const charset = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*()_+-=[]{}|;:,.<>?';
    let password = '';
    
    const randomBytes = crypto.randomBytes(length);
    for (let i = 0; i < length; i++) {
        password += charset[randomBytes[i] % charset.length];
    }
    
    return password;
}

async function main() {
    const args = process.argv.slice(2);
    
    if (args.length === 0) {
        console.log('🔐 Teneo Marketplace - Password Hash Generator\n');
        console.log('Usage:');
        console.log('  Generate hash for specific password:');
        console.log('    node generate-password-hash.js <password>\n');
        console.log('  Generate secure random password:');
        console.log('    node generate-password-hash.js --generate\n');
        
        console.log('⚠️  Security Recommendations:');
        console.log('  1. Use a strong password (min 12 characters, mixed case, numbers, symbols)');
        console.log('  2. Store the hash in ADMIN_PASSWORD_HASH environment variable');
        console.log('  3. Never commit passwords or hashes to version control');
        console.log('  4. Generate new credentials for each environment (dev, staging, production)');
        console.log('  5. Consider using a password manager for admin credentials');
        console.log('  6. Enable 2FA when implemented');
        
        return;
    }
    
    let password;
    
    if (args[0] === '--generate') {
        password = await generateSecurePassword();
        console.log('\n🔑 Generated Secure Password:');
        console.log(`   ${password}`);
        console.log('\n⚠️  Save this password securely - it cannot be recovered!\n');
    } else {
        password = args[0];
        
        // Basic password strength check
        if (password.length < 8) {
            console.error('❌ Password must be at least 8 characters long');
            process.exit(1);
        }
        
        if (password === 'admin123') {
            console.error('❌ Default password "admin123" is not allowed in production!');
            console.error('   Please choose a strong, unique password.');
            process.exit(1);
        }
    }
    
    const hash = await generatePasswordHash(password);
    
    console.log('🔐 Password Hash Generated Successfully!\n');
    console.log('Add this to your environment variables:');
    console.log(`ADMIN_PASSWORD_HASH="${hash}"`);
    console.log('\nExample .env file:');
    console.log('```');
    console.log(`# Admin Authentication`);
    console.log(`ADMIN_PASSWORD_HASH="${hash}"`);
    console.log(`SESSION_SECRET="${crypto.randomBytes(64).toString('hex')}"`);
    console.log('```');
    
    console.log('\n✅ Next Steps:');
    console.log('1. Add the hash to your .env file');
    console.log('2. Restart the server');
    console.log('3. Test login with your password');
    console.log('4. Delete this terminal history for security');
}

main().catch(error => {
    console.error('Error:', error.message);
    process.exit(1);
});