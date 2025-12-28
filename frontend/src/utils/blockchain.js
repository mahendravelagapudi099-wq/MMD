import { ethers } from "ethers";
import contractAddress from "./contractAddress.json";
import contractABI from "./contractABI.json";

export const getProvider = () => {
    if (window.ethereum) {
        return new ethers.BrowserProvider(window.ethereum);
    }
    return null;
};

export const getContract = async () => {
    const provider = getProvider();
    if (!provider) return null;

    const signer = await provider.getSigner();

    // Robustly handle different ABI formats (String, Object with default, or Array)
    let abi;
    try {
        if (typeof contractABI === 'string') {
            abi = JSON.parse(contractABI);
        } else if (Array.isArray(contractABI)) {
            abi = contractABI;
        } else if (contractABI.default) {
            abi = Array.isArray(contractABI.default) ? contractABI.default : JSON.parse(contractABI.default);
        } else {
            abi = [];
        }
    } catch (e) {
        console.error("Error parsing ABI:", e);
        abi = [];
    }

    if (abi.length === 0) {
        console.error("Contract ABI is empty or invalid format.");
    }

    const contract = new ethers.Contract(contractAddress.address, abi, signer);
    return contract;
};

export const connectWallet = async () => {
    if (window.ethereum) {
        try {
            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            return accounts[0];
        } catch (error) {
            console.error("Wallet connection failed:", error);
            throw error;
        }
    }
    throw new Error("MetaMask not detected. Please install the MetaMask extension.");
};

export const issueCertificateOnChain = async (certId, certHash) => {
    const contract = await getContract();
    if (!contract) throw new Error("Contract not found. Is MetaMask connected?");

    try {
        const tx = await contract.issueCertificate(certId, certHash);
        return tx;
    } catch (err) {
        console.error("Chain Error:", err);
        throw new Error(err.reason || err.message || "Blockchain transaction failed.");
    }
};

export const getTransactionStatus = async (txHash) => {
    const provider = getProvider();
    if (!provider) return null;
    return await provider.getTransactionReceipt(txHash);
};

export const estimateGas = async (certId, certHash) => {
    const contract = await getContract();
    if (!contract) return null;
    try {
        return await contract.issueCertificate.estimateGas(certId, certHash);
    } catch (err) {
        console.warn("Gas estimation failed:", err);
        return null;
    }
};

export const getTransactionHistory = async (limit = 10) => {
    const provider = getProvider();
    if (!provider) return [];

    try {
        const latestBlock = await provider.getBlockNumber();
        const history = [];

        // Let's fetch the last few blocks to find transactions
        for (let i = 0; i < Math.min(Number(latestBlock) + 1, 10); i++) {
            const block = await provider.getBlock(Number(latestBlock) - i, true);
            if (block && block.transactions.length > 0) {
                block.transactions.forEach(txHash => {
                    history.push({
                        hash: typeof txHash === 'string' ? txHash : txHash.hash,
                        blockNumber: block.number,
                        timestamp: block.timestamp,
                        status: "Confirmed (Local)"
                    });
                });
            }
            if (history.length >= limit) break;
        }
        return history;
    } catch (err) {
        console.warn("History Fetch Fail:", err);
        return [];
    }
};

export const getExplorerUrl = async (type = "tx", value = "") => {
    const provider = getProvider();
    if (!provider) return "#";

    try {
        const network = await provider.getNetwork();
        const chainId = Number(network.chainId);

        let baseUrl = "";
        if (chainId === 80002) {
            baseUrl = "https://amoy.polygonscan.com";
        } else if (chainId === 31337) {
            // Hardhat local node - no public explorer
            return `local-proof://${value}`;
        } else {
            baseUrl = "https://polygonscan.com";
        }

        return `${baseUrl}/${type}/${value}`;
    } catch (err) {
        return "#";
    }
};
