const fs = require('fs');
const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') });

const required = [
    'PRIVATE_KEY',
    'RPC_URL',
    'PINATA_API_KEY',
    'PINATA_API_SECRET'
];

console.log('--- MDM Environment Check ---');
required.forEach(key => {
    const val = process.env[key];
    if (val) {
        console.log(`✅ ${key}: Found (${val.substring(0, 4)}...)`);
    } else {
        console.log(`❌ ${key}: MISSING`);
    }
});
console.log('----------------------------');
