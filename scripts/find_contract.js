const hre = require("hardhat");
require("dotenv").config();

async function main() {
    const rpcUrl = process.env.RPC_URL || "https://rpc-amoy.polygon.technology";
    const provider = new hre.ethers.JsonRpcProvider(rpcUrl);

    const pk = process.env.PRIVATE_KEY;
    if (!pk) {
        console.error("No PRIVATE_KEY found in root .env");
        return;
    }

    const wallet = new hre.ethers.Wallet(pk, provider);
    console.log(`Checking account: ${wallet.address} on Amoy...`);

    // We can't easily iterate all transactions without an indexer, 
    // but we can check if the current contractAddress.json might be wrong.
    // However, if the user said it was already deployed, they might know the address.

    // Let's try to see if there's any recorded transaction in the last few blocks? 
    // No, that's unreliable.

    console.log("Searching for MeritRegistry deployment in recent blocks is not feasible without Etherscan API.");
    console.log("Checking if Etherscan API key is present...");

    if (process.env.ETHERSCAN_API_KEY) {
        console.log("Etherscan API key found. You can check the address manually at: https://amoy.polygonscan.com/address/" + wallet.address);
    } else {
        console.log("No Etherscan API key. Please check: https://amoy.polygonscan.com/address/" + wallet.address);
    }
}

main().catch(console.error);
