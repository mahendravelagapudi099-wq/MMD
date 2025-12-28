// SPDX-License-Identifier: MIT
pragma solidity ^0.8.19;

import "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MeritRegistry
 * @dev A smart contract for storing and verifying educational certificates.
 * Allows authorized institutions to issue and revoke certificates.
 */
contract MeritRegistry is Ownable {
    
    struct Certificate {
        string certificateHash; // SHA-256 hash of the certificate data
        uint256 issueDate;      // Timestamp of issuance
        address issuer;         // Address of the authorized institution
        bool isValid;           // Status of the certificate
    }

    // Mapping from certificateId to Certificate details
    mapping(string => Certificate) private certificates;
    
    // Mapping to track authorized issuers
    mapping(address => bool) public isAuthorizedIssuer;

    // Events
    event CertificateIssued(string indexed certId, string certHash, address indexed issuer);
    event CertificateRevoked(string indexed certId);
    event IssuerAdded(address indexed issuer);
    event IssuerRemoved(address indexed issuer);

    /**
     * @dev Modifier to restrict access to authorized issuers only.
     */
    modifier onlyAuthorized() {
        require(isAuthorizedIssuer[msg.sender], "MeritRegistry: Caller is not an authorized issuer");
        _;
    }

    /**
     * @dev Adds a new authorized issuer. Only the owner can call this.
     * @param _issuer Address of the institution to authorize.
     */
    function addIssuer(address _issuer) external onlyOwner {
        require(_issuer != address(0), "MeritRegistry: Invalid address");
        require(!isAuthorizedIssuer[_issuer], "MeritRegistry: Issuer already authorized");
        isAuthorizedIssuer[_issuer] = true;
        emit IssuerAdded(_issuer);
    }

    /**
     * @dev Removes an authorized issuer. Only the owner can call this.
     * @param _issuer Address of the institution to de-authorize.
     */
    function removeIssuer(address _issuer) external onlyOwner {
        require(isAuthorizedIssuer[_issuer], "MeritRegistry: Address is not an authorized issuer");
        isAuthorizedIssuer[_issuer] = false;
        emit IssuerRemoved(_issuer);
    }

    /**
     * @dev Issues a new certificate. Only authorized issuers can call this.
     * @param certId Unique identifier for the certificate.
     * @param certHash SHA-256 hash of the certificate content.
     */
    function issueCertificate(string calldata certId, string calldata certHash) external onlyAuthorized {
        require(bytes(certificates[certId].certificateHash).length == 0, "MeritRegistry: Certificate ID already exists");
        require(bytes(certHash).length > 0, "MeritRegistry: Certificate hash cannot be empty");

        certificates[certId] = Certificate({
            certificateHash: certHash,
            issueDate: block.timestamp,
            issuer: msg.sender,
            isValid: true
        });

        emit CertificateIssued(certId, certHash, msg.sender);
    }

    /**
     * @dev Revokes an existing certificate. Only the original issuer can revoke it.
     * @param certId Unique identifier of the certificate to revoke.
     */
    function revokeCertificate(string calldata certId) external {
        Certificate storage cert = certificates[certId];
        require(bytes(cert.certificateHash).length > 0, "MeritRegistry: Certificate does not exist");
        require(cert.isValid, "MeritRegistry: Certificate is already revoked");
        require(cert.issuer == msg.sender, "MeritRegistry: Only the original issuer can revoke this certificate");

        cert.isValid = false;
        emit CertificateRevoked(certId);
    }

    /**
     * @dev Verifies a certificate's authenticity. Open to anyone.
     * @param certId Unique identifier of the certificate.
     * @return exists Whether the certificate exists in the registry.
     * @return isValid Whether the certificate is currently valid.
     * @return certHash The stored hash of the certificate.
     * @return issueDate The timestamp when it was issued.
     */
    function verifyCertificate(string calldata certId) external view returns (
        bool exists,
        bool isValid,
        string memory certHash,
        uint256 issueDate
    ) {
        Certificate memory cert = certificates[certId];
        exists = (bytes(cert.certificateHash).length > 0);
        isValid = cert.isValid;
        certHash = cert.certificateHash;
        issueDate = cert.issueDate;
    }
}
