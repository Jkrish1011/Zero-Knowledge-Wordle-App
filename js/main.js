import circuit from "/assets/wordle_app.json" assert { type: "json" };
import { UltraHonkBackend } from "@aztec/bb.js";
import { Barretenberg } from "@aztec/bb.js";

// Wordle Game Logic

let currentRow = 0;
let isGameOver = false;
const MAX_ATTEMPTS = 6;
const WORD_LENGTH = 6;
let sessionId = "";
let proof = "";
let publicInputs = "";
let metamaskWallet = "";
let chainId = "";
let targetWord = "";
let salt = "";
let commitment = "";

const initBarretenberg = async () => {
  const barretenberg = await Barretenberg.new();
  return barretenberg;
}

function createGrid() {
  const grid = document.getElementById("wordle-grid");
  grid.innerHTML = "";
  for (let i = 0; i < MAX_ATTEMPTS; i++) {
    const row = document.createElement("div");
    row.className = "wordle-row";
    for (let j = 0; j < WORD_LENGTH; j++) {
      const box = document.createElement("div");
      box.className = "letter-box";
      box.id = `box-${i}-${j}`;
      row.appendChild(box);
    }
    grid.appendChild(row);
  }
}

function showMessage(msg, color = null) {
  const messageDiv = document.getElementById("message");
  messageDiv.textContent = msg;
  if (color) messageDiv.style.color = color;
  else messageDiv.style.color = "#d32f2f";
}

function showProofs(proof, publicInputs) {
  const proofContainer = document.getElementById("proof-container");
  const proofDiv = document.getElementById("proof");
  const publicInputsDiv = document.getElementById("publicInputs");
  
  // Show the proof container
  proofContainer.classList.remove("hidden");
  
  // Update the content
  proofDiv.textContent = JSON.stringify(proof, null, 2);
  publicInputsDiv.textContent = JSON.stringify(publicInputs, null, 2);
}

function updateGrid(feedback, attempts, userInput) {
  let guessArr = userInput.split("");
  let letterStatus = feedback.map(status => {
      if (status === 2) return "correct";
      if (status === 1) return "present";
      return "absent";
    });
  
  // Update grid colors and letters
  for (let i = 0; i < WORD_LENGTH; i++) {
    const box = document.getElementById(`box-${currentRow}-${i}`);
    box.textContent = guessArr[i];
    box.classList.remove("correct", "present", "absent");
    box.classList.add(letterStatus[i]);
  }

  currentRow = attempts;
}

function clearMessage() {
  showMessage("");
}

function showLoading() {
  const loadingContainer = document.getElementById("loading-container");
  const input = document.getElementById("wordInput");
  const submitButton = document.querySelector("#wordleForm button[type='submit']");
  
  loadingContainer.classList.remove("hidden");
  input.disabled = true;
  submitButton.disabled = true;
}

function hideLoading() {
  const loadingContainer = document.getElementById("loading-container");
  const input = document.getElementById("wordInput");
  const submitButton = document.querySelector("#wordleForm button[type='submit']");
  
  loadingContainer.classList.add("hidden");
  input.disabled = false;
  submitButton.disabled = false;
  input.focus();
}

function showVerifyLoading() {
  const loadingContainer = document.getElementById("verify-loading-container");
  const verifyButton = document.querySelector("#verifyProofs");
  loadingContainer.classList.remove("hidden");
  verifyButton.disabled = true;
}

function hideVerifyLoading() {
  const loadingContainer = document.getElementById("verify-loading-container");
  const verifyButton = document.querySelector("#verifyProofs");
  loadingContainer.classList.add("hidden");
  verifyButton.disabled = false;
}

