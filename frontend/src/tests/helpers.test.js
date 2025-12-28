import { describe, it, expect } from 'vitest';
import { generateCertId, hashCertificateData } from '../utils/helpers';

describe('Helper Utilities', () => {
    it('should generate a unique Certificate ID in correct format', () => {
        const certId = generateCertId();
        expect(certId).toMatch(/^CERT-\d{8}-/);
    });

    it('should create a consistent SHA-256 hash of certificate data', () => {
        const data = {
            studentName: 'John Doe',
            studentId: '12345',
            courseName: 'Blockchain 101'
        };

        const hash1 = hashCertificateData(data);
        const hash2 = hashCertificateData({ ...data }); // same data
        const hash3 = hashCertificateData({ ...data, studentName: 'Jane Doe' }); // different data

        expect(hash1).toBe(hash2);
        expect(hash1).not.toBe(hash3);
        expect(hash1).toHaveLength(64); // SHA-256 hex length
    });
});
