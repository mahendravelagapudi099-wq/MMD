# MDM Platform: Setup & Execution Guide

This guide explains how to get the Merit Documentation Management (MDM) platform running on your local machine and connected to the Polygon Amoy testnet.

## 📁 Project Structure

```text
MDM/
├── contracts/               # Solidity Smart Contracts (MeritRegistry.sol)
├── frontend/                # React + Vite Frontend
│   ├── src/components/      # Reusable UI components (Modals, Rows)
│   ├── src/pages/           # Main Page views (Home, Dashboard, Verify)
│   └── src/utils/           # Firebase, Blockchain, and Helper utils
├── backend/                 # Node.js + Express Backend
│   ├── services/            # PDF Generation logic (Puppeteer)
│   └── templates/           # HTML Certificate templates
├── integrity_test.js        # E2E Blockchain Integrity Test Suite
└── .env                     # Global Environment configuration
```

## 📋 Prerequisites

- **Node.js**: v18.x or higher
- **MetaMask**: Browser extension installed
- **Polygon Amoy Testnet**: Added to MetaMask ([Add Amoy](https://amoy.polygonscan.com))
- **Test POL**: You'll need some test POL tokens (Get from [Polygon Faucet](https://faucet.polygon.technology/))

## ⚙️ Environment Configuration

### 1. Root `.env`

Create a `.env` file in the root directory with the following:

```env
# Your deployer wallet private key (For Amoy network)
PRIVATE_KEY=your_private_key_here

# Polygon Amoy official RPC
RPC_URL=https://rpc-amoy.polygon.technology

# Etherscan API Key for contract verification
ETHERSCAN_API_KEY=your_etherscan_key_here
```

### 2. Backend Config

Ensure the `backend` directory has necessary environment variables (Firebase, etc.) if applicable.

---

## 🚀 Execution Steps

### Step 1: Install Dependencies

Run this in the root directory:

```bash
npm install
cd frontend && npm install
cd ../backend && npm install
```

### Step 2: Start the Frontend

In one terminal, from the `frontend` folder:

```bash
npm run dev
```

The app will typically be available at `http://localhost:5173`.

### Step 3: Start the Backend Service

In a separate terminal, from the `backend` folder:

```bash
node server.js
```

*Note: Ensure you have Puppeteer dependencies installed for PDF generation.*

---

## 🛡️ Smart Contract

The contract is already deployed on Polygon Amoy at:
`0x84050B0C256be4b98d06DC4dd7737e66680BBF91`

If you need to re-deploy or modify:

```bash
npx hardhat run scripts/deploy.js --network amoy
```

---

## 🧪 Testing the Trust Layer

To verify the blockchain integrity flow (REAL vs TAMPERED) on Amoy:

```bash
node integrity_test.js
```

This script will issue a test certificate and perform an automated cryptographic audit.

## 🎯 Important Usage Notes

- **Network Enforcement**: The app will automatically prompt you to switch to **Polygon Amoy (80002)** if you are on the wrong chain.
- **Issuance**: Use a wallet authorized as an "Institution" to anchor records on-chain.
- **Verification**: Anyone can verify certificates via the `/verify/public` page (No wallet required to read, but a wallet is needed for some interactive features).
