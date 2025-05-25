const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { Fr } = require('@aztec/bb.js');
const {UltraHonkBackend} = require("@aztec/bb.js");
const { Noir } = require('@noir-lang/noir_js');
const circuit = require("./noir_circuit/wordle_app.json");

const { getAlphabeticIndex, pickRandomWord, computePedersenCommmitment, initBarretenberg, checkGuess, randomBytesCrypto, uint8ArrayToBigIntBE } = require('./helper.js');
const { MAX_ATTEMPTS } = require('./constants.js');

// Load environment variables
dotenv.config();

const app = express();

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
        const { sessionId, userInput, userSignature } = req.body;

        // get the target word from the game_db
        const game = game_db.find(game => game.sessionId === sessionId);
        if(!game) {
            return res.status(400).json({
                success: false,
                error: 'Invalid sessionId. Start a new game'
            });
        }

        const feedback = checkGuess(userInput, game.targetWord);
        game.attempts++;

        const noir = new Noir(circuit);
        const userInputConverted = userInput.split("").map(char => BigInt(getAlphabeticIndex(char)));
        const targetWordConverted = game.targetWord.split("").map(char => BigInt(getAlphabeticIndex(char)));
        const feedbackConverted = feedback.map(f => BigInt(f)); 
        console.log({userInputConverted});
        console.log('Types check:');
        console.log('targetWord:', targetWordConverted, typeof targetWordConverted[0]);
        console.log('salt:', BigInt(game.salt), typeof BigInt(game.salt));
        console.log('session_id:', BigInt(game.sessionId), typeof BigInt(game.sessionId));
        console.log('pedersen_hash:', BigInt(game.commitment), typeof BigInt(game.commitment));
        
        
        console.log('feedback:', feedbackConverted, typeof feedbackConverted[0]);
        console.log('userInput:', userInputConverted, typeof userInputConverted[0]);
        const { witness } = await noir.execute({
            targetWord: targetWordConverted,
            salt: BigInt(game.salt),
            session_id: BigInt(game.sessionId),
            pedersen_hash: BigInt(game.commitment), 
            feedback: feedbackConverted, 
            userInput: userInputConverted
        });
        
        const backend = new UltraHonkBackend(circuit.bytecode);
        const {proof, publicInputs} = await backend.generateProof(witness);

        if(feedback.every(status => status === 2)) {
            return res.status(200).json({
                success: true,
                message: 'Game Over! You won!',
                data: {
                    feedback,
                    attempts: game.attempts,
                    isGameOver: true,
                    proof: proof,
                    publicInputs: publicInputs
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
                    proof: proof,
                    publicInputs: publicInputs
                }
            });
        }
        return res.status(200).json({
            success: true,
            message: 'Feedback calculated successfully',
            data: {
                feedback,
                attempts: game.attempts,
                proof: proof,
                publicInputs: publicInputs,
                isGameOver: (game.attempts === MAX_ATTEMPTS) || (feedback.every(status => status === 2))
            }
        });

    } catch (error) {
        console.error('Error:', error);
        return res.status(500).json({
            success: false,
            message: 'Internal server error',
            error: error
        });
    }
});

// Start game route
app.get('/api/start_game', async (req, res) => {
    try {
        const targetWord = pickRandomWord();
        const sessionId = uint8ArrayToBigIntBE(randomBytesCrypto(64));
        const salt = uint8ArrayToBigIntBE(randomBytesCrypto(64));
        console.log("targetWord", targetWord);
        const bb = await initBarretenberg();
        const pedersenHash = await computePedersenCommmitment(targetWord, sessionId, salt, bb);

        game_db.push({
            targetWord: targetWord,
            salt: salt.toString(),
            sessionId: sessionId.toString(),
            commitment:pedersenHash,
            attempts: 0
        });

        return res.status(200).json({
            success: true,
            message: 'Game started successfully',
            data: {
                sessionId: sessionId.toString(),
                commitment: pedersenHash
            }
        });
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