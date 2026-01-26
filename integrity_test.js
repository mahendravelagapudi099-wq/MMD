require('dotenv').config();
const ethers = require("ethers");
const CryptoJS = require("crypto-js");
const fs = require("fs");
const path = require("path");

const contractAddress = JSON.parse(fs.readFileSync("./frontend/src/utils/contractAddress.json", "utf8")).address;
const contractABI = JSON.parse(fs.readFileSync("./frontend/src/utils/contractABI.json", "utf8"));

const RPC_URL = process.env.RPC_URL || "https://rpc-amoy.polygon.technology";
const PRIVATE_KEY = process.env.PRIVATE_KEY;

if (!PRIVATE_KEY) {
    console.error("ERROR: PRIVATE_KEY not found in .env");
    process.exit(1);
}

const provider = new ethers.JsonRpcProvider(RPC_URL);
const signer = new ethers.Wallet(PRIVATE_KEY, provider);

function hashCertificateData(data) {
    const canonicalKeys = ["certId", "studentId", "courseName", "grade", "issueDate"];
    const normalizedData = {};
    canonicalKeys.forEach(key => {
        const val = data[key];
        normalizedData[key] = (val !== null && val !== undefined) ? String(val).trim() : "";
    });
    const sortedData = Object.keys(normalizedData).sort().reduce((obj, key) => {
        obj[key] = normalizedData[key];
        return obj;
    }, {});
    return CryptoJS.SHA256(JSON.stringify(sortedData)).toString();
}

async function runTest() {
    console.log("--------------------------------------------------");
    console.log("MDM INTEGRITY VERIFICATION TEST SUITE");
    console.log("--------------------------------------------------\n");

    try {
        const contract = new ethers.Contract(contractAddress, contractABI, signer);

        // Ensure signer is authorized (Owner in local Hardhat is account 0)
        const isAuth = await contract.isAuthorizedIssuer(signer.address);
        if (!isAuth) {
            console.log("> Authorizing current wallet as issuer...");
            const txAdd = await contract.addIssuer(signer.address);
            await txAdd.wait();
        }

        const certId = "TEST-INTEGRITY-" + Math.floor(Math.random() * 100000);
        const baseData = {
            certId: certId,
            studentId: "STUD-TEST-001",
            courseName: "Maritime Safety Protocol",
            grade: "B+",
            issueDate: "2026-01-25"
        };

        const originalHash = hashCertificateData(baseData);
        console.log(`> Certificate ID: ${certId}`);
        console.log(`> Original Hash:  ${originalHash}`);

        // 1. Issue
        console.log("\n[STEP 1] Anchoring metadata to Polygon...");
        const tx = await contract.issueCertificate(certId, originalHash);
        await tx.wait();
        console.log("✓ Issuance Successful.");

        // 2. Verify REAL
        console.log("\n[SCENARIO 1] VERIFYING UNTOUCHED CERTIFICATE...");
        const onChainData = await contract.verifyCertificate(certId);
        const hashOnChain = onChainData.certHash;

        const calculatedHashReal = hashCertificateData(baseData);
        console.log(`  Expected (On-chain): ${hashOnChain}`);
        console.log(`  Computed (Local):    ${calculatedHashReal}`);

        if (calculatedHashReal === hashOnChain) {
            console.log("  STATUS: VERIFIED (REAL) ✅");
        } else {
            console.error("  STATUS: ERROR (Hash Mismatch) ❌");
        }

        // 3. Verify TAMPERED
        console.log("\n[SCENARIO 2] VERIFYING TAMPERED CERTIFICATE (Grade Change)...");
        const tamperedData = { ...baseData, grade: "A+" }; // Changed grade from B+ to A+
        const calculatedHashTampered = hashCertificateData(tamperedData);

        console.log(`  Tampered Grade:      B+ -> A+`);
        console.log(`  Expected (On-chain): ${hashOnChain}`);
        console.log(`  Computed (Tampered): ${calculatedHashTampered}`);

        if (calculatedHashTampered === hashOnChain) {
            console.error("  STATUS: VERIFIED (Security Failure!) ❌");
        } else {
            console.log("  STATUS: TAMPERED 🛑");
            console.log("  RESULT: SUCCESS - System correctly detected internal data modification.");
        }

        const results = {
            certId,
            scenario1: {
                expected: hashOnChain,
                computed: calculatedHashReal,
                status: calculatedHashReal === hashOnChain ? "VERIFIED (REAL)" : "FAILED"
            },
            scenario2: {
                tamperedGrade: "A+",
                expected: hashOnChain,
                computed: calculatedHashTampered,
                status: calculatedHashTampered !== hashOnChain ? "TAMPERED" : "FAILED"
            }
        };
        fs.writeFileSync("test_summary.json", JSON.stringify(results, null, 2));
        console.log("\nSummary saved to test_summary.json");

        console.log("\n--------------------------------------------------");
        console.log("TEST COMPLETED SUCCESSFULLY");
        console.log("--------------------------------------------------");

    } catch (err) {
        console.error("\n[FATAL ERROR] Test aborted:", err.message);
        fs.writeFileSync("test_error.txt", err.stack || err.message);
        if (err.code === 'ECONNREFUSED') {
            console.error("Hint: Ensure 'npx hardhat node' is running.");
        }
    }
}

runTest();
