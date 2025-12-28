import { describe, it, expect, vi } from 'vitest';
import { connectWallet, issueCertificateOnChain } from '../utils/blockchain';

describe('Blockchain Utilities', () => {
    it('should request wallet connection', async () => {
        const address = await connectWallet();
        expect(window.ethereum.request).toHaveBeenCalledWith({ method: 'eth_requestAccounts' });
        expect(address).toBe('0xmock-address');
    });

    it('should call issueCertificate on the contract', async () => {
        const certId = 'CERT-123';
        const certHash = 'mockhash';
        const tx = await issueCertificateOnChain(certId, certHash);

        expect(tx).toBeDefined();
        expect(tx.wait).toBeDefined();
        const receipt = await tx.wait();
        expect(receipt.hash).toBe('0xmock-tx-hash');
    });
});
