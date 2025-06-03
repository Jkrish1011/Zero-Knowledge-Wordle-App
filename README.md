# Zero-Knowledge Wordle: A Fair Play Experience

```
Concept: Inspired by the popular game Wordle, players guess a secret six-letter word, receiving feedback (correct letter and position, correct letter wrong position, or incorrect letter) via ZKPs to ensure honesty without revealing the word.
```

This is a classic game of Wordle powered by zero-knowledge proofs. The backend commits to a secret word by creating a Pedersen commitment. This commitment is generated using a salt, your current game session ID, and the randomly chosen six-letter word.

The zero-knowledge proofs are generated using Noir to verify two key aspects: the creation of the initial commitment and the feedback provided for each round. The backend itself is a combination of a Node.js application and a smart contract that generates the necessary Ultra-Honk Proofs. These proofs allow users to verify the game's integrity both in their browser and on-chain.

## Why This Solution Was Built

I developed this solution to demonstrate how applications, especially in the gaming domain, can commit to fair play and prevent cheating. In this Wordle example, the backend makes an initial commitment to the word before the user makes their first guess, establishing that the word cannot be changed mid-game.

Throughout the game, users can verify the accuracy of the feedback provided by the backend. This is done by verifying the proof generated for each round, either directly in their browser or on-chain. This entire process ensures the game remains fair and transparent for all players.

### Contracts
The verifier contracts are deployed to the Ethereum Sepolia testnet:
* WordleApp Contract: https://sepolia.etherscan.io/address/0xc69f8ba784c60f2bf81714e80a9ca5f09385a7b2
* Honk Verifier Contract: https://sepolia.etherscan.io/address/0xF3d87Ff705E75D402DEf6496D290a5727BB88017


#### Implementation

Noir: Define the secret word as private inputs and the guess as public inputs. Compute feedback (e.g., green for correct letter and position, yellow for correct letter wrong position) and prove its correctness.

#### Compile and create the Noir Artifact

```
nargo compile
```

#### Steps to create Verifier.sol

```
bb write_vk -b ./target/wordle_app.json -o ./target --oracle_hash keccak
bb write_solidity_verifier -k ./target/vk -o ./target/Verifier.sol
```

NOTE: 

Copy the Verifier.sol into the contracts folder (hardhat project).

The wordle_app.json created after compilation process (found in ./target folder) should be copied into the ./backend/noir_circuit and ./js/assets folders respectively. This will be used to verify the proofs later on.

#### Compiling Smart Contracts

```
npm i
npx hardhat compile
npx hardhat test
```

These commands will generate the necessary abi's required. Copy them into the abi folders found in backend and js folders respectively.

### Steps to run Frontend
```
npm install
npm run dev
```

### Steps to run Backend
```
npm install
npm run dev
```