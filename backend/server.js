const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const { Fr } = require('@aztec/bb.js');
const {UltraHonkBackend} = require("@aztec/bb.js");
const { Noir } = require('@noir-lang/noir_js');
const circuit = require("./noir_circuit/wordle_app.json");
const WordleAppInteractor = require('./wordleSmartContractInteractor.js');
const { ethers } = require('ethers');

const { 
    getAlphabeticIndex, 
    pickRandomWord, 
    computePedersenCommmitment, 
    initBarretenberg, 
    checkGuess, 
    randomBytesCrypto, 
    uint8ArrayToBigIntBE,
    prepareNoirInputs,
    convertInputsForContract
} = require('./helper.js');

const { MAX_ATTEMPTS } = require('./constants.js');

// Load environment variables
dotenv.config();

const app = express();
const wordleAppInteractor = new WordleAppInteractor();

// Middleware
const corsOptions = {
    origin: '*', // Allow all origins
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization'],
    credentials: true
};

app.use(cors(corsOptions));
app.use(bodyParser.json({limit: '50mb'}));
app.use(bodyParser.urlencoded({extended: true, limit: '50mb'}));
// app.use(express.json());

let game_db = [];

// Check feedback route
app.post('/api/check_feedback', async (req, res) => {
    try {
        const { sessionId, userInput  } = req.body;

        // get the target word from the game_db
        const game = game_db.find(game => game.sessionId === sessionId);
        if(!game) {
            return res.status(400).json({
                success: false,
                error: 'Invalid sessionId. Start a new game'
            });
        }

        // Add debug logging for session data
        // console.log("Debug session data:", {
        //     sessionId: BigInt(sessionId),
        //     gamePlayer: game.player,
        //     gameAttempts: game.attempts,
        //     gameStatus: game.status,
        //     gameCommitment: game.commitment
        // });

        const feedback = checkGuess(userInput, game.targetWord);
        game.attempts++;

        const userInputConverted = userInput.split("").map(char => BigInt(getAlphabeticIndex(char)));
        const targetWordConverted = game.wordInputs;
        const feedbackConverted = feedback.map(f => BigInt(f)); 
       
        // // Ensure arrays are exactly 6 elements
        // const paddedUserInput = Array(6).fill(0n).map((_, i) => userInputConverted[i] || 0n);
        // const paddedFeedback = Array(6).fill(0n).map((_, i) => feedbackConverted[i] || 0n);
       
        const noirInputs = {
            targetWord: targetWordConverted,
            salt: BigInt(game.salt),
            session_id: BigInt(game.sessionId),
            pedersen_hash: BigInt(game.commitment), 
            feedback: feedbackConverted, 
            userInput: userInputConverted
        };
        
        const noirInputsConverted = prepareNoirInputs(noirInputs);
        console.log({noirInputsConverted});
        const backend = new UltraHonkBackend(circuit.bytecode);
        const noir = new Noir(circuit);
        const { witness } = await noir.execute(noirInputsConverted);
        const {proof, publicInputs} = await backend.generateProof(witness, {keccak: true});

        // const {_sessionId, _userInputConverted, _feedback, _proof, _publicInputs, _commitment } = convertInputsForContract(sessionId, userInputConverted, feedback, proof, publicInputs, game.commitment);
        // Add debug logging
        // console.log("Debug verifyGuess params:", {
        //     _sessionId,
        //     _userInputConverted,
        //     _feedback,
        //     _proof,
        //     _publicInputs,
        //     _commitment,
        //     gameAttempts: game.attempts
        // });
        // let sessionDetails = await wordleAppInteractor.getSession(BigInt(sessionId));
        // console.log(sessionDetails);

        // Keep sessionId as BigInt and ensure arrays are properly formatted
        // let receipt = await wordleAppInteractor.verifyGuess(
        //     _sessionId,
        //     _userInputConverted,
        //     _feedback,
        //     _proof,
        //     _publicInputs,
        //     _commitment
        // );
        console.log({proof});
        let receipt = {
            hash: "0x123",
            blockHash: "0x123",
            blockNumber: 123
        }

        // console.log("type of sessionId: ", typeof sessionId);
        // console.log("type of userInputConverted: ", typeof userInputConverted[0]);
        // console.log("type of feedback: ", typeof feedback[0]);
        // console.log("type of proof: ", typeof proof[0]);
        // console.log("type of publicInputs: ", typeof publicInputs[0]);
        // console.log("type of game.commitment: ", typeof game.commitment);

        const verified = await backend.verifyProof({proof, publicInputs}, {keccak: true});
        console.log({verified});

        if(feedback.every(status => status === 2)) {
            return res.status(200).json({
                success: true,
                message: 'Game Over! You won!',
                data: {
                    feedback,
                    attempts: game.attempts,
                    isGameOver: true,
                    proof: Uint8Array.from(proof),
                    publicInputs: publicInputs,
                    targetWord: game.targetWord,
                    receipt: receipt,
                    salt: game.salt,
                }
            });
        }
        if(game.attempts === MAX_ATTEMPTS && !feedback.every(status => status === 2)) {
            return res.status(200).json({
                success: true,
                message: 'Game Over! You lost!',
                data: {
                    feedback,
                    attempts: game.attempts,
                    isGameOver: true,
                    targetWord: game.targetWord,
                    proof: Uint8Array.from(proof),
                    publicInputs: publicInputs,
                    targetWord: game.targetWord,
                    salt: game.salt,
                }
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Feedback calculated successfully',
            data: {
                feedback,
                attempts: game.attempts,
                proof: Array.from(proof),
                publicInputs: publicInputs,
                isGameOver: (game.attempts === MAX_ATTEMPTS) || (feedback.every(status => status === 2)),
                transactionHash: receipt.hash,
                blockHash: receipt.blockHash,
                blockNumber: receipt.blockNumber
            }
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Couldn\'t calculate feedback.',
            error: error
        });
    }
});

// Start game route
app.post('/api/start_game', async (req, res) => {
    try {
        const { userWallet } = req.body;
        console.log("userWallet", userWallet);
        const targetWord = pickRandomWord();
        const sessionId = uint8ArrayToBigIntBE(randomBytesCrypto(64)) % Fr.MODULUS;
        const salt = uint8ArrayToBigIntBE(randomBytesCrypto(64)) % Fr.MODULUS;
        console.log("targetWord", targetWord);
        const bb = await initBarretenberg();
        const {commitment, wordInputs} = await computePedersenCommmitment(targetWord, sessionId, salt, bb);

        game_db.push({
            targetWord: targetWord,
            player: userWallet,
            salt: salt.toString(),
            sessionId: sessionId.toString(),
            commitment: commitment,
            wordInputs: wordInputs,
            attempts: 0
        });
        console.log("Starting game session");
        try {
            let receipt = await wordleAppInteractor.startSession(sessionId, userWallet, commitment);
            
            // Verify the transaction was successful
            if (!receipt || !receipt.status) {
                throw new Error('Transaction failed or status is unknown');
            }

            // let receipt = {
            //     hash: "0x123",
            //     blockHash: "0x123",
            //     blockNumber: 123
            // }
            return res.status(200).json({
                success: true,
                message: 'Game started successfully',
                data: {
                    sessionId: sessionId.toString(),
                    commitment: commitment,
                    transactionHash: receipt.hash,
                    blockHash: receipt.blockHash,
                    blockNumber: receipt.blockNumber
                }
            });
        } catch (error) {
            console.error('Transaction error:', error);
            // If we have a transaction hash but the receipt failed, we can still return partial success
            if (error.transactionHash) {
                return res.status(202).json({
                    success: true,
                    message: 'Transaction sent but confirmation pending',
                    data: {
                        sessionId: sessionId.toString(),
                        commitment: commitment,
                        transactionHash: error.transactionHash,
                        status: 'pending'
                    }
                });
            }
            throw error; // Re-throw other errors to be caught by the outer try-catch
        }
    } catch (error) {
        console.error('Couldn\'t start game:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error
        });
    }
});

// Start server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
}); 