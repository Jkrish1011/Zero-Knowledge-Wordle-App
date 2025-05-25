const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bodyParser = require('body-parser');
const fs = require('fs');
const path = require('path');
const { Fr } = require('@aztec/bb.js');
const {UltraHonkBackend} = require("@aztec/bb.js");


const { pickRandomWord, computePedersenCommmitment, initBarretenberg } = require('./helper.js');

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

// Check feedback route
app.post('/api/check_feedback', async (req, res) => {
    try {
        const { targetWord, salt, session_id, pedersen_hash, feedback, userInput } = req.body;

        // Validate required fields
        if (!username || !password || !proof) {
            return res.status(400).json({
                success: false,
                message: 'Missing required fields: username, password, and proof are required'
            });
        }

        const circuit = JSON.parse(fs.readFileSync(path.join(__dirname, 'wordle_app.json'), "utf-8"));
        const backend = new UltraHonkBackend(circuit.bytecode);
        
        if(Number(publicInputs[0]) !== 2025) {
            return res.status(400).json({
                success: false,
                error: 'Invalid public input'
            });
        }
        const verified = await backend.verifyProof({proof:Uint8Array.from(proof), publicInputs});

       if(!verified) {
        return res.status(400).json({ 
            success: false,
            error: 'Proof verification Failed!'
        });
       }

        // Mock successful registration
        return res.status(200).json({
            success: true,
            message: 'Registration successful',
            data: {
                username,
                // Don't send back sensitive data
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

        const bb = await initBarretenberg();
        const pedersenHash = await computePedersenCommmitment(targetWord, sessionId, salt, bb);
        
        return res.status(200).json({
            success: true,
            message: 'Game started successfully',
            data: {
                sessionId: sessionId.toString().slice(2, sessionId.toString().length),
                commitment:pedersenHash
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