
fn main(
    targetWord: [Field;6],  // Private: Secret 6 alphabet Word. Example: SOCKET =  [18, 14, 2, 10, 4, 19]
    salt: Field, // Private: Salt for the pedersen hash
    session_id: pub Field, // Public: Unique session id for the game for the current user
    pedersen_hash: pub Field, // Public: Pedersen hash of the target word
    feedback: pub [Field;6], // Public: Feedback from the backend
    userInput: pub [Field;6], // Public: User input
) {    
    // check if all the inputs are valid
    for i in 0..6 {
        assert(userInput[i] as i32 < 26);
        assert(targetWord[i] as i32 < 26);
        assert(feedback[i] as i32 < 3);
    }

    // Append the session_id and salt to the targetWord and compute the pedersen hash
    let mut target_word_concatinated: [Field; 8] = [0; 8];
    for i in 0..6 {
        target_word_concatinated[i] = targetWord[i];
    }
    target_word_concatinated[6] = session_id;
    target_word_concatinated[7] = salt;

    let computed_pedersen_hash = std::hash::pedersen_hash_with_separator(target_word_concatinated, 0);
    std::println(computed_pedersen_hash);
    // Check if the computed pedersen hash is equal to the pedersen hash provided by the backend
    assert(computed_pedersen_hash == pedersen_hash);
    
    // For computed feedback - 2 is green, 1 is yellow, 0 is gray
    let mut usedWord: [Field;6] = [0;6];
    let mut computedFeedback: [Field;6] = [0;6];

    for i in 0..6 {
        if targetWord[i] == userInput[i] {
            computedFeedback[i] = 2;
            usedWord[i] = 1;
        }
    }

    // Safety: We are using unsafe to mutate the computedFeedback array.
    let final_computed_feedback: [Field;6] = unsafe {
     compute_feedback(targetWord, usedWord, computedFeedback, userInput)
    };

    for i in 0..6 {
        assert(final_computed_feedback[i] == feedback[i]);
    }
}

unconstrained fn compute_feedback(targetWord: [Field;6], mut usedWord: [Field;6], mut computedFeedback: [Field;6], userInput: [Field;6]) -> [Field;6] {
    for i in 0..6 {
        if computedFeedback[i] == 2 {
            // already found. continue to next iteration
            continue;
        }

        for j in 0..6 {
            if i == j {
                continue;
            }
            if targetWord[j] == userInput[i] {
                if usedWord[j] == 0 {
                    computedFeedback[i] = 1;
                    usedWord[j] = 1;
                }
                break;
            }
        }
    }
    computedFeedback
}

#[test]
fn test_main() {
    let targetWord: [Field; 6] = [ 5, 14, 17, 4, 18, 19 ];
    let salt: Field = 8946779955419594466110210645034519706377264660042123759416453925324645134281;
    let session_id: Field = 15687910949534148498003312028041286509965723587810669995876214704755576645678;
    let pedersen_hash: Field = 10484328263242905534100110666239265618273454041839134139012676170186870765140;
    let feedback: [Field; 6] = [ 0, 0, 0, 0, 1, 1 ];
    let userInput: [Field; 6] = [ 0, 1, 2, 3, 4, 5 ];
    main(targetWord, salt, session_id, pedersen_hash, feedback, userInput);
}

#[test]
fn test_pedersen_hash() {
    let test_inputs: [Field; 3] = [1, 2, 3];
    let test_hash = std::hash::pedersen_hash_with_separator(test_inputs, 0);
    std::println(test_hash);
}