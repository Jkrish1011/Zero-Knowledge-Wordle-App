# Zero-Knowledge Wordle

```
Concept: Inspired by the popular game Wordle, players guess a secret six-letter word, receiving feedback (correct letter and position, correct letter wrong position, or incorrect letter) via ZKPs to ensure honesty without revealing the word.
```

## Gameplay

The game presents a blank six-letter word slot.
Players submit guesses, and for each guess, a ZKP verifies the feedback’s accuracy.
Players have up to six attempts to guess the word, with verified feedback guiding them.

#### Implementation

Noir: Define the secret word as private inputs and the guess as public inputs. Compute feedback (e.g., green for correct letter and position, yellow for correct letter wrong position) and prove its correctness.