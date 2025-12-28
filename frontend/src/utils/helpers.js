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
 * Creates SHA-256 hash of certificate data object
 */
export const hashCertificateData = (data) => {
    // Canonical string representation for consistent hashing
    const sortedData = Object.keys(data).sort().reduce((obj, key) => {
        obj[key] = data[key];
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
