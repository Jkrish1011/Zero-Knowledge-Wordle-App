// Wordle Game Logic

let currentRow = 0;
let isGameOver = false;
const MAX_ATTEMPTS = 6;
const WORD_LENGTH = 6;
let sessionId = "";

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

async function sendFeedbackData(sessionId, userInput, userSignature) {
  const url = 'http://localhost:3000/api/check_feedback';
  const data = {
    sessionId: sessionId,
    userInput: userInput,
    userSignature: userSignature
  };

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
  // checkGuess(val);
  const response = await sendFeedbackData(sessionId, val, "");
  console.log(response);
  updateGrid(response.data.feedback, response.data.attempts, val);
  if(response.data.isGameOver && response.data.feedback.every(status => status === 2)) {
    showMessage(`Game Over! You won!`, "#388e3c");
    isGameOver = true;
  }
  if(response.data.attempts === MAX_ATTEMPTS && !response.data.isGameOver) {
    showMessage(`Game Over! You lost!`, "#d32f2f");
    isGameOver = true;
  }
}

document.addEventListener("DOMContentLoaded", async () => {
  let response = await fetch('http://localhost:3000/api/start_game')
    .then(response => response.json())
    .then(data => {
      console.log(data);
      return data;
    })
    .catch(error => {
      console.error('Error:', error);
    });
  
  createGrid();
  currentRow = 0;
  isGameOver = false;
  clearMessage();
  sessionId = response.data.sessionId;

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