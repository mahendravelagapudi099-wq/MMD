import { ethers } from "ethers";
import { getActiveNetwork } from "../config/networks";
import contractABI from "./contractABI.json";

export { getActiveNetwork };

export const getProvider = () => {
    if (window.ethereum) {
        return new ethers.BrowserProvider(window.ethereum);
    }
    return null;
};

/**
 * Ensures the user is connected to the active network
 */
export const switchNetwork = async () => {
    if (!window.ethereum) return;
    const network = getActiveNetwork();

    if (!network.autoSwitch) {
        throw new Error(`Manual Action Required: Please open MetaMask and manually select "${network.name}" (Localhost 8545).`);
    }

    try {
        await window.ethereum.request({
            method: 'wallet_switchEthereumChain',
            params: [{ chainId: network.rawChainId }],
        });
    } catch (switchError) {
        // This error code indicates that the chain has not been added to MetaMask.
        if (switchError.code === 4902) {
            try {
                await window.ethereum.request({
                    method: 'wallet_addEthereumChain',
                    params: [
                        {
                            chainId: network.rawChainId,
                            chainName: network.name,
                            nativeCurrency: {
                                name: network.chainId === 31337 ? 'ETH' : 'POL',
                                symbol: network.chainId === 31337 ? 'ETH' : 'POL',
                                decimals: 18,
                            },
                            rpcUrls: [network.rpcUrl],
                            blockExplorerUrls: [network.explorerUrl],
                        },
                    ],
                });
            } catch (addError) {
                throw new Error(`Failed to add ${network.name} network to MetaMask.`);
            }
        } else {
            throw new Error(`Failed to switch to ${network.name} network.`);
        }
    }
};

export const getContract = async () => {
    const provider = getProvider();
    if (!provider) return null;

    const networkConfig = getActiveNetwork();

    // Verify network before proceeding
    const network = await provider.getNetwork();
    const currentChainId = Number(network.chainId);
    console.log(`[Blockchain] Current Chain ID: ${currentChainId}, Expected: ${networkConfig.chainId}`);

    if (currentChainId !== networkConfig.chainId) {
        console.warn(`[Blockchain] Wrong network detected (${currentChainId}). Required: ${networkConfig.chainId}`);

        if (!networkConfig.autoSwitch) {
            throw new Error(`Network Mismatch: Please manually switch MetaMask to "${networkConfig.name}" (Chain ID ${networkConfig.chainId}) at http://127.0.0.1:8545.`);
        }

        try {
            await switchNetwork();
            // Re-verify after switch
            const updatedNetwork = await (new ethers.BrowserProvider(window.ethereum)).getNetwork();
            if (Number(updatedNetwork.chainId) !== networkConfig.chainId) {
                throw new Error(`Failed to switch to ${networkConfig.name}. Still on network ${updatedNetwork.chainId}`);
            }
            console.log(`[Blockchain] Successfully switched to ${networkConfig.name}.`);
        } catch (err) {
            console.error("[Blockchain] Network switch failed:", err);
            throw new Error(err.message || `Please switch your MetaMask to ${networkConfig.name}.`);
        }
    }

    const signer = await provider.getSigner();

    // Simplified ABI handling for Vite/React environment
    const abi = Array.isArray(contractABI) ? contractABI :
        (contractABI.abi || contractABI.default || []);

    if (abi.length === 0) {
        console.error("[Blockchain] Contract ABI is empty or invalid format.");
    }

    console.log(`[Blockchain] Creating contract instance at ${networkConfig.contractAddress} on ${networkConfig.name}`);
    const contract = new ethers.Contract(networkConfig.contractAddress, abi, signer);
    return contract;
};

export const isAddressAuthorized = async (address) => {
    console.log(`[Blockchain] Checking authorization for: ${address}`);
    const contract = await getContract();
    if (!contract) {
        console.error("[Blockchain] Contract not initialized for auth check");
        return false;
    }
    try {
        const result = await contract.isAuthorizedIssuer(address);
        console.log(`[Blockchain] Authorization result for ${address}: ${result}`);
        return result;
    } catch (err) {
        console.error("[Blockchain] Authorization check failed:", err);
        return false;
    }
};

