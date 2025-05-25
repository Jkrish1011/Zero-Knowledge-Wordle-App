const { Barretenberg, Fr } = require('@aztec/bb.js');
const { keccak256, toUtf8Bytes } = require('ethers');
const { randomBytes } = require('crypto');
// const { compile, createProof } = require('@aztec/noir-compiler');

const { WORD_LIST } = require('./words');
const { WORD_LENGTH } = require('./constants');

async function initBarretenberg() {
    const barretenberg = await Barretenberg.new();
    return barretenberg;
}

function randomBytesCrypto(len) {
    return new Uint8Array(randomBytes(len));
}

function buffer32BytesToBigIntBE(buf) {
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
function uint8ArrayToBigIntBE(bytes) {
    const buffer = Buffer.from(bytes);
    return buffer32BytesToBigIntBE(buffer);
}

function charToFixedBytes(char, length = 64) {
    const charBuffer = Buffer.from(char, 'utf8');
    const paddedBuffer = Buffer.alloc(length);
    charBuffer.copy(paddedBuffer, 0);
    return paddedBuffer;
}



const pickRandomWord = () => {
    // Only use words with exactly 6 letters
    const sixLetterWords = WORD_LIST.filter(w => w.length === WORD_LENGTH);
    const currentWord = sixLetterWords[Math.floor(Math.random() * sixLetterWords.length)].toUpperCase();
    return currentWord;
}

const computePedersenCommmitment = async (targetWord, sessionId, salt, bb) => {

    const wordInputs = [...targetWord].map(char => {
        return new Fr(uint8ArrayToBigIntBE(charToFixedBytes(char)) % Fr.MODULUS );
    });
    
    const inputs = [
        ...wordInputs,
        sessionId,
        salt
    ];
    
    const commitment = await bb.pedersenHash(inputs, 0);
    return commitment.toString();
};

function checkGuess(guess, targetWord) {
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
    checkGuess
};