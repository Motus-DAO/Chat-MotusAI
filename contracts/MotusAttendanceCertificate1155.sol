// SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;

import {ERC1155} from "@openzeppelin/contracts/token/ERC1155/ERC1155.sol";
import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";

/**
 * @title MotusAttendanceCertificate1155
 * @notice Non-transferable attendance certificates (POAP-style) for session participation.
 *
 * Design:
 * - One token id per session (ex: sessionId 20260508).
 * - Each attendee can claim/mint exactly 1 unit for that session id.
 * - Tokens are soulbound (non-transferable).
 * - URI follows ERC-1155 metadata pattern with {id} replacement.
 */
contract MotusAttendanceCertificate1155 is ERC1155, Ownable {
    /// @notice Tracks whether a wallet already received a certificate for a given session id.
    mapping(uint256 => mapping(address => bool)) public hasCertificateForSession;

    /// @notice Optional session activation flag to guard mint windows.
    mapping(uint256 => bool) public sessionMintEnabled;

    event SessionMintToggled(uint256 indexed sessionId, bool enabled);
    event AttendanceMinted(uint256 indexed sessionId, address indexed to);
    event AttendanceMintedBatch(uint256 indexed sessionId, uint256 totalRecipients);

    constructor(string memory baseURI) ERC1155(baseURI) Ownable(msg.sender) {}

    /**
     * @notice Enables or disables minting for a given session id.
     * @param sessionId Token id representing a specific session.
     * @param enabled Whether minting is active for this session.
     */
    function setSessionMintEnabled(uint256 sessionId, bool enabled) external onlyOwner {
        sessionMintEnabled[sessionId] = enabled;
        emit SessionMintToggled(sessionId, enabled);
    }

    /**
     * @notice Updates the metadata base URI.
     * @dev URI should include {id}, e.g. ipfs://CID/{id}.json
     */
    function setURI(string calldata newuri) external onlyOwner {
        _setURI(newuri);
    }

    /**
     * @notice Mint one attendance certificate to one wallet.
     * @dev Each wallet can only receive one certificate per session.
     */
    function mintAttendance(address to, uint256 sessionId) external onlyOwner {
        require(sessionMintEnabled[sessionId], "Session mint disabled");
        _mintOne(to, sessionId);
        emit AttendanceMinted(sessionId, to);
    }

    /**
     * @notice Mint attendance certificates to multiple wallets in one tx.
     */
    function mintAttendanceBatch(address[] calldata recipients, uint256 sessionId) external onlyOwner {
        require(sessionMintEnabled[sessionId], "Session mint disabled");
        uint256 len = recipients.length;
        require(len > 0, "Empty recipients");

        for (uint256 i = 0; i < len; i++) {
            _mintOne(recipients[i], sessionId);
        }

        emit AttendanceMintedBatch(sessionId, len);
    }

    function _mintOne(address to, uint256 sessionId) internal {
        require(to != address(0), "Invalid recipient");
        require(!hasCertificateForSession[sessionId][to], "Already minted");

        hasCertificateForSession[sessionId][to] = true;
        _mint(to, sessionId, 1, "");
    }

    /**
     * @dev Soulbound behavior: block all transfer flows except mint (from == 0) and burn (to == 0).
     */
    function safeTransferFrom(address, address, uint256, uint256, bytes memory) public pure override {
        revert("Non-transferable certificate");
    }

    /**
     * @dev Soulbound behavior for batch transfer.
     */
    function safeBatchTransferFrom(address, address, uint256[] memory, uint256[] memory, bytes memory)
        public
        pure
        override
    {
        revert("Non-transferable certificate");
    }
}
