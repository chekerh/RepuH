// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title EvidenceAnchor
 * @notice Minimal integrity anchor for batches of RepuH evidence commitments.
 *
 * The contract stores only a Merkle root per batch id. It never receives
 * usernames, email addresses, raw evidence, skill scores, project identifiers
 * or any other personal data. An anchor proves that a batch of commitments has
 * not been altered since submission; it is not proof of skill, employment or
 * identity.
 *
 * This contract is provided as the minimal specified interface. It has not been
 * deployed, audited or exercised against a live network by this MVP.
 */
contract EvidenceAnchor {
    address public anchorer;
    address public owner;

    mapping(uint256 batchId => bytes32 root) private _roots;
    mapping(uint256 batchId => uint256 timestamp) public anchoredAt;

    event RootSubmitted(uint256 indexed batchId, bytes32 indexed root, address indexed submitter);
    event AnchorerChanged(address indexed previous, address indexed next);

    error NotOwner();
    error NotAnchorer();
    error InvalidRoot();
    error DuplicateBatch();

    modifier onlyOwner() {
        if (msg.sender != owner) revert NotOwner();
        _;
    }

    modifier onlyAnchorer() {
        if (msg.sender != anchorer) revert NotAnchorer();
        _;
    }

    constructor() {
        owner = msg.sender;
        anchorer = msg.sender;
    }

    function setAnchorer(address next) external onlyOwner {
        if (next == address(0)) revert NotOwner();
        emit AnchorerChanged(anchorer, next);
        anchorer = next;
    }

    /// @notice Submit a batch root. Duplicate batch ids are rejected.
    function submitRoot(bytes32 root, uint256 batchId) external onlyAnchorer {
        if (root == bytes32(0)) revert InvalidRoot();
        if (_roots[batchId] != bytes32(0)) revert DuplicateBatch();
        _roots[batchId] = root;
        anchoredAt[batchId] = block.timestamp;
        emit RootSubmitted(batchId, root, msg.sender);
    }

    function getRoot(uint256 batchId) external view returns (bytes32) {
        return _roots[batchId];
    }

    function rootExists(uint256 batchId) external view returns (bool) {
        return _roots[batchId] != bytes32(0);
    }
}
