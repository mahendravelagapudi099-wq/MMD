require('dotenv').config();
const certificateService = require('./services/certificateService');
const fs = require('fs');
const path = require('path');

async function testGeneration() {
    console.log('Starting PDF generation test...');

    const mockData = {
        certId: 'CERT-20260125-DEBUG',
        studentName: 'John Doe',
        courseName: 'Blockchain Development Mastery',
        grade: 'Distinction',
        institutionName: 'MDM Martime Academy',
        issueDate: 'Jan 25, 2026',
        txHash: '0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef',
        studentPhotoBase64: 'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg=='
    };

    try {
        const pdfBuffer = await certificateService.generateCertificatePDF(mockData);

        const outputPath = path.join(__dirname, 'test-certificate.pdf');
        fs.writeFileSync(outputPath, pdfBuffer);

        console.log(`Success! PDF generated at: ${outputPath}`);
        console.log(`Buffer size: ${pdfBuffer.length} bytes`);

        if (pdfBuffer.length > 1000 && pdfBuffer.slice(0, 4).toString() === '%PDF') {
            console.log('PDF header verification: PASSED');
        } else {
            console.error('PDF header verification: FAILED');
        }

    } catch (error) {
        console.error('Test failed:', error);
    }
}

testGeneration();
