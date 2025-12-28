const { expect } = require("chai");
const { ethers } = require("hardhat");

describe("MeritRegistry", function () {
    let MeritRegistry;
    let registry;
    let owner;
    let issuer;
    let otherAccount;

    beforeEach(async function () {
        [owner, issuer, otherAccount] = await ethers.getSigners();
        MeritRegistry = await ethers.getContractFactory("MeritRegistry");
        registry = await MeritRegistry.deploy();
        await registry.waitForDeployment();
    });

    describe("Deployment", function () {
        it("Should set the right owner", async function () {
            expect(await registry.owner()).to.equal(owner.address);
        });
    });

    describe("Issuer Management", function () {
        it("Should allow owner to add an issuer", async function () {
            await registry.addIssuer(issuer.address);
            expect(await registry.isAuthorizedIssuer(issuer.address)).to.be.true;
        });

        it("Should fail if non-owner tries to add an issuer", async function () {
            await expect(
                registry.connect(otherAccount).addIssuer(issuer.address)
            ).to.be.revertedWith("Ownable: caller is not the owner");
        });

        it("Should allow owner to remove an issuer", async function () {
            await registry.addIssuer(issuer.address);
            await registry.removeIssuer(issuer.address);
            expect(await registry.isAuthorizedIssuer(issuer.address)).to.be.false;
        });
    });

    describe("Certificate Issuance", function () {
        const certId = "CERT-001";
        const certHash = "sha256-hash-example";

        beforeEach(async function () {
            await registry.addIssuer(issuer.address);
        });

        it("Should allow authorized issuer to issue a certificate", async function () {
            await expect(registry.connect(issuer).issueCertificate(certId, certHash))
                .to.emit(registry, "CertificateIssued")
                .withArgs(certId, certHash, issuer.address);

            const [exists, isValid, hash, date] = await registry.verifyCertificate(certId);
            expect(exists).to.be.true;
            expect(isValid).to.be.true;
            expect(hash).to.equal(certHash);
        });

        it("Should fail if unauthorized address tries to issue", async function () {
            await expect(
                registry.connect(otherAccount).issueCertificate(certId, certHash)
            ).to.be.revertedWith("MeritRegistry: Caller is not an authorized issuer");
        });

        it("Should fail if certificate ID already exists", async function () {
            await registry.connect(issuer).issueCertificate(certId, certHash);
            await expect(
                registry.connect(issuer).issueCertificate(certId, "another-hash")
            ).to.be.revertedWith("MeritRegistry: Certificate ID already exists");
        });
    });

    describe("Revocation", function () {
        const certId = "CERT-001";
        const certHash = "sha256-hash-example";

        beforeEach(async function () {
            await registry.addIssuer(issuer.address);
            await registry.connect(issuer).issueCertificate(certId, certHash);
        });

        it("Should allow the original issuer to revoke a certificate", async function () {
            await expect(registry.connect(issuer).revokeCertificate(certId))
                .to.emit(registry, "CertificateRevoked")
                .withArgs(certId);

            const [exists, isValid] = await registry.verifyCertificate(certId);
            expect(isValid).to.be.false;
        });

        it("Should fail if someone else tries to revoke", async function () {
            await expect(
                registry.connect(otherAccount).revokeCertificate(certId)
            ).to.be.revertedWith("MeritRegistry: Only the original issuer can revoke this certificate");
        });
    });
});
