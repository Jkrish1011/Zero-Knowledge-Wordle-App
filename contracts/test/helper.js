const { Barretenberg } = require('@aztec/bb.js');
const { randomBytes } = require('crypto');

const { WORD_LIST } = require('./words');
const WORD_LENGTH = 6;

const { ethers } = require('ethers');

const initBarretenberg = async () => {
    const barretenberg = await Barretenberg.new();
    return barretenberg;
}

const randomBytesCrypto = (len) => {
    return new Uint8Array(randomBytes(len));
}

const buffer32BytesToBigIntBE = (buf) => {
    return (
      (buf.readBigUInt64BE(0) << 192n) +
      (buf.readBigUInt64BE(8) << 128n) +
      (buf.readBigUInt64BE(16) << 64n) +
      buf.readBigUInt64BE(24)
    );
}
  
/**
 * Convert a BE Uint8Array to a BigInt.
 */
const uint8ArrayToBigIntBE = (bytes) => {
    const buffer = Buffer.from(bytes);
    return buffer32BytesToBigIntBE(buffer);
}

const charToFixedBytes = (char, length = 64) => {
    const charBuffer = Buffer.from(char, 'utf8');
    const paddedBuffer = Buffer.alloc(length);
    charBuffer.copy(paddedBuffer, 0);
    return paddedBuffer;
}

// Helper function to convert inputs to proper format for Noir
function prepareNoirInputs(inputs) {
    return {
        targetWord: inputs.targetWord.map(v => v.toString()),
        salt: inputs.salt.toString(),
        session_id: inputs.session_id.toString(),
        pedersen_hash: inputs.pedersen_hash.toString(),
        feedback: inputs.feedback.map(v => v.toString()),
        userInput: inputs.userInput.map(v => v.toString())
    };
}

const getAlphabeticIndex = (char) => {
    // Ensure input is a single character
    if (typeof char !== 'string' || char.length !== 1) {
        throw new Error("not a single character.");
    }

    // Convert to lowercase to handle both cases (e.g., 'A' and 'a')
    const lowerChar = char.toLowerCase();

    // Check if it's an alphabet character
    if (lowerChar >= 'a' && lowerChar <= 'z') {
        return lowerChar.charCodeAt(0) - 'a'.charCodeAt(0);
    } else {
        throw new Error("not an alphabet character.");
    }
}

const convertInputsForContract = (sessionId, userInputConverted, feedback, proof, publicInputs, commitment) => {
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
    const proofArray = [];
    for (let key in proof) {
        proofArray.push(proof[key]);
    }
    const proofBytes = new Uint8Array(proofArray);
    const proofHex = ethers.hexlify(proofBytes);
    
    // 5. publicInputs: object containing string → bytes32[]
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
    
    return {
        _sessionId: sessionIdBN,
        _userInputConverted: guessArray,
        _feedback: feedbackArray,
        _proof: proofHex,
        _publicInputs: publicInputsArray,
        _commitment: commitmentBytes32
    };
}


const pickRandomWord = () => {
    // Only use words with exactly 6 letters
    const sixLetterWords = WORD_LIST.filter(w => w.length === WORD_LENGTH);
    const currentWord = sixLetterWords[Math.floor(Math.random() * sixLetterWords.length)].toUpperCase();
    return currentWord;
}

const computePedersenCommmitment = async (targetWord, sessionId, salt, bb) => {

    const wordInputs = [...targetWord].map(char => {
        return getAlphabeticIndex(char);
    }).map(alphabet => BigInt(alphabet));
    
    const inputs = [
        ...wordInputs,
        sessionId,
        salt
    ];
    
    const commitment = await bb.pedersenHash(inputs, 0);
    return {commitment: commitment.toString(), wordInputs: wordInputs};
};

const checkGuess = (guess, targetWord) => {
    const guessArr = guess.split("");
    const targetArr = targetWord.split("");
    let letterStatus = Array(WORD_LENGTH).fill("absent");
    let targetLetterCount = {};
  
    // Count letters in target word
    for (let l of targetArr) {
      targetLetterCount[l] = (targetLetterCount[l] || 0) + 1;
    }
  
    // First pass: correct positions
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (guessArr[i] === targetArr[i]) {
        letterStatus[i] = "correct";
        targetLetterCount[guessArr[i]]--;
      }
    }
  
    // Second pass: present but wrong position
    for (let i = 0; i < WORD_LENGTH; i++) {
      if (letterStatus[i] === "correct") continue;
      if (targetArr.includes(guessArr[i]) && targetLetterCount[guessArr[i]] > 0) {
        letterStatus[i] = "present";
        targetLetterCount[guessArr[i]]--;
      }
    }
  
    // Update grid colors and letters
    
    let feedback = letterStatus.map(status => {
      if (status === "correct") return 2;
      if (status === "present") return 1;
      return 0;
    });

    return feedback;
}

module.exports = {
    pickRandomWord,
    computePedersenCommmitment,
    initBarretenberg,
    randomBytesCrypto,
    checkGuess,
    uint8ArrayToBigIntBE,
    getAlphabeticIndex,
    prepareNoirInputs,
    convertInputsForContract
};