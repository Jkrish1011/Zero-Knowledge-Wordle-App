const hre = require("hardhat");

async function main() {
    const fs = require('fs');
    const path = require('path');
    
    const deploymentFile = path.join(__dirname, '..', 'deployments', `${hre.network.name}-deployment.json`);
    
    if (!fs.existsSync(deploymentFile)) {
        console.log("❌ Deployment file not found. Deploy contracts first.");
        return;
    }
    
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    
    console.log("🔗 Connecting to deployed contracts...");
    
    const [signer] = await hre.ethers.getSigners();
    console.log("Using account:", signer.address);
    
    // Connect to WordleApp
    const WordleApp = await hre.ethers.getContractFactory("WordleApp");
    const wordleApp = WordleApp.attach(deployment.wordleApp);
    
    console.log("📄 Contract Info:");
    console.log("WordleApp:", deployment.wordleApp);
    
    try {
        const verifierAddress = await wordleApp.verifier();
        console.log("Verifier:", verifierAddress);
        
        // Add more interactions here as needed
        // const sessionCount = await wordleApp.sessionCounter();
        // console.log("Session count:", sessionCount.toString());
        
    } catch (error) {
        console.error("❌ Error interacting with contract:", error.message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});