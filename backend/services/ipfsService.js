const pinataSDK = require('@pinata/sdk');
const { Readable } = require('stream');

/**
 * Service to handle uploading files to IPFS via Pinata
 */
class IpfsService {
    constructor() {
        this.pinata = null;
        this.isConfigured = false;
        this.init();
    }

    init() {
        const apiKey = process.env.PINATA_API_KEY;
        const apiSecret = process.env.PINATA_API_SECRET;

        if (apiKey && apiSecret) {
            this.pinata = new pinataSDK(apiKey, apiSecret);
            this.isConfigured = true;
            console.log('Pinata IPFS Service Initialized');
        } else {
            console.warn('Pinata API keys not found in environment variables. IPFS uploads will fail.');
        }
    }

    /**
     * Uploads a buffer to IPFS via Pinata
     * @param {Buffer} buffer - File buffer to upload
     * @param {string} fileName - Name for the file in Pinata
     * @param {Object} metadata - Optional metadata (key-value pairs)
     * @returns {Promise<Object>} - Pinata upload result { IpfsHash, PinSize, Timestamp }
     */
    async uploadBuffer(buffer, fileName, metadata = {}) {
        if (!this.isConfigured) {
            throw new Error('IPFS Service not configured. Check PINATA_API_KEY and PINATA_API_SECRET.');
        }

        try {
            // Convert buffer to readable stream for Pinata SDK
            const stream = new Readable();
            stream.push(buffer);
            stream.push(null);

            const options = {
                pinataMetadata: {
                    name: fileName,
                    keyvalues: metadata
                },
                pinataOptions: {
                    cidVersion: 0
                }
            };

            const result = await this.pinata.pinFileToIPFS(stream, options);

            // Add gateway URL for convenience
            const gatewayUrl = `https://gateway.pinata.cloud/ipfs/${result.IpfsHash}`;

            return {
                ...result,
                gatewayUrl
            };
        } catch (error) {
            console.error('Pinata IPFS Upload Error:', error);
            throw new Error(`Failed to upload to IPFS: ${error.message}`);
        }
    }

    /**
     * Verifies connection to Pinata
     */
    async authenticate() {
        if (!this.isConfigured) return false;
        try {
            const result = await this.pinata.testAuthentication();
            return result.authenticated === true;
        } catch (err) {
            console.error('Pinata Authentication Failed:', err);
            return false;
        }
    }
}

module.exports = new IpfsService();
