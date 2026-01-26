const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    const networkName = hre.network.name;
    console.log(`--- Sanity Check: ${networkName} ---`);

    // Get the address to check
    let address;
    const utilsPath = path.join(__dirname, "..", "frontend", "src", "utils");

    if (networkName === "localhost" || networkName === "hardhat") {
        // Hardcoded for local as requested
        address = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    } else {
        // For Amoy, read from contractAddress.json
        const addressFile = path.join(utilsPath, "contractAddress.json");
        if (!fs.existsSync(addressFile)) {
            throw new Error(`contractAddress.json not found at ${addressFile}`);
        }
        const contractAddressJson = JSON.parse(fs.readFileSync(addressFile, "utf8"));
        address = contractAddressJson.address;
    }

    console.log(`Checking contract at: ${address}`);

    try {
        const [deployer] = await hre.ethers.getSigners();
        console.log(`Using signer: ${deployer.address}`);

        // We can get ABI from the artifacts if possible, or from the frontend utils
        const abiFile = path.join(utilsPath, "contractABI.json");
        if (!fs.existsSync(abiFile)) {
            throw new Error(`contractABI.json not found at ${abiFile}`);
        }
        const abi = JSON.parse(fs.readFileSync(abiFile, "utf8"));

        const contract = new hre.ethers.Contract(address, abi, deployer);

        const owner = await contract.owner();
        console.log(`Contract Owner: ${owner}`);

        const isAuthorized = await contract.isAuthorizedIssuer(deployer.address);
        console.log(`Is signer authorized? ${isAuthorized}`);

        console.log("✅ Sanity check passed!");
    } catch (error) {
        console.error("❌ Sanity check failed:");
        console.error(error.message);
        process.exitCode = 1;
    }
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
