async function testPedersenHash(bb) {
    const inputs = [1, 2, 3];
    let testInputs = inputs.map(input => {
        return new Fr(uint8ArrayToBigIntBE(charToFixedBytes(input)) % Fr.MODULUS );
    });
    const testHash = await bb.pedersenHash(testInputs, 0);
    console.log("Test hash:", testHash.toString());
    // 0x004d362aaff0fb24e4dd09c146a3839ab5ab33abeec95b2046fe9b723e608647
    // 0x0c21b8e26f60b476d9568df4807131ff70d8b7fffb03fa07960aa1cac9be7c46
    // 0x0c21b8e26f60b476d9568df4807131ff70d8b7fffb03fa07960aa1cac9be7c46
}
async function testPedersenHash2(bb) {
    // Directly create Fr elements from numbers
    const inputs = [new Fr(1n), new Fr(2n), new Fr(3n)];
    
    // Hash with separator 0 (matches Noir)
    const testHash = await bb.pedersenHash(inputs, 0);
    
    console.log("Test hash:", testHash.toString());
}
