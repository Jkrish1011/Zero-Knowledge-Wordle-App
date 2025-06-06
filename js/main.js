import circuit from "/assets/wordle_app.json" assert { type: "json" };
import { UltraHonkBackend } from "@aztec/bb.js";
import { Barretenberg } from "@aztec/bb.js";
import { WordleAppInteractor, convertInputsForContract } from "./wordleSmartContractInteractor.js";

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
let currentFeedback = [];
let currentUserInput = [];
let wordleApp;

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

function showMessageWonOrLost(msg, color = null) {
  const messageWonOrLostDiv = document.getElementById("messageWonOrLost");
  messageWonOrLostDiv.textContent = msg;
  if (color) messageWonOrLostDiv.style.color = color;
  else messageWonOrLostDiv.style.color = "#d32f2f";
}

function showProofs(proof, publicInputs) {
  const proofContainer = document.getElementById("proof-container");
  const proofDiv = document.getElementById("proof");
  const publicInputsDiv = document.getElementById("publicInputs");
  
  // Show the proof container
  proofContainer.classList.remove("hidden");
  
  // Update the content
  proofDiv.textContent = proof;
  publicInputsDiv.textContent = publicInputs;
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

function showGameStartLoading() {
  const loadingContainer = document.getElementById("game-start-container");
  loadingContainer.classList.remove("hidden");
  const startGameButton = document.getElementById("startGameButton");
  startGameButton.disabled = true;
}

function hideGameStartLoading() {
  const loadingContainer = document.getElementById("game-start-container");
  loadingContainer.classList.add("hidden");
  const startGameButton = document.getElementById("startGameButton");
  startGameButton.disabled = false;
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

async function sendFeedbackData(sessionId, userInput) {
  const url = 'http://localhost:3000/api/check_feedback';
  const data = {
    sessionId: sessionId,
    userInput: userInput,
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
  showGameStartLoading();
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
  } finally {
    hideGameStartLoading();
  }
}

async function verifyProofOnChain() {
  try {
    console.log({proof, publicInputs});
    showVerifyLoading();
    console.log('checking proofs onchain...')

    let contractVerification = await wordleApp.verifyGuess(sessionId, currentUserInput, currentFeedback.map(v => BigInt(v)), proof, publicInputs, commitment);
    console.log({contractVerification});

    if (contractVerification.hash) {
      createTransactionHashLink(contractVerification.hash, 'Verify Guess:');
    }
    clearMessage();
    if(contractVerification.hash) {
      showMessage("Proof verified onchain successfully!", "#388e3c");
    } else {
      showMessage("Proof verification onchain failed!", "#d32f2f");
    }
  } catch (error) {
    console.error('Error verifying proof onchain:', error);
    showMessage("Error verifying proof onchain. Please try again.", "#d32f2f");
  } finally {
    hideVerifyLoading();
  }
}

async function verifyProof() {
  try {
    console.log({proof, publicInputs});
    showVerifyLoading();
    const backend = new UltraHonkBackend(circuit.bytecode);
    console.log('checking proofs...')
    const verified = await backend.verifyProof({proof, publicInputs}, {keccak: true});
    console.log({verified});
    clearMessage();
    if(verified) {
      showMessage("Proof verified in-browser successfully!", "#388e3c");
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
    const response = await sendFeedbackData(sessionId, val);
    console.log(response);
    updateGrid(response.data.feedback, response.data.attempts, val);
    proof = Uint8Array.from(response.data.proof);
    publicInputs = response.data.publicInputs;
    currentFeedback = response.data.feedback;
    currentUserInput = val.split("").map(char => BigInt(getAlphabeticIndex(char)));
    console.log({proof, publicInputs, currentFeedback, currentUserInput});
    clearMessage();
    showProofs(proof, publicInputs);
    
    if(response.data.isGameOver && response.data.feedback.every(status => status === 2)) {
      targetWord = response.data.targetWord;
      salt = response.data.salt;
      showMessageWonOrLost(`Game Over! You won!`, "#388e3c");
      updateTargetWord(response.data.targetWord);
      updateSalt(response.data.salt);
      isGameOver = true;
      document.getElementById("computeCommitment").classList.remove("hidden");
      document.getElementById("guessButton").classList.add("hidden");
    }

    if(response.data.attempts === MAX_ATTEMPTS && !response.data.feedback.every(status => status === 2)) {
      showMessageWonOrLost(`Game Over! You lost!`, "#d32f2f");
      updateTargetWord(response.data.targetWord);
      updateSalt(response.data.salt);
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
  // Remove the automatic MetaMask initialization
  // wordleApp = await WordleAppInteractor.createWithMetamask();

  // Add event listener for MetaMask connect button
  const connectButton = document.getElementById("connectButton");
  connectButton.addEventListener("click", async () => {
    try {
      // Initialize MetaMask only when button is clicked
      wordleApp = await WordleAppInteractor.createWithMetamask();
      await connectMetaMask();
    } catch (error) {
      console.error('Error initializing MetaMask:', error);
      updateUI(false);
    }
  });

  // Add event listener for MetaMask account changes
  if (window.ethereum) {
    window.ethereum.on('accountsChanged', (accounts) => {
      if (accounts.length === 0) {
        // User disconnected their wallet
        updateUI(false);
      } else {
        // User switched accounts
        metamaskWallet = accounts[0];
        document.getElementById('account').textContent = `Wallet: ${accounts[0]}`;
      }
    });

    window.ethereum.on('chainChanged', (chainIdFromWallet) => {
      chainId = parseInt(chainIdFromWallet, 16);
      document.getElementById('chainId').textContent = `Chain ID: ${chainId}`;
    });
  }

  // Start game handler
  document.getElementById('startGameButton')?.addEventListener('click', async function() {
  try {
      const response = await startGame(metamaskWallet);
      if (response && response.data) {
        sessionId = response.data.sessionId;
        document.getElementById("sessionIdValue").textContent = `Session ID: ` + sessionId;
        document.getElementById("backendCommitmentValue").textContent = `Commitment for Current Word: ` + response.data.commitment;
        commitment = response.data.commitment;
        
        // Clear any existing transaction hashes
        document.getElementById("proof-section").classList.remove("hidden");
        const container = document.getElementById('transaction-hashes');
        container.innerHTML = '';
        
        // Add the start session transaction hash
        if (response.data.transactionHash) {
            createTransactionHashLink(response.data.transactionHash, 'Start Session:');
        }
        
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

  const verifyButtonOnChain = document.getElementById("verifyProofsOnChain");
  verifyButtonOnChain.addEventListener("click", verifyProofOnChain);

  const computeCommitmentButton = document.getElementById("computeCommitment");
  computeCommitmentButton.addEventListener("click", computeCommitment);

  // Add modal handling
  const modal = document.getElementById('extralarge-modal');
  const modalBackdrop = document.getElementById('modal-backdrop');
  const modalHideButtons = document.querySelectorAll('[data-modal-hide="extralarge-modal"]');

  // Show modal on page load
  showModal();

  // Add click handlers for all modal hide buttons
  modalHideButtons.forEach(button => {
    button.addEventListener('click', hideModal);
  });

  // Close modal when clicking outside
  modalBackdrop.addEventListener('click', hideModal);

  // Add escape key handler
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      hideModal();
    }
  });
});

async function computeCommitment() {
  console.log("computeCommitment");
  console.log({targetWord, sessionId, salt});
  const response = await computePedersenCommmitment(targetWord, sessionId, salt);
  console.log({response});
  commitment = response.commitment;
  let commitmentVerification = document.getElementById("commitmentVerification");
  commitmentVerification.classList.remove("hidden");
  commitmentVerification.textContent = `Commitment Calculated is : ${commitment}`;
}

function updateTargetWord(targetWord) {
  let commitmentVerification = document.getElementById("targetWord");
  commitmentVerification.classList.remove("hidden");
  commitmentVerification.textContent = `Target Word: ${targetWord}`;
}

function updateSalt(salt) {
  let saltVerification = document.getElementById("saltVerification");
  saltVerification.classList.remove("hidden");
  saltVerification.textContent = `Salt: ${salt}`;
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
    console.log("connecting to metamask...");
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

function createTransactionHashLink(txHash, label = '') {
    const container = document.getElementById('transaction-hashes');
    const linkContainer = document.createElement('div');
    linkContainer.className = 'flex items-center space-x-2';
    
    if (label) {
        const labelSpan = document.createElement('span');
        labelSpan.className = 'text-sm text-gray-600';
        labelSpan.textContent = label;
        linkContainer.appendChild(labelSpan);
    }
    
    const link = document.createElement('a');
    link.href = `https://sepolia.etherscan.io/tx/${txHash}`;
    link.target = '_blank';
    link.rel = 'noopener noreferrer';
    link.className = 'p-2 bg-gray-100 rounded font-mono text-sm break-all block text-blue-600 hover:text-blue-800 hover:underline flex-1';
    link.textContent = txHash;
    
    linkContainer.appendChild(link);
    container.appendChild(linkContainer);
    return linkContainer;
}

function showModal() {
  const modal = document.getElementById('extralarge-modal');
  const modalBackdrop = document.getElementById('modal-backdrop');
  modal.classList.remove('hidden');
  modalBackdrop.classList.remove('hidden');
  document.body.style.overflow = 'hidden'; // Prevent background scrolling
}

function hideModal() {
  const modal = document.getElementById('extralarge-modal');
  const modalBackdrop = document.getElementById('modal-backdrop');
  modal.classList.add('hidden');
  modalBackdrop.classList.add('hidden');
  document.body.style.overflow = ''; // Restore background scrolling
}