export const connectWallet = async () => {
    if (window.ethereum) {
        try {
            console.log("[Blockchain] Requesting accounts...");
            const accounts = await window.ethereum.request({ method: "eth_requestAccounts" });
            console.log("[Blockchain] Connected accounts:", accounts);

            // Check network after connection
            const provider = getProvider();
            const network = await provider.getNetwork();
            const chainId = Number(network.chainId);
            const networkConfig = getActiveNetwork();
            console.log(`[Blockchain] Connected to Chain ID: ${chainId}, Mode: ${networkConfig.name}`);

            if (chainId !== networkConfig.chainId) {
                console.warn(`[Blockchain] Wrong network. Switching to ${networkConfig.name}...`);
                await switchNetwork();
            }

            return accounts[0];
        } catch (error) {
            console.error("[Blockchain] Wallet connection failed:", error);
            throw error;
        }
    }
    throw new Error("MetaMask not detected. Please install the MetaMask extension.");
};

export const issueCertificateOnChain = async (certId, certHash) => {
    console.log(`[Blockchain] Initializing issuance for CertID: ${certId}`);
    const contract = await getContract();
    if (!contract) throw new Error("Contract not found. Is MetaMask connected?");

    const signer = contract.runner; // In ethers v6, the signer is the runner
    const signerAddress = await signer.getAddress();
    const networkInfo = await signer.provider.getNetwork();
    const chainId = Number(networkInfo.chainId);
    const networkConfig = getActiveNetwork();

    console.log("--- Issuance Diagnostics ---");
    console.log(`[Diagnostic] Time: ${new Date().toISOString()}`);
    console.log(`[Diagnostic] Signer: ${signerAddress}`);
    console.log(`[Diagnostic] Chain ID: ${chainId}`);
    console.log(`[Diagnostic] Contract Address: ${await contract.getAddress()}`);
    console.log(`[Diagnostic] Expected Chain: ${networkConfig.chainId} (${networkConfig.name})`);
    console.log("----------------------------");

    if (chainId !== networkConfig.chainId) {
        throw new Error(`Critical Network Mismatch: Connected to ${chainId}, but ${networkConfig.name} (${networkConfig.chainId}) is required.`);
    }

    // Explicitly verify authorization one last time using the same contract instance
    console.log(`[Blockchain] Checking isAuthorizedIssuer(${signerAddress}) on contract...`);
    const authorized = await contract.isAuthorizedIssuer(signerAddress);
    console.log(`[Blockchain] Result: ${authorized}`);

    if (!authorized) {
        const owner = await contract.owner().catch(() => "unknown");
        throw new Error(`AUTH_FAILURE: Account ${signerAddress} is not authorized. Contract Owner is ${owner}.`);
    }

    try {
        console.log("[Blockchain] Calling issueCertificate...");
        // Explicitly set gas limit if needed, or let ethers estimate
        const tx = await contract.issueCertificate(certId, certHash);
        console.log("[Blockchain] Transaction submitted:", tx.hash);
        return tx;
    } catch (err) {
        console.error("[Blockchain] Transaction execution failed:", err);

        // Ethers v6 error handling
        let reason = err.reason || err.message;
        if (err.code === "ACTION_REJECTED") reason = "Transaction rejected by user.";
        if (err.data && err.data.message) reason = err.data.message;

        throw new Error(reason || "Blockchain transaction failed on Amoy.");
    }
};

export const revokeCertificateOnChain = async (certId) => {
    console.log(`[Blockchain] Initializing revocation for CertID: ${certId}`);
    const contract = await getContract();
    if (!contract) throw new Error("Contract not found. Is MetaMask connected?");

    const signer = contract.runner;
    const signerAddress = await signer.getAddress();
    console.log(`[Blockchain] Revoke Signer: ${signerAddress}`);

    try {
        const tx = await contract.revokeCertificate(certId);
        console.log("[Blockchain] Revoke transaction submitted:", tx.hash);
        return tx;
    } catch (err) {
        console.error("[Blockchain] Revoke Chain Error:", err);
        throw new Error(err.reason || err.message || "Blockchain revocation failed on Amoy.");
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
    // History fetching from blocks is deprecated for public networks due to RPC limits.
    // In production, use an indexer or event filtering.
    return [];
};

export const getExplorerUrl = async (type = "tx", value = "") => {
    const network = getActiveNetwork();
    if (!network.explorerUrl) return "#";
    return `${network.explorerUrl}/${type}/${value}`;
};
