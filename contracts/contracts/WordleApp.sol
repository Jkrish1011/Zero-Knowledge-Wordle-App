// SPDX-License-Identifier: MIT
pragma solidity >=0.8.21;

import "./Verifier.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";


contract WordleApp {
    IVerifier public immutable verifier;

    struct Session {
        uint256 sessionId;
        address player;
        bytes32 commitment;
        uint8 attempts;
        uint256[6][] feedback;
        uint256[6][] guesses;
    }

    mapping(uint256 => Session) public sessions;

    event SessionStarted(uint256 sessionId, address player, bytes32 commitment);
    event GuessMade(uint256 sessionId, uint256[6] guess, uint256[6] feedback);
    event GameWon(uint256 sessionId, address player, bytes32 commitment);
    event GameLost(uint256 sessionId, address player, bytes32 commitment);

    constructor(address _verifier) {
        verifier = IVerifier(_verifier);
    }

    // 
    function isGameOver(uint256[6] memory feedback) internal pure returns (bool) {
        for (uint i = 0; i < 6; i++) {
            if (feedback[i] != 2) return false;
        }
        return true;
    }

    function startSession(uint256 sessionId, address player, bytes32 commitment) external {
        require(sessions[sessionId].player == (address(0)), "Session already started!");
        Session memory currentSession = Session({
            sessionId: sessionId,
            player: player,
            commitment: commitment,
            attempts: 0,
            feedback: new uint256[6][](0),
            guesses: new uint256[6][](0)
        });

        sessions[sessionId] = currentSession;
        emit SessionStarted(sessionId, player, commitment);
    }

    function verifyGuess(
        uint256 sessionId, 
        uint256[6] memory guess, 
        uint256[6] memory feedback, 
        bytes calldata proof, 
        bytes32[] calldata publicInputs, 
        bytes memory userSignature,
        bytes32 commitment
    ) external {
        Session storage currentSession = sessions[sessionId];
        require(currentSession.player != (address(0)), "Session not started!");
        require(currentSession.player == msg.sender, "Not the player of this session!");
        require(currentSession.attempts < 6, "Game over!");

        bytes32 ethSignedMessage = MessageHashUtils.toEthSignedMessageHash(keccak256(abi.encode(guess, commitment)));
        address recoveredSigner = ECDSA.recover(ethSignedMessage, userSignature);
        require(recoveredSigner == msg.sender, "Invalid signature!");
        
        require(verifier.verify(proof, publicInputs), "Invalid guess!");
        currentSession.guesses.push(guess);
        currentSession.feedback.push(feedback);
        emit GuessMade(sessionId, guess, feedback);

        bool userWon = isGameOver(feedback);

        if (currentSession.attempts <= 6 && userWon) {
            emit GameWon(sessionId, msg.sender, commitment);
        }

        // Update the attempts
        currentSession.attempts++;
    }
}