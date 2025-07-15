const http = require('http');

const testEndpoints = [
    '/api/health',
    '/api/brands', 
    '/api/books',
    '/api/search?q=test'
];

testEndpoints.forEach(endpoint => {
    http.get(`http://localhost:3001${endpoint}`, (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log(`\n${endpoint}:`);
            console.log(`Status: ${res.statusCode}`);
            console.log(`Response: ${data.substring(0, 100)}...`);
        });
    }).on('error', (err) => {
        console.error(`Error testing ${endpoint}:`, err.message);
    });
});