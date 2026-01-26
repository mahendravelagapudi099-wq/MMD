import contractAddress from "../utils/contractAddress.json";

export const NETWORKS = {
    // DEVELOPMENT-ONLY: Removing Hardhat later only requires deleting this 'local' entry 
    // and setting VITE_NETWORK_MODE=amoy in your .env
    local: {
        name: "Hardhat Local",
        chainId: 31337,
        rawChainId: "0x7A69",
        rpcUrl: "http://127.0.0.1:8545",
        contractAddress: "0x5FbDB2315678afecb367f032d93F642f64180aa3",
        explorerUrl: "http://localhost:8545",
        badgeColor: "bg-orange-500",
        label: "Local-Dev",
        autoSwitch: false // Instruction-based only for local
    },
    amoy: {
        name: "Polygon Amoy",
        chainId: 80002,
        rawChainId: "0x13882",
        rpcUrl: "https://rpc-amoy.polygon.technology",
        contractAddress: contractAddress.address, // Default to the one in contractAddress.json
        explorerUrl: "https://amoy.polygonscan.com",
        badgeColor: "bg-primary",
        label: "Amoy-Testnet",
        autoSwitch: true // Allow automatic addition/switching
    }
};

export const getActiveNetwork = () => {
    const mode = import.meta.env.VITE_NETWORK_MODE || "amoy";
    const config = NETWORKS[mode] || NETWORKS.amoy;
    console.log(`[Config] Active Network: ${config.name} (${config.chainId})`);
    return config;
};
