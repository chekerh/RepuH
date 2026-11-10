// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Certificate fingerprints and irreversible revocation, never personal data.
/// @dev Unaudited. Deployment and live-network verification are separate steps.
contract CertificateRegistry {
    address public owner;
    mapping(address => bool) public issuers;
    struct Certificate {
        bytes32 payloadHash;
        address issuer;
        uint256 issuedAt;
        bool revoked;
    }
    mapping(bytes32 => Certificate) private certificates;

    event IssuerChanged(address indexed issuer, bool authorised);
    event CertificateIssued(bytes32 indexed id, bytes32 indexed payloadHash, address indexed issuer);
    event CertificateRevoked(bytes32 indexed id, address indexed issuer);
    error NotOwner();
    error NotIssuer();
    error InvalidInput();
    error DuplicateCertificate();
    error UnknownCertificate();

    constructor() {
        owner = msg.sender;
        issuers[msg.sender] = true;
    }

    function setIssuer(address issuer, bool authorised) external {
        if (msg.sender != owner) revert NotOwner();
        if (issuer == address(0)) revert InvalidInput();
        issuers[issuer] = authorised;
        emit IssuerChanged(issuer, authorised);
    }

    function issueCertificate(bytes32 id, bytes32 payloadHash) external {
        if (!issuers[msg.sender]) revert NotIssuer();
        if (id == bytes32(0) || payloadHash == bytes32(0)) revert InvalidInput();
        if (certificates[id].issuer != address(0)) revert DuplicateCertificate();
        certificates[id] = Certificate(payloadHash, msg.sender, block.timestamp, false);
        emit CertificateIssued(id, payloadHash, msg.sender);
    }

    /// @notice The original issuer can revoke even after losing permission to issue.
    function revokeCertificate(bytes32 id) external {
        Certificate storage certificate = certificates[id];
        if (certificate.issuer == address(0)) revert UnknownCertificate();
        if (certificate.issuer != msg.sender) revert NotIssuer();
        if (!certificate.revoked) {
            certificate.revoked = true;
            emit CertificateRevoked(id, msg.sender);
        }
    }

    function getCertificate(bytes32 id) external view returns (
        bytes32 payloadHash, address issuer, uint256 issuedAt, bool revoked
    ) {
        Certificate storage certificate = certificates[id];
        return (certificate.payloadHash, certificate.issuer, certificate.issuedAt, certificate.revoked);
    }
}
