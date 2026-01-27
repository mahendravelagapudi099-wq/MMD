const crypto = require('crypto');
const fs = require('fs');
const path = require('path');

class SignatureService {
    constructor() {
        this.keysDir = path.join(__dirname, '../keys');
        this.privateKeyPath = path.join(this.keysDir, 'private.pem');
        this.publicKeyPath = path.join(this.keysDir, 'public.pem');
        this.init();
    }

    init() {
        // Ensure keys directory exists
        if (!fs.existsSync(this.keysDir)) {
            fs.mkdirSync(this.keysDir, { recursive: true });
        }

        // Load or Generate Keys
        if (fs.existsSync(this.privateKeyPath) && fs.existsSync(this.publicKeyPath)) {
            this.privateKey = fs.readFileSync(this.privateKeyPath, 'utf8');
            this.publicKey = fs.readFileSync(this.publicKeyPath, 'utf8');
            console.log('Digital Signature Service: Keys Loaded.');
        } else {
            console.log('Digital Signature Service: Generating new RSA Key Pair...');
            const { privateKey, publicKey } = crypto.generateKeyPairSync('rsa', {
                modulusLength: 2048,
                publicKeyEncoding: {
                    type: 'spki',
                    format: 'pem'
                },
                privateKeyEncoding: {
                    type: 'pkcs8',
                    format: 'pem'
                }
            });

            this.privateKey = privateKey;
            this.publicKey = publicKey;

            fs.writeFileSync(this.privateKeyPath, privateKey);
            fs.writeFileSync(this.publicKeyPath, publicKey);
            console.log('Digital Signature Service: Keys Generated and Saved.');
        }
    }

    /**
     * Signs a data hash using the private key.
     * @param {string} dataHash - The SHA-256 hash to sign.
     * @returns {string} - The signature in hex format.
     */
    sign(dataHash) {
        if (!dataHash) throw new Error("Data hash is required for signing.");

        const sign = crypto.createSign('SHA256');
        sign.update(dataHash);
        sign.end();
        const signature = sign.sign(this.privateKey, 'hex');
        return signature;
    }

    /**
     * Returns the Public Key.
     * @returns {string} - Public Key in PEM format.
     */
    getPublicKey() {
        return this.publicKey;
    }
}

module.exports = new SignatureService();
