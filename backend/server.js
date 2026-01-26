const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
require('dotenv').config({ path: path.join(__dirname, '..', '.env') }); // Fallback to root .env
const express = require('express');
const cors = require('cors');
const certificateService = require('./services/certificateService');
const ipfsService = require('./services/ipfsService');

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Basic health check
app.get('/health', (req, res) => {
    res.json({
        status: 'up',
        network: 'Polygon Amoy',
        ipfsConfigured: ipfsService.isConfigured
    });
});

/**
 * Endpoint to generate a PDF for a certificate
 */
app.post('/api/certificates/generate-pdf', async (req, res) => {
    try {
        const certData = req.body;

        if (!certData.certId || !certData.studentName) {
            return res.status(400).json({ error: 'Missing required certificate data' });
        }

        const pdfBuffer = await certificateService.generateCertificatePDF(certData);

        res.set({
            'Content-Type': 'application/pdf',
            'Content-Disposition': `attachment; filename=certificate-${certData.certId}.pdf`,
            'Content-Length': pdfBuffer.length
        });

        res.send(pdfBuffer);
    } catch (error) {
        console.error('PDF Generation API Error:', error);
        res.status(500).json({ error: error.message });
    }
});

/**
 * Endpoint to generate a PDF and upload it to IPFS
 */
app.post('/api/certificates/anchor-to-ipfs', async (req, res) => {
    try {
        const certData = req.body;

        if (!certData.certId || !certData.studentName) {
            return res.status(400).json({ error: 'Missing required certificate data' });
        }

        console.log(`Generating production certificate for: ${certData.certId}`);

        // 1. Generate PDF
        const pdfBuffer = await certificateService.generateCertificatePDF(certData);

        // 2. Upload to IPFS
        const fileName = `Certificate_${certData.certId}.pdf`;
        const metadata = {
            certId: certData.certId,
            studentName: certData.studentName,
            courseName: certData.courseName,
            issueDate: certData.issueDate
        };

        const ipfsResult = await ipfsService.uploadBuffer(pdfBuffer, fileName, metadata);

        // 3. Return CID and Gateway URL
        res.json({
            success: true,
            ipfsHash: ipfsResult.IpfsHash,
            gatewayUrl: ipfsResult.gatewayUrl,
            pinSize: ipfsResult.PinSize
        });

    } catch (error) {
        console.error('IPFS Anchoring API Error:', error);
        return res.status(500).json({
            success: false,
            error: error.message || 'Internal Server Error during IPFS anchoring'
        });
    }
});

/**
 * Global Error Handler - Ensures all errors are returned as JSON
 */
app.use((err, req, res, next) => {
    console.error('Global Error Handler:', err);
    res.status(err.status || 500).json({
        success: false,
        error: err.message || 'An unexpected error occurred on the server.'
    });
});

/**
 * 404 Handler - Ensures missing routes return JSON
 */
app.use((req, res) => {
    res.status(404).json({
        success: false,
        error: `Route ${req.originalUrl} not found`
    });
});

app.listen(PORT, () => {
    console.log(`--------------------------------------------------`);
    console.log(`MDM Backend Service Running`);
    console.log(`URL: http://localhost:${PORT}`);
    console.log(`Network Source: Polygon Amoy`);
    console.log(`--------------------------------------------------`);
});
