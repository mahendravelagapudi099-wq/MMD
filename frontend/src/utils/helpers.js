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
