const hre = require("hardhat");
const contractAddress = require("D:/Desktop/MDM/frontend/src/utils/contractAddress.json");

async function main() {
    const certId = "CERT-20251227-UGYNT9";
    console.log(`Inspecting on-chain data for: ${certId}`);

    const MeritRegistry = await hre.ethers.getContractAt("MeritRegistry", contractAddress.address);
    const [exists, isValid, certHash, issueDate] = await MeritRegistry.verifyCertificate(certId);

    console.log("\n--- On-Chain Result ---");
    console.log(`Exists: ${exists}`);
    console.log(`Is Valid: ${isValid}`);
    console.log(`On-Chain Hash: ${certHash}`);
    console.log(`Issue Date (Unix): ${issueDate}`);
}

main().catch((error) => {
    console.error(error);
    process.exitCode = 1;
});
