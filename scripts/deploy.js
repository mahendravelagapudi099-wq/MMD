const hre = require("hardhat");
const fs = require("fs");
const path = require("path");

async function main() {
    console.log("Starting Deployment Process...");

    // 1. Get Signer (Account #0)
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);

    // 2. Deploy MeritRegistry
    const MeritRegistry = await hre.ethers.getContractFactory("MeritRegistry");
    const registry = await MeritRegistry.deploy();
    await registry.waitForDeployment();

    const address = await registry.getAddress();
    console.log("MeritRegistry deployed to:", address);

    // 3. AUTO-AUTHORIZE: Make the deployer an authorized issuer
    console.log("Authorizing deployer as issuer...");
    const authTx = await registry.addIssuer(deployer.address);
    await authTx.wait();
    console.log("Successfully authorized:", deployer.address);

    // 4. Export artifacts to Frontend
    const frontendPath = path.join(__dirname, "..", "frontend", "src", "utils");

    if (!fs.existsSync(frontendPath)) {
        fs.mkdirSync(frontendPath, { recursive: true });
    }

    // Export contract address
    const addressData = JSON.stringify({ address: address }, null, 2);
    fs.writeFileSync(path.join(frontendPath, "contractAddress.json"), addressData);
    console.log("✅ Exported address to frontend/src/utils/contractAddress.json");

    // Export contract ABI - Ensuring it's saved as a proper JSON array, not a double-stringified object
    const abiRaw = MeritRegistry.interface.formatJson();
    const abiData = JSON.parse(abiRaw); // Convert from string to object before stringifying with indentation
    fs.writeFileSync(path.join(frontendPath, "contractABI.json"), JSON.stringify(abiData, null, 2));
    console.log("✅ Exported ABI to frontend/src/utils/contractABI.json");

    console.log("\n🚀 Deployment & Authorization Complete!");
}

main().catch((error) => {
    console.error("Deployment failed:", error);
    process.exitCode = 1;
});
