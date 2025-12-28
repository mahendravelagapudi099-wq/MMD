import '@testing-library/jest-dom';
import { vi } from 'vitest';

// Mock Firebase
vi.mock('firebase/app', () => ({
    initializeApp: vi.fn(),
}));

vi.mock('firebase/auth', () => ({
    getAuth: vi.fn(() => ({
        currentUser: { uid: 'mock-uid', email: 'test@example.com' },
    })),
    signInWithEmailAndPassword: vi.fn(),
    createUserWithEmailAndPassword: vi.fn(),
    signOut: vi.fn(),
    onAuthStateChanged: vi.fn((auth, cb) => {
        cb({ uid: 'mock-uid', email: 'test@example.com' });
        return vi.fn();
    }),
    sendPasswordResetEmail: vi.fn(),
}));

vi.mock('firebase/firestore', () => ({
    getFirestore: vi.fn(),
    doc: vi.fn(),
    getDoc: vi.fn(),
    setDoc: vi.fn(),
    addDoc: vi.fn(),
    collection: vi.fn(),
    query: vi.fn(),
    where: vi.fn(),
    orderBy: vi.fn(),
    getDocs: vi.fn(() => ({
        docs: [],
    })),
    serverTimestamp: vi.fn(),
}));

// Mock Ethers.js v6
const mockContract = {
    issueCertificate: vi.fn(() => ({
        wait: vi.fn().mockResolvedValue({ hash: '0xmock-tx-hash', blockNumber: 12345 }),
    })),
    verifyCertificate: vi.fn().mockResolvedValue([
        true, // exists
        true, // isValid
        'mock-hash', // certHash
        1700000000 // issueDate
    ]),
};

const mockEthers = {
    BrowserProvider: vi.fn(() => ({
        getSigner: vi.fn(() => ({
            getAddress: vi.fn().mockResolvedValue('0xmock-address'),
        })),
        getTransactionReceipt: vi.fn().mockResolvedValue({ hash: '0xmock-tx-hash' }),
    })),
    Contract: vi.fn(() => mockContract),
};

vi.mock('ethers', () => ({
    ethers: mockEthers,
    ...mockEthers // support direct named imports if needed
}));

// Mock window.ethereum
global.window.ethereum = {
    request: vi.fn().mockResolvedValue(['0xmock-address']),
    on: vi.fn(),
    removeListener: vi.fn(),
};

// Mock import.meta.env
vi.stubGlobal('import.meta', {
    env: {
        VITE_FIREBASE_API_KEY: 'mock-key',
        VITE_FIREBASE_AUTH_DOMAIN: 'mock-domain',
        VITE_FIREBASE_PROJECT_ID: 'mock-id',
        VITE_FIREBASE_STORAGE_BUCKET: 'mock-bucket',
        VITE_FIREBASE_MESSAGING_SENDER_ID: 'mock-sender',
        VITE_FIREBASE_APP_ID: 'mock-app',
    },
});