async function sendFeedbackData(sessionId, userInput, userSignature) {
  const url = 'http://localhost:3000/api/check_feedback';
  const data = {
    sessionId: sessionId,
    userInput: userInput,
    userSignature: userSignature
  };
  console.log({data});

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorData.message || response.statusText}`);
    }

    const responseData = await response.json();
    console.log('Success:', responseData);
    return responseData; 

  } catch (err) {
    console.error('Error sending data:', err);
    throw err;
  }
}

async function startGame(userWallet) {
  const url = 'http://localhost:3000/api/start_game';
  const data = {
    userWallet: userWallet,
  };
  console.log({data});

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json' 
      },
      body: JSON.stringify(data)
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ message: response.statusText }));
      throw new Error(`HTTP error! Status: ${response.status}, Message: ${errorData.message || response.statusText}`);
    }

    const responseData = await response.json();
    console.log('Success:', responseData);
    return responseData; 

  } catch (err) {
    console.error('Error sending data:', err);
    throw err;
  }
}

async function verifyProof() {
  try {
    console.log({proof, publicInputs});
    showVerifyLoading();
    const backend = new UltraHonkBackend(circuit.bytecode);
    const verified = await backend.verifyProof({proof:proof, publicInputs});
    console.log({verified});
    if(verified) {
      showMessage("Proof verified successfully!", "#388e3c");
    } else {
      showMessage("Proof verification failed!", "#d32f2f");
    }
  } catch (error) {
    console.error('Error verifying proof:', error);
    showMessage("Error verifying proof. Please try again.", "#d32f2f");
  } finally {
    hideVerifyLoading();
  }
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

const computePedersenCommmitment = async (targetWord, sessionId, salt) => {
  const bb = await initBarretenberg();
  const wordInputs = [...targetWord].map(char => {
      return getAlphabeticIndex(char);
  }).map(alphabet => BigInt(alphabet));
  
  const inputs = [
      ...wordInputs,
      BigInt(sessionId),
      BigInt(salt)
  ];
  
  const commitment = await bb.pedersenHash(inputs, 0);
  return {commitment: commitment.toString(), wordInputs: wordInputs};
};

async function handleInput(e) {
  e.preventDefault();
  if (isGameOver) return;
  clearMessage();
  const input = document.getElementById("wordInput");
  let val = input.value.toUpperCase();
  input.value = "";
  if (!val.match(/^[A-Z]{6}$/)) {
    showMessage("Please enter a valid 6-letter word.");
    return;
  }

  try {
    showLoading();
    const response = await sendFeedbackData(sessionId, val, "abcdefg");
    console.log(response);
    updateGrid(response.data.feedback, response.data.attempts, val);
    proof = Uint8Array.from(response.data.proof);
    publicInputs = response.data.publicInputs;
    showProofs(proof, publicInputs);
    
    if(response.data.isGameOver && response.data.feedback.every(status => status === 2)) {
      showMessage(`Game Over! You won!`, "#388e3c");
      isGameOver = true;
    }
    if(response.data.attempts === MAX_ATTEMPTS && !response.data.feedback.every(status => status === 2)) {
      showMessage(`Game Over! You lost! The word was: ${response.data.targetWord}. The Salt value is: ${response.data.salt} & the Session ID is: ${sessionId}`, "#d32f2f");
      isGameOver = true;
      targetWord = response.data.targetWord;
      salt = response.data.salt;
      document.getElementById("computeCommitment").classList.remove("hidden");
      document.getElementById("guessButton").classList.add("hidden");
    }
  } catch (error) {
    showMessage("Error checking your guess. Please try again.", "#d32f2f");
  } finally {
    hideLoading();
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  // let response = await fetch('http://localhost:3000/api/start_game')
  //   .then(response => response.json())
  //   .then(data => {
  //     console.log(data);
  //     return data;
  //   })
  //   .catch(error => {
  //     console.error('Error:', error);
  //   });

  // Expose this function to be called from main.js
  window.updateMetamaskUI = updateUI;

  // Add event listener for MetaMask connect button
  const connectButton = document.getElementById("connectButton");
  connectButton.addEventListener("click", connectMetaMask);

  // Start game handler
  document.getElementById('startGameButton')?.addEventListener('click', async function() {
    try {
      const response = await startGame(metamaskWallet);
      if (response && response.data) {
        sessionId = response.data.sessionId;
        document.getElementById("backendCommitmentValue").textContent = response.data.commitment;
        commitment = response.data.commitment;
        // Hide start game button and show game content
        document.getElementById('startGameButton').classList.add('hidden');
        document.getElementById('game-content').classList.remove('hidden');
        
        // Initialize game grid
        createGrid();
        currentRow = 0;
        isGameOver = false;
        clearMessage();
      }
    } catch (error) {
      console.error('Error starting game:', error);
      showMessage("Error starting game. Please try again.", "#d32f2f");
    }
  });

  const form = document.getElementById("wordleForm");
  form.addEventListener("submit", handleInput);

  // Add event listener for verify proofs button
  const verifyButton = document.getElementById("verifyProofs");
  verifyButton.addEventListener("click", verifyProof);

  const computeCommitmentButton = document.getElementById("computeCommitment");
  computeCommitmentButton.addEventListener("click", computeCommitment);
});

async function computeCommitment() {
  const response = await computePedersenCommmitment(targetWord, sessionId, salt);
  
  commitment = response.commitment;
  document.getElementById("commitmentVerification").textContent = `Commitment Calculated is : ${commitment}`;
}

function updateUI(connected) {
  const connectButton = document.getElementById('connectButton');
  const startGameButton = document.getElementById('startGameButton');
  const gameContent = document.getElementById('game-content');
  const walletInfo = document.getElementById('wallet-info');
  if (connected) {
    // Hide connect button and show start game button
    connectButton.classList.add('hidden');
    startGameButton.classList.remove('hidden');
    // Keep game content hidden until Start Game is clicked
    gameContent.classList.add('hidden');
    walletInfo.classList.remove('hidden');
  } else {
    // Show connect button and hide start game button
    connectButton.classList.remove('hidden');
    startGameButton.classList.add('hidden');
    // Hide game content
    gameContent.classList.add('hidden');
  }
}

async function connectMetaMask() {
  if (typeof window.ethereum !== 'undefined') {
    try {
      const accounts = await window.ethereum.request({ method: 'eth_requestAccounts' });
      const chainIdFromWallet = await window.ethereum.request({ method: 'eth_chainId' });
      
      // Update wallet info display
      // let shortAddress = `${accounts[0].slice(0, 6)}...${accounts[0].slice(-4)}`;
      document.getElementById('account').textContent = `Wallet: ${accounts[0]}`;
      document.getElementById('chainId').textContent = `Chain ID: ${parseInt(chainIdFromWallet, 16)}`;
      
      // Store wallet info
      metamaskWallet = accounts[0];
      chainId = parseInt(chainId, 16);
      
      // Update UI to show start game button
      updateUI(true);
    } catch (error) {
      console.error('Error connecting to MetaMask:', error);
      updateUI(false);
    }
  } else {
    alert('Please install MetaMask!');
    updateUI(false);
  }
}