const { ethers } = require("ethers");
require("dotenv").config();

// Contract details
const CONTRACT_ABI = require("./abi/WordleApp.json").abi;
const CONTRACT_ADDRESS = "0xc69f8bA784c60F2bF81714e80A9ca5F09385a7b2";

class WordleAppInteractor {
    constructor() {
        this.provider = new ethers.JsonRpcProvider(process.env.RPC_URL);
        this.wallet = new ethers.Wallet(process.env.PRIVATE_KEY, this.provider);
        this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.wallet);
    }

    async startSession(sessionId, player, commitment) {
        try {
            const tx = await this.contract.startSession(
                sessionId,
                player,
                commitment
            );
            
            // Wait for transaction with a timeout
            const receipt = await Promise.race([
                tx.wait(),
                new Promise((_, reject) => 
                    setTimeout(() => reject(new Error('Transaction confirmation timeout')), 60000)
                )
            ]);
            
            return receipt;
        } catch (error) {
            console.error('Error in startSession:', error);
            if (error.message.includes('timeout')) {
                throw new Error('Transaction took too long to confirm. Please check the transaction status manually.');
            }
            throw error;
        }
    }

    async verifyGuess(sessionId, guess, feedback, proof, publicInputs, commitment) {
        if (guess.length !== 6 || feedback.length !== 6) {
            throw new Error("Guess and feedback must be arrays of length 6");
        }

        const tx = await this.contract.verifyGuess(
            sessionId,
            guess,
            feedback,
            proof,
            publicInputs,
            commitment
        );
        // Wait for transaction with a timeout
        const receipt = await Promise.race([
            tx.wait(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Transaction confirmation timeout')), 60000)
            )
        ]);
        return receipt;
    }

    async estimateVerifyGuess(sessionId, guess, feedback, proof, publicInputs, commitment) {
        try {
            const gasEstimate = await this.contract.estimateGas.verifyGuess(
                sessionId,
                guess,
                feedback,
                proof,
                publicInputs,
                commitment
            );
            return gasEstimate;
        } catch (error) {
            console.error("Gas estimation failed:", error);
            throw error;
        }
    }

    async revealWord(sessionId, word, salt) {
        if (word.length !== 6) {
            throw new Error("Word must be an array of length 6");
        }

        const tx = await this.contract.revealWord(
            sessionId,
            word,
            salt
        );
        // Wait for transaction with a timeout
        const receipt = await Promise.race([
            tx.wait(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Transaction confirmation timeout')), 60000)
            )
        ]);
        return receipt;
    }

    async updateSession(sessionId, feedback, guess) {
        const tx = await this.contract.updateSession(sessionId, feedback, guess);
         // Wait for transaction with a timeout
         const receipt = await Promise.race([
            tx.wait(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Transaction confirmation timeout')), 60000)
            )
        ]);
        return receipt;
    }

    async checkIfGameOver(sessionId) {
        const tx = await this.contract.checkIfGameOver(sessionId);
         // Wait for transaction with a timeout
         const receipt = await Promise.race([
            tx.wait(),
            new Promise((_, reject) => 
                setTimeout(() => reject(new Error('Transaction confirmation timeout')), 60000)
            )
        ]);
        return tx;
    }

    async getSession(sessionId) {
        return await this.contract.sessions(sessionId);
    }

    async getVerifierAddress() {
        return await this.contract.verifier();
    }

    async listenForSessionStarted(callback, filter = {}) {
        this.contract.on("SessionStarted", (sessionId, player, commitment, event) => {
            callback({ sessionId, player, commitment, event });
        }, filter);
    }

    async listenForGuessMade(callback, filter = {}) {
        this.contract.on("GuessMade", (sessionId, guess, feedback, event) => {
            callback({ sessionId, guess, feedback, event });
        }, filter);
    }

    stopAllListeners() {
        this.contract.removeAllListeners();
    }
}

module.exports = WordleAppInteractor;