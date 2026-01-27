import CryptoJS from "crypto-js";

/**
 * Generates a unique Certificate ID
 * Format: CERT-YYYYMMDD-RANDOM
 */
export const generateCertId = () => {
    const date = new Date().toISOString().slice(0, 10).replace(/-/g, "");
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `CERT-${date}-${random}`;
};

/**
 * Creates SHA-256 hash of certificate data object.
 * Normalizes strings and ensures a consistent set of keys to prevent mismatch.
 */
export const hashCertificateData = (data) => {
    // Define the canonical set of keys in a fixed order (Integrity-only fields)
    const canonicalKeys = [
        "certId",
        "studentId",
        "courseName",
        "grade",
        "issueDate"
    ];

    // Create a normalized object with guaranteed keys
    const normalizedData = {};
    canonicalKeys.forEach(key => {
        const val = data[key];
        // Normalize: trim strings, handle null/undefined as empty string, ensure strings
        normalizedData[key] = (val !== null && val !== undefined) ? String(val).trim() : "";
    });

    // Sort to ensure absolute determinism
    const sortedData = Object.keys(normalizedData)
        .sort()
        .reduce((obj, key) => {
            obj[key] = normalizedData[key];
            return obj;
        }, {});

    const dataString = JSON.stringify(sortedData);
    return CryptoJS.SHA256(dataString).toString();
};

/**
 * Format date for display
 */
export const formatDate = (dateString) => {
    if (!dateString) return "N/A";
    return new Date(dateString).toLocaleDateString("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
    });
};

// --- Digital Signature Helpers ---

const pemToArrayBuffer = (pem) => {
    const b64Lines = pem.replace(/-----[^-]+-----/g, "").replace(/\s+/g, "");
    const str = atob(b64Lines);
    const buf = new ArrayBuffer(str.length);
    const bufView = new Uint8Array(buf);
    for (let i = 0, strLen = str.length; i < strLen; i++) {
        bufView[i] = str.charCodeAt(i);
    }
    return buf;
};

const hexToArrayBuffer = (hexString) => {
    return new Uint8Array(hexString.match(/.{1,2}/g).map(byte => parseInt(byte, 16))).buffer;
};

const strToArrayBuffer = (str) => {
    const encoder = new TextEncoder();
    return encoder.encode(str);
};

/**
 * Verifies a digital signature using the Institution's Public Key.
 * Uses Web Crypto API (RSASSA-PKCS1-v1_5 with SHA-256).
 */
export const verifyDigitalSignature = async (certHash, signatureHex, publicKeyPem) => {
    try {
        if (!publicKeyPem || !signatureHex || !certHash) return false;

        // Import Public Key
        const binaryDer = pemToArrayBuffer(publicKeyPem);
        const publicKey = await window.crypto.subtle.importKey(
            "spki",
            binaryDer,
            {
                name: "RSASSA-PKCS1-v1_5",
                hash: "SHA-256",
            },
            false,
            ["verify"]
        );

        // Verify Signature
        // Note: Node's sign.sign() signs the *data*, but here we have the *hash*.
        // Wait, Node's `sign.update(hash)` signs the *content of the hash string*? 
        // OR does it sign the raw bytes?
        // In `signatureService.js`:
        // sign.update(dataHash); -> dataHash is a hex string from `hashCertificateData` (CryptoJS output).
        // So we signed the HEX STRING of the hash. 
        // So we must verify the HEX STRING of the hash.

        const dataBuffer = strToArrayBuffer(certHash);
        const signatureBuffer = hexToArrayBuffer(signatureHex);

        const isValid = await window.crypto.subtle.verify(
            "RSASSA-PKCS1-v1_5",
            publicKey,
            signatureBuffer,
            dataBuffer
        );

        return isValid;
    } catch (err) {
        console.error("Signature Verification Error:", err);
        return false;
    }
};

