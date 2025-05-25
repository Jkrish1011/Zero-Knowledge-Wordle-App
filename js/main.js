import { UltraHonkBackend } from "@aztec/bb.js"
import { Noir } from "@noir-lang/noir_js";
// import circuit from "../target/age_verifier.json" assert { type: "json" };

// Wordle Game Logic

const WORD_LIST = [
    "BRIGHT",
    "CIRCLE",
    "FOREST",
    "GARDEN",
    "LAPTOP",
    "MARKET",
    "PUZZLE",
    "ROCKET",
    "TRAVEL",
    "WINDOW"
  ];

const MAX_ATTEMPTS = 6;
const WORD_LENGTH = 6;

let targetWord = "";
let currentRow = 0;
let isGameOver = false;

const pickRandomWord = () => {
  // Only use words with exactly 6 letters
  const sixLetterWords = WORD_LIST.filter(w => w.length === WORD_LENGTH);
  const currentWord = sixLetterWords[Math.floor(Math.random() * sixLetterWords.length)].toUpperCase();
  return currentWord;
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

function clearMessage() {
  showMessage("");
}

function checkGuess(guess) {
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
  for (let i = 0; i < WORD_LENGTH; i++) {
    const box = document.getElementById(`box-${currentRow}-${i}`);
    box.textContent = guessArr[i];
    box.classList.remove("correct", "present", "absent");
    box.classList.add(letterStatus[i]);
  }
  let feedback = letterStatus.map(status => {
    if (status === "correct") return 2;
    if (status === "present") return 1;
    return 0;
  });
  console.log(letterStatus);
  console.log(feedback);

  if (guess === targetWord) {
    showMessage("Congratulations! You guessed the word!", "#388e3c");
    isGameOver = true;
    return;
  }

  currentRow++;

  if (currentRow === MAX_ATTEMPTS) {
    showMessage(`Game Over! The word was: ${targetWord}`, "#d32f2f");
    isGameOver = true;
  }
}

function handleInput(e) {
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
  checkGuess(val);
}

document.addEventListener("DOMContentLoaded", async () => {
  await fetch('http://localhost:3000/api/start_game')
    .then(response => response.json())
    .then(data => {
      console.log(data);
    })
    .catch(error => {
      console.error('Error:', error);
    });
  targetWord = await pickRandomWord();
  console.log(targetWord);
  createGrid();
  currentRow = 0;
  isGameOver = false;
  clearMessage();

  const form = document.getElementById("wordleForm");
  form.addEventListener("submit", handleInput);
});

// Form submission handler
// window.handleSubmit = async function(event) {
//     event.preventDefault();
    
//     const username = document.getElementById('username').value;
//     const password = document.getElementById('password').value;
//     const dob = document.getElementById('dob').value;
//     const noir = new Noir(circuit);

//     const { witness } = await noir.execute({
//         year_of_birth: 1990,
//         current_year: 2025,
//     });
    
//     const backend = new UltraHonkBackend(circuit.bytecode);
//     const {proof, publicInputs} = await backend.generateProof(witness);
    
//     // Post request to http://localhost:3000/api/register
//     const response = await fetch('http://localhost:3000/api/register', {
//         method: 'POST',
//         headers: {
//             'Content-Type': 'application/json'
//         },
//         body: JSON.stringify({ username: username, password: password, proof: Array.from(proof), publicInputs: publicInputs }),
//     });

//     const data = await response.json();
//     console.log(data);
    
// }