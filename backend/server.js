const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { Fr } = require('@aztec/bb.js');
const {UltraHonkBackend} = require("@aztec/bb.js");


const { pickRandomWord, computePedersenCommmitment, initBarretenberg, checkGuess } = require('./helper.js');
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
        console.log(feedback);
        game.attempts++;

    //     const witness = {
    //         targetWord: game.targetWord,
    //         salt: game.salt,
    //         session_id: game.sessionId,
    //         pedersen_hash: game.commitment,
    //         feedback: [0,0,0,0,0,0],
    //         userInput: userInput
    //     }
    //     const circuit = JSON.parse(fs.readFileSync(path.join(__dirname, 'wordle_app.json'), "utf-8"));
    //     const backend = new UltraHonkBackend(circuit.bytecode);
    //     const {proof, publicInputs} = await backend.generateProof(witness);
    //     const verified = await backend.verifyProof({proof:Uint8Array.from(proof), publicInputs});

    //    if(!verified) {
    //     return res.status(400).json({ 
    //         success: false,
    //         error: 'Proof verification Failed!'
    //     });
    //    }

        return res.status(200).json({
            success: true,
            message: 'Feedback submitted successfully',
            data: {
                feedback,
                attempts: game.attempts,
                isGameOver: (game.attempts === MAX_ATTEMPTS) || (feedback.every(status => status === 2))
            }
        });

    } catch (error) {
        console.error('Registration error:', error);
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
        const sessionId = Fr.random();
        const salt = Fr.random();
        console.log("targetWord", targetWord);
        const bb = await initBarretenberg();
        const pedersenHash = await computePedersenCommmitment(targetWord, sessionId, salt, bb);

        game_db.push({
            targetWord: targetWord,
            salt: salt.toString().slice(2, salt.toString().length),
            sessionId: sessionId.toString().slice(2, sessionId.toString().length),
            commitment:pedersenHash,
            attempts: 0
        });

        return res.status(200).json({
            success: true,
            message: 'Game started successfully',
            data: {
                sessionId: sessionId.toString().slice(2, sessionId.toString().length),
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