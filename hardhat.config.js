require("@nomicfoundation/hardhat-toolbox");
require("dotenv").config();

// Helper to get accounts only if a valid private key is provided
const getAccounts = () => {
    const pk = process.env.PRIVATE_KEY;
    if (!pk || pk.length < 64) return [];
    return [pk.startsWith("0x") ? pk : `0x${pk}`];
};

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
    solidity: {
        version: "0.8.20",
        settings: {
            optimizer: {
                enabled: true,
                runs: 200,
            },
        },
    },
    networks: {
        hardhat: {
            chainId: 31337
        },
        localhost: {
            url: "http://127.0.0.1:8545",
            chainId: 31337
        },
        amoy: {
            url: process.env.RPC_URL || "https://rpc-amoy.polygon.technology",
            accounts: getAccounts(),
            chainId: 80002
        }
    },
    etherscan: {
        apiKey: process.env.ETHERSCAN_API_KEY || "",
        customChains: [
            {
                network: "amoy",
                chainId: 80002,
                urls: {
                    apiURL: "https://api-amoy.polygonscan.com/api",
                    browserURL: "https://amoy.polygonscan.com",
                },
            },
        ],
    },
};
