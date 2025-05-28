const hre = require("hardhat");

async function main() {
    const fs = require('fs');
    const path = require('path');
    
    const deploymentsDir = path.join(__dirname, '..', 'deployments');
    const deploymentFile = path.join(deploymentsDir, `${hre.network.name}-deployment.json`);
    
    if (!fs.existsSync(deploymentFile)) {
        console.log(`❌ ${hre.network.name}-deployment.json not found in deployments folder.`);
        console.log("Available files:");
        if (fs.existsSync(deploymentsDir)) {
            const files = fs.readdirSync(deploymentsDir);
            files.forEach(file => console.log(`  - ${file}`));
        } else {
            console.log("  No deployments folder found");
        }
        return;
    }
    
    const deployment = JSON.parse(fs.readFileSync(deploymentFile, 'utf8'));
    
    console.log("📋 Checking deployed contracts on", hre.network.name);
    console.log("Deployed at:", deployment.timestamp);
    console.log("Deployer:", deployment.deployer);
    
    // Check Verifier
    if (deployment.verifier) {
        console.log("\n🔍 Checking Verifier...");
        const verifierCode = await hre.ethers.provider.getCode(deployment.verifier);
        console.log("Address:", deployment.verifier);
        console.log("Status:", verifierCode !== "0x" ? "✅ Deployed" : "❌ Not found");
        if (deployment.gasUsed?.verifier) {
            console.log("Gas used:", deployment.gasUsed.verifier);
        }
    }
    
    // Check WordleApp
    if (deployment.wordleApp) {
        console.log("\n🎮 Checking WordleApp...");
        const wordleAppCode = await hre.ethers.provider.getCode(deployment.wordleApp);
        console.log("Address:", deployment.wordleApp);
        console.log("Status:", wordleAppCode !== "0x" ? "✅ Deployed" : "❌ Not found");
        if (deployment.gasUsed?.wordleApp) {
            console.log("Gas used:", deployment.gasUsed.wordleApp);
        }
        
        // Test interaction
        if (wordleAppCode !== "0x") {
            try {
                const WordleApp = await hre.ethers.getContractFactory("WordleApp");
                const wordleApp = WordleApp.attach(deployment.wordleApp);
                
                const verifierAddress = await wordleApp.verifier();
                console.log("WordleApp's verifier:", verifierAddress);
                
                if (deployment.verifier) {
                    console.log("Verifier match:", verifierAddress.toLowerCase() === deployment.verifier.toLowerCase() ? "✅ Yes" : "❌ No");
                }
            } catch (error) {
                console.log("❌ Could not check verifier address:", error.message);
            }
        }
    }
    
    // Show Etherscan links for Sepolia
    if (hre.network.name === "sepolia") {
        console.log("\n🔗 Etherscan Links:");
        if (deployment.verifier) {
            console.log(`Verifier: https://sepolia.etherscan.io/address/${deployment.verifier}`);
        }
        if (deployment.wordleApp) {
            console.log(`WordleApp: https://sepolia.etherscan.io/address/${deployment.wordleApp}`);
        }
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});