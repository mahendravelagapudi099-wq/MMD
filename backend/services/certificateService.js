const puppeteer = require('puppeteer');
const handlebars = require('handlebars');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');

/**
 * Service to handle certificate PDF generation
 */
class CertificateService {
    constructor() {
        this.templatePath = path.join(__dirname, '../templates/certificate.html');
    }

    /**
     * Generates a PDF buffer for a certificate
     * @param {Object} certData - The certificate data (studentName, courseName, grade, etc.)
     * @returns {Promise<Buffer>} - PDF buffer
     */
    async generateCertificatePDF(certData) {
        try {
            // 1. Generate QR Code
            const verificationUrl = `${process.env.FRONTEND_URL || 'https://mdm.app'}/verify/${certData.certId}`;
            const qrCodeBase64 = await QRCode.toDataURL(verificationUrl, {
                margin: 0,
                color: {
                    dark: '#1E40AF',
                    light: '#FFFFFF'
                }
            });

            // 2. Load and Compile Template
            const templateHtml = fs.readFileSync(this.templatePath, 'utf8');
            const compiledTemplate = handlebars.compile(templateHtml);

            // Format data for template
            const templateData = {
                ...certData,
                qrCodeBase64,
                txHashShort: certData.txHash ? certData.txHash.substring(0, 12) : '0x...'
            };

            const htmlContent = compiledTemplate(templateData);

            // 3. Generate PDF with Puppeteer
            const browser = await puppeteer.launch({
                headless: 'new',
                args: ['--no-sandbox', '--disable-setuid-sandbox']
            });

            const page = await browser.newPage();

            // Set content and wait for network idle to ensure fonts are loaded
            await page.setContent(htmlContent, { waitUntil: 'networkidle0' });

            const pdfBuffer = await page.pdf({
                format: 'A4',
                landscape: true,
                printBackground: true,
                margin: {
                    top: '0px',
                    right: '0px',
                    bottom: '0px',
                    left: '0px'
                }
            });

            await browser.close();
            return pdfBuffer;

        } catch (error) {
            console.error('Error generating PDF:', error);
            throw new Error(`Failed to generate certificate PDF: ${error.message}`);
        }
    }
}

module.exports = new CertificateService();
