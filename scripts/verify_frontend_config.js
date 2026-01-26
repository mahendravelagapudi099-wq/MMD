const { ethers } = require("ethers");
const contractAddress = require("../frontend/src/utils/contractAddress.json");
const contractABI = require("../frontend/src/utils/contractABI.json");
require("dotenv").config();

async function main() {
    const rpcUrl = process.env.RPC_URL || "https://rpc-amoy.polygon.technology";
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    console.log("Using Contract Address:", contractAddress.address);
    const contract = new ethers.Contract(contractAddress.address, contractABI, provider);

    const targetAddress = "0xfED3e434cfE9f64271cC675a108E0f7AFd59D068";
    const owner = await contract.owner();
    console.log("Contract Owner:", owner);

    const isAuthorized = await contract.isAuthorizedIssuer(targetAddress);
    console.log(`Is ${targetAddress} authorized in THIS contract?`, isAuthorized);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
