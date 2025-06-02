import CONTRACT_ABI_FULL from "./abi/WordleApp.json" assert { type: "json" };
import { ethers } from "ethers";

// Contract details
const CONTRACT_ADDRESS = "0xA2C5488dcCd2601B5B3AFA05136CDC18D387630B";
// You'll need to define your ABI here or load it from a file
const CONTRACT_ABI = CONTRACT_ABI_FULL.abi;

export class WordleAppInteractor {
    constructor(provider, signer) {
        this.provider = provider;
        this.signer = signer;
        this.contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, this.signer);
    }

    static async createWithMetamask() {
        if (typeof window.ethereum === 'undefined') {
            throw new Error('MetaMask is not installed');
        }
        
        // Request account access
        const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
        const provider = new ethers.BrowserProvider(window.ethereum);
        const signer = await provider.getSigner();
        
        return new WordleAppInteractor(provider, signer);
    }

    async startSession(sessionId, commitment) {
        try {
            const tx = await this.contract.startSession(
                sessionId,
                await this.signer.getAddress(),
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

    async getSession(sessionId) {
        return await this.contract.sessions(sessionId);
    }

    async getVerifierAddress() {
        return await this.contract.verifier();
    }

    listenForSessionStarted(callback, filter = {}) {
        this.contract.on("SessionStarted", (sessionId, player, commitment, event) => {
            callback({ sessionId, player, commitment, event });
        }, filter);
    }

    listenForGuessMade(callback, filter = {}) {
        this.contract.on("GuessMade", (sessionId, guess, feedback, event) => {
            callback({ sessionId, guess, feedback, event });
        }, filter);
    }

    stopAllListeners() {
        this.contract.removeAllListeners();
    }
}


export const convertInputsForContract = (sessionId, userInputConverted, feedback, proof, publicInputs, commitment) => {
    console.log('Debug raw inputs:', {
        sessionId,
        userInputConverted,
        feedback,
        proof: proof ? `Array of length ${Object.keys(proof).length}` : 'undefined',
        publicInputs: publicInputs ? `Array of length ${Object.keys(publicInputs).length}` : 'undefined',
        commitment
    });

    // 1. sessionId: string → uint256
    const sessionIdBN = BigInt(sessionId);
    
    // 2. userInputConverted: object containing bigint → uint256[6]
    // Assuming userInputConverted is an array-like object or has numeric keys
    const guessArray = [];
    for (let i = 0; i < 6; i++) {
        guessArray.push(BigInt(userInputConverted[i])); 
    }
    
    // 3. feedback: object containing number → uint256[6]
    const feedbackArray = [];
    for (let i = 0; i < 6; i++) {
        feedbackArray.push(BigInt(feedback[i])); // Convert number to bigint
    }
    
    // 4. proof: object containing number → bytes
    // Convert array of numbers to bytes
    if (!proof) {
        throw new Error('Proof is undefined');
    }
    const proofArray = [];
    for (let key in proof) {
        proofArray.push(proof[key]);
    }
    const proofBytes = new Uint8Array(proofArray);
    const proofHex = ethers.hexlify(proofBytes);
    
    // 5. publicInputs: object containing string → bytes32[]
    if (!publicInputs) {
        throw new Error('PublicInputs is undefined');
    }
    const publicInputsArray = [];
    for (let key in publicInputs) {
        // Ensure each string is properly formatted as bytes32
        const input = publicInputs[key];
        // If it's already a hex string, use it; otherwise convert
        const bytes32Value = ethers.isHexString(input) && input.length === 66 
            ? input 
            : ethers.zeroPadValue(ethers.toBeHex(input), 32);
        publicInputsArray.push(bytes32Value);
    }
    
    // 6. commitment: string → bytes32
    const commitmentBytes32 = ethers.isHexString(commitment) && commitment.length === 66
        ? commitment
        : ethers.zeroPadValue(ethers.toBeHex(commitment), 32);

    const result = {
        _sessionId: sessionIdBN,
        _userInputConverted: guessArray,
        _feedback: feedbackArray,
        _proof: proofHex,
        _publicInputs: publicInputsArray,
        _commitment: commitmentBytes32
    };

    console.log('Debug converted inputs:', {
        sessionId: result._sessionId.toString(),
        guess: result._userInputConverted.map(x => x.toString()),
        feedback: result._feedback.map(x => x.toString()),
        proofLength: result._proof,
        publicInputsLength: result._publicInputs,
        commitment: result._commitment
    });

    return result;
}
