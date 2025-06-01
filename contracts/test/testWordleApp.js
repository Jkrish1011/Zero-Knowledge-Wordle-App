const { expect } = require("chai");
const hre = require("hardhat");
const {
  loadFixture,
  time,
} = require("@nomicfoundation/hardhat-toolbox/network-helpers");

const { UltraHonkBackend, Fr } = require('@aztec/bb.js');
const { Noir } = require('@noir-lang/noir_js');
const circuit = require("./wordle_app.json");

const {
  pickRandomWord,
  uint8ArrayToBigIntBE,
  randomBytesCrypto,
  initBarretenberg,
  computePedersenCommmitment,
  getAlphabeticIndex,
  prepareNoirInputs,
  checkGuess
} = require("./helper");

describe("WordleApp", function () {
  async function deployWordleAppFixture() {
    const verifier = await hre.ethers.deployContract("HonkVerifier");
    console.log("verifier", verifier.target);
    const wordleApp = await hre.ethers.deployContract("WordleApp", [verifier.target], {
    });

    return { wordleApp, verifier };
  }

  it("Should set the right verifier", async function () {
    const { wordleApp, verifier } = await loadFixture(deployWordleAppFixture);

    // assert that the value is correct
    expect(await wordleApp.verifier()).to.equal(verifier.target);
  });

//   it("Start Game", async function () {
//     const { wordleApp } = await loadFixture(deployWordleAppFixture);

//     const [owner] = await hre.ethers.getSigners();

//     const sessionId = BigInt(7018558081055087327022903219186038509231319607451137873687964136067378122800);
//     const commitment = "0x2197362b1dddc4c94d89834ba3941074fda8b4d8eb6786959b4247968c4510ee";

//     await wordleApp.startSession(sessionId.toString(), owner.address, commitment);
//   });

  it("Verify Guess", async function () {
    const { wordleApp } = await loadFixture(deployWordleAppFixture);

    const [owner] = await hre.ethers.getSigners();
    const targetWord = pickRandomWord();
    const sessionId = uint8ArrayToBigIntBE(randomBytesCrypto(64)) % Fr.MODULUS;
    const salt = uint8ArrayToBigIntBE(randomBytesCrypto(64)) % Fr.MODULUS;
    console.log("targetWord", targetWord);
    const bb = await initBarretenberg();
    const { commitment, wordInputs } = await computePedersenCommmitment(targetWord, sessionId, salt, bb);

    const userInput = "ABCDEF";
    const userInputConverted = [...userInput].map(char => {
        return getAlphabeticIndex(char);
    }).map(alphabet => BigInt(alphabet));

    const targetWordConverted = wordInputs;

    const feedback = checkGuess(userInput, targetWord);
    const feedbackConverted = feedback.map(f => BigInt(f)); 

    await wordleApp.startSession(sessionId.toString(), owner.address, commitment);

    const noirInputs = {
        targetWord: targetWordConverted,
        salt: BigInt(salt),
        session_id: BigInt(sessionId),
        pedersen_hash: BigInt(commitment), 
        feedback: feedbackConverted, 
        userInput: userInputConverted
    };
  
    const noirInputsConverted = prepareNoirInputs(noirInputs);
    console.log({noirInputsConverted});
    const backend = new UltraHonkBackend(circuit.bytecode);
    const noir = new Noir(circuit);
    const { witness } = await noir.execute(noirInputsConverted);
    const {proof, publicInputs} = await backend.generateProof(witness, {keccak: true});
    const verified = await backend.verifyProof({proof, publicInputs}, {keccak: true});
    console.log({verified});

    const EXPECTED_BYTES = 440 * 32; // 14,080 bytes
    console.log("proof", proof);
    console.log("commitment", commitment);
    let result = await wordleApp.verifyGuess(sessionId, userInputConverted, feedbackConverted, Uint8Array.from(proof), publicInputs, commitment);
    
  });
});