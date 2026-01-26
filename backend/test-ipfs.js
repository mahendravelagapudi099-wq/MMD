require('dotenv').config({ path: '../.env' });
const ipfsService = require('./services/ipfsService');

async function testIpfsUpload() {
    console.log('--- Pinata IPFS Upload Validation ---');

    // 1. Check configuration
    if (!process.env.PINATA_API_KEY || !process.env.PINATA_API_SECRET) {
        console.error('❌ Error: PINATA_API_KEY or PINATA_API_SECRET missing in root .env');
        process.exit(1);
    }

    // 2. Test Authentication
    console.log('Testing Pinata authentication...');
    const isAuthenticated = await ipfsService.authenticate();
    if (!isAuthenticated) {
        console.error('❌ Error: Pinata authentication failed. Check your API keys.');
        process.exit(1);
    }
    console.log('✅ Pinata authenticated successfully.');

    // 3. Create dummy PDF buffer
    console.log('Creating dummy PDF buffer for test...');
    const dummyBuffer = Buffer.from('%PDF-1.4\n1 0 obj\n<</Type/Catalog/Pages 2 0 R>>\nendobj\n2 0 obj\n<</Type/Pages/Count 1/Kids[3 0 R]>>\nendobj\n3 0 obj\n<</Type/Page/Parent 2 0 R/MediaBox[0 0 612 792]/Contents 4 0 R>>\nendobj\n4 0 obj\n<</Length 44>>\nstream\nBT /F1 24 Tf 100 700 Td (Pinata Test PDF) Tj ET\nendstream\nendobj\nxref\n0 5\n0000000000 65535 f\n0000000009 00000 n\n0000000058 00000 n\n0000000115 00000 n\n0000000212 00000 n\ntrailer\n<</Size 5/Root 1 0 R>>\nstartxref\n306\n%%EOF');

    // 4. Upload to IPFS
    console.log('Uploading to IPFS...');
    try {
        const result = await ipfsService.uploadBuffer(
            dummyBuffer,
            'Pinata_Validation_Test.pdf',
            { test: 'true', environment: 'development' }
        );

        console.log('✅ Upload Success!');
        console.log('CID:', result.IpfsHash);
        console.log('Gateway URL:', result.gatewayUrl);
        console.log('Pin Size:', result.PinSize);
        console.log('--- Validation Complete ---');

    } catch (error) {
        console.error('❌ Upload Failed:', error.message);
    }
}

testIpfsUpload();
