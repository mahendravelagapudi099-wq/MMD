# MDM - Maritime Document Management

A decentralized, blockchain-powered platform for issuing, managing, and verifying maritime documents securely and globally. MDM ensures that maritime records are tamper-proof, immutable, and instantly verifiable across the world using the Polygon blockchain.

## 🚀 Key Achievements - Today at a Glance

Today's focus was on transforming the platform into a professional, enterprise-grade maritime document management system with a focus on institutional trust and global interoperability.

### 1. Enterprise Branding & UI Redesign

- **Identity Shift**: Transitioned from "MeritRegistry" to **MDM (Maritime Document Management)** throughout the ecosystem.
- **Maritime Aesthetic**: Implemented a professional Navy Blue and Teal design language, optimized for government bodies and regulatory institutions.
- **Hero Transformation**: Redesigned the homepage hero section with authoritative messaging and maritime-focused iconography.

### 2. Global Verification Engine

- **Instant Lookup**: Enhanced the verification section to emphasize instant and global document integrity checks.
- **Blockchain Credibility**: Integrated Polygon Mainnet status indicators to highlight cryptographic security.
- **Mobile Fidelity**: Ensured the new professional portal is fully responsive for field officers and port authorities.

### 3. Institutional Readiness

- **How It Works**: Formalized the document issuance pipeline (Hash Registration -> Digital Signing -> Global Verification).
- **Interoperability Standards**: Optimized the architecture for open maritime standards and controlled revocation audit trails.

## 🛠️ Technology Stack

- **Frontend**: React, Tailwind CSS (Enterprise-Grade Minimalist), Lucide Icons.
- **Blockchain**: Polygon Mainnet (Certified Path), Ethers.js.
- **Storage**: Firebase (Firestore & Auth) for metadata and identity.
- **Verification**: SHA-256 Cryptographic Hashing.

## 📦 Recent Dependencies

- Installed `html5-qrcode` for the new scanning interface.

## 🛠️ Getting Started

Follow these steps to run the application locally.

### 1. Prerequisites

- **Node.js**: v18.x or higher
- **MetaMask**: Browser extension for blockchain interaction.

### 2. Backend Setup (Blockchain)

Open a terminal in the root directory:

```bash
# Install root dependencies
npm install

# Start local Hardhat node
npx hardhat node
```

*Keep this terminal running.*

### 3. Deploy Smart Contract

Open a **new** terminal in the root directory:

```bash
# Deploy to local network
npx hardhat run scripts/deploy.js --network localhost
```

*Note the deployed contract address from the output.*

### 4. Frontend Setup

Open a terminal in the `frontend` directory:

```bash
# Navigate to frontend
cd frontend

# Install dependencies
npm install

# Setup Environment
# Copy .env.example to .env and add your Firebase + Contract details
cp .env.example .env

# Run development server
npm run dev
```

### 5. Access the App

- Open `http://localhost:5173` in your browser.
- Ensure MetaMask is connected to the **Hardhat Local Network** (Chain ID: 31337).
- Import one of the private keys provided by `npx hardhat node` into MetaMask.

---
*Verified by MDM Systems. Secure. Private. Global.*
