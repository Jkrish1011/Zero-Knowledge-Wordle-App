// SPDX-License-Identifier: MIT
pragma solidity >=0.8.21;

import "./Verifier.sol";
import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/MessageHashUtils.sol";
import "@openzeppelin/contracts/access/Ownable.sol";


contract WordleApp is Ownable {
    IVerifier public immutable verifier;

    struct Session {
        uint256 sessionId;
        address player;
        bytes32 commitment;
        uint8 attempts;
        uint256[6][] feedback;
        uint256[6][] guesses;
        uint256[6] word;
        uint256 salt;
    }

    mapping(uint256 => Session) public sessions;

    event SessionStarted(uint256 sessionId, address player, bytes32 commitment);
    event SessionUpdated(uint256 sessionId, uint256[6] feedback, uint256[6] guess);
    event VerifyGuess(uint256 sessionId, uint256[6] guess, uint256[6] feedback, bytes32 commitment);
    event GameWon(uint256 sessionId, address player, bytes32 commitment);
    event GameLost(uint256 sessionId, address player, bytes32 commitment);
    event WordReveal(uint256 sessionId, uint256[6] word, uint256 salt);

    constructor(address _verifier, address _owner) Ownable(_owner) {
        verifier = IVerifier(_verifier);
    }

    function isGameOver(uint256[6] memory feedback) internal pure returns (bool) {
        for (uint i = 0; i < 6; i++) {
            if (feedback[i] != 2) return false;
        }
        return true;
    }

    function startSession(uint256 sessionId, address player, bytes32 commitment) onlyOwner external  {
        require(sessions[sessionId].player == (address(0)), "Session already started!");
        Session memory currentSession = Session({
            sessionId: sessionId,
            player: player,
            commitment: commitment,
            attempts: 0,
            feedback: new uint256[6][](0),
            guesses: new uint256[6][](0),
            word: [uint256(0), uint256(0), uint256(0), uint256(0), uint256(0), uint256(0)],
            salt: 0
        });

        sessions[sessionId] = currentSession;
        emit SessionStarted(sessionId, player, commitment);
    }

    function updateSession(uint256 sessionId, uint256[6] memory feedback, uint256[6] memory guess) onlyOwner external {
        Session storage currentSession = sessions[sessionId];
        require(currentSession.player != (address(0)), "Session not started!");
        require(currentSession.attempts < 6, "Game over!");
        currentSession.attempts++;
        currentSession.feedback.push(feedback);
        currentSession.guesses.push(guess);

        emit SessionUpdated(sessionId, feedback, guess);
    }

    function checkIfGameOver(uint256 sessionId) external returns (bool) {
        Session storage currentSession = sessions[sessionId];
        require(currentSession.player != (address(0)), "Session not started!");
        require(currentSession.attempts < 6, "Game over!");

        bool userWon = isGameOver(currentSession.feedback[currentSession.attempts]);

        if (userWon) {
            emit GameWon(sessionId, msg.sender, currentSession.commitment);
        } else {
            emit GameLost(sessionId, msg.sender, currentSession.commitment);
        }

        return userWon;
    }

    function verifyGuess(
        uint256 sessionId, 
        uint256[6] memory guess, 
        uint256[6] memory feedback, 
        bytes calldata proof, 
        bytes32[] calldata publicInputs, 
        // bytes memory userSignature,
        bytes32 commitment
    ) external {
        Session storage currentSession = sessions[sessionId];
        require(currentSession.player != (address(0)), "Session not started!");

        // bytes32 ethSignedMessage = MessageHashUtils.toEthSignedMessageHash(keccak256(abi.encode(guess, commitment)));
        // address recoveredSigner = ECDSA.recover(ethSignedMessage, userSignature);
        // require(recoveredSigner == msg.sender, "Invalid signature!");
        
        require(verifier.verify(proof, publicInputs), "Invalid guess!");

        emit VerifyGuess(sessionId, guess, feedback, commitment);
    }

    function revealWord(uint256 sessionId, uint256[6] memory word, uint256 salt) onlyOwner external {
        Session storage currentSession = sessions[sessionId];
        require(currentSession.player != (address(0)), "Session not started!");
        require(currentSession.attempts == 6, "Game not over!");
        currentSession.word = word;
        currentSession.salt = salt;

        emit WordReveal(sessionId, word, salt);
    }
}