const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
    const rpcUrl = process.env.RPC_URL || "https://rpc-amoy.polygon.technology";
    const privateKey = process.env.PRIVATE_KEY;

    if (!privateKey) {
        console.error("PRIVATE_KEY not found in .env");
        process.exit(1);
    }

    const provider = new ethers.JsonRpcProvider(rpcUrl);
    const wallet = new ethers.Wallet(privateKey, provider);

    const contractAddress = "0x84050B0C256be4b98d06DC4dd7737e66680BBF91";
    const abi = [
        "function addIssuer(address _issuer) external",
        "function isAuthorizedIssuer(address) view returns (bool)",
        "function owner() view returns (address)"
    ];

    const contract = new ethers.Contract(contractAddress, abi, wallet);

    const targetAddress = process.argv[2];
    if (!targetAddress || !ethers.isAddress(targetAddress)) {
        console.error("Usage: node scripts/authorize_issuer.js <TARGET_ADDRESS>");
        process.exit(1);
    }

    console.log(`Checking if ${targetAddress} is already authorized...`);
    const isAlreadyAuthorized = await contract.isAuthorizedIssuer(targetAddress);

    if (isAlreadyAuthorized) {
        console.log(`${targetAddress} is already an authorized issuer.`);
        return;
    }

    const owner = await contract.owner();
    if (owner.toLowerCase() !== wallet.address.toLowerCase()) {
        console.error(`Current wallet (${wallet.address}) is not the contract owner (${owner}).`);
        console.error("Only the owner can authorize new issuers.");
        process.exit(1);
    }

    console.log(`Authorizing ${targetAddress}...`);
    try {
        const tx = await contract.addIssuer(targetAddress);
        console.log("Transaction sent:", tx.hash);
        await tx.wait();
        console.log(`Successfully authorized ${targetAddress} on Amoy.`);
    } catch (error) {
        console.error("Transaction failed:", error.message);
        if (error.reason) console.error("Reason:", error.reason);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
