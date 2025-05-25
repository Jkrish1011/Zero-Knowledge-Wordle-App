const { Barretenberg, Fr } = require('@aztec/bb.js');
const { keccak256, toUtf8Bytes } = require('ethers');
const { randomBytes } = require('crypto');
// const { compile, createProof } = require('@aztec/noir-compiler');

const { WORD_LIST } = require('./words');

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

const MAX_ATTEMPTS = 6;
const WORD_LENGTH = 6;

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

    await testPedersenHash(bb);
    return commitment.toString();
};

async function testPedersenHash(bb) {
    const inputs = ["1", "2", "3"];
    let testInputs = inputs.map(input => {
        return new Fr(uint8ArrayToBigIntBE(charToFixedBytes(input)) % Fr.MODULUS );
    });
    const testHash = await bb.pedersenHash(testInputs, 0);
    console.log("Test hash:", testHash.toString());
    // 0x004d362aaff0fb24e4dd09c146a3839ab5ab33abeec95b2046fe9b723e608647
    // 0x0c21b8e26f60b476d9568df4807131ff70d8b7fffb03fa07960aa1cac9be7c46
    // 0x0c21b8e26f60b476d9568df4807131ff70d8b7fffb03fa07960aa1cac9be7c46
}

module.exports = {
    pickRandomWord,
    computePedersenCommmitment,
    initBarretenberg,
    randomBytesCrypto
};