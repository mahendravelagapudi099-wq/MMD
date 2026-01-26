const { ethers } = require("ethers");
require("dotenv").config();

async function main() {
    const rpcUrl = process.env.RPC_URL || "https://rpc-amoy.polygon.technology";
    const provider = new ethers.JsonRpcProvider(rpcUrl);

    const contractAddress = "0x84050B0C256be4b98d06DC4dd7737e66680BBF91";
    const abi = [
        "function owner() view returns (address)",
        "function isAuthorizedIssuer(address) view returns (bool)"
    ];

    const contract = new ethers.Contract(contractAddress, abi, provider);

    const owner = await contract.owner();
    console.log("Contract Owner:", owner);

    const envAddress = new ethers.Wallet(process.env.PRIVATE_KEY).address;
    console.log("Address from .env:", envAddress);

    const isAuthorized = await contract.isAuthorizedIssuer(envAddress);
    console.log(`Is ${envAddress} authorized?`, isAuthorized);

    // If you have a specific address you're using in MetaMask, check it here:
    // const metaMaskAddress = "YOUR_METAMASK_ADDRESS";
    // console.log(`Is MetaMask address authorized?`, await contract.isAuthorizedIssuer(metaMaskAddress));
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
