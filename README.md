# MeritRegistry (MDM) - Secure Document Management

A decentralized, blockchain-powered academic credential verification system. MERITREGISTRY ensures that certificates are tamper-proof, immutable, and instantly verifiable across the world using the Polygon blockchain.

## 🚀 Key Achievements - Today at a Glance

Today's focus was on enhancing the verification experience, improving accessibility via QR codes, and ensuring the platform is fully responsive for all devices.

### 1. Robust Verification Architecture

- **Input Stability**: Refactored the `VerificationPage` to eliminate focus-loss issues and improve input handling for manual claim checks.
- **Multi-Field Search**: Users can now search by either **Certificate ID** or **Student ID**, providing more flexibility for employers and registrars.
- **Deep-Link Verification**: Syncing URL parameters with the verification engine allows for instant "one-click" verification from shared links.

### 2. QR Scanning System (Mobile-Ready)

- **New QR Scanner Page**: Implemented a real-time viewfinder using `@html5-qrcode` for instant cryptographic decoding from physical certificates.
- **Integrated Scanning**: Integrated QR access points into the primary navigation and the Public Registry dashboard.
- **Themed UI**: Customized the scanner interface with high-contrast, security-themed aesthetics to match the MeritRegistry design language.

### 3. Responsiveness Audit & UI Refinement

- **Mobile-First Optimization**: Audited all core pages (Home, Login, Dashboard, Portal) to ensure a premium experience on phones and tablets.
- **Adaptive Layouts**: Fixed overflow issues on small screens, particularly with absolutely positioned controls on the Registry page.
- **Standardized Components**: Refined font scaling and component spacing to maintain visual hierarchy across PC, Laptop, and Mobile views.

## 🛠️ Technology Stack

- **Frontend**: React, Tailwind CSS (Vanilla aesthetics), Lucide Icons.
- **Blockchain**: Polygon (Amoy Testnet), Ethers.js.
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
*Verified by MeritRegistry Labs. Secure. Private. Permanent.*
