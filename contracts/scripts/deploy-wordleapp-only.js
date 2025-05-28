const hre = require("hardhat");

async function main() {
    console.log("🚀 Deploying only WordleApp contract to", hre.network.name, "...");
    
    // Get verifier address from command line argument or environment variable
    const VERIFIER_ADDRESS = process.argv[2] || process.env.VERIFIER_ADDRESS;
    
    if (!VERIFIER_ADDRESS || !VERIFIER_ADDRESS.startsWith("0x")) {
        console.error("❌ Please provide verifier address:");
        console.log("Usage: npx hardhat run scripts/deploy-wordleapp-only.js --network sepolia 0xVERIFIER_ADDRESS");
        console.log("Or set VERIFIER_ADDRESS environment variable");
        process.exit(1);
    }
    
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer.address);
    console.log("Using verifier at:", VERIFIER_ADDRESS);
    
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");
    
    // Verify verifier contract exists
    const verifierCode = await hre.ethers.provider.getCode(VERIFIER_ADDRESS);
    if (verifierCode === "0x") {
        console.error("❌ No contract found at verifier address:", VERIFIER_ADDRESS);
        process.exit(1);
    }
    console.log("✅ Verifier contract found");
    
    console.log("Deploying WordleApp...");
    const WordleApp = await hre.ethers.getContractFactory("WordleApp");
    const wordleApp = await WordleApp.deploy(VERIFIER_ADDRESS);
    await wordleApp.waitForDeployment();
    
    const wordleAppAddress = await wordleApp.getAddress();
    console.log("✅ WordleApp deployed to:", wordleAppAddress);
    
    // Wait for confirmations
    console.log("⏳ Waiting for confirmations...");
    const receipt = await wordleApp.deploymentTransaction().wait(5);
    console.log("Confirmed in block:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());
    
    // Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        wordleApp: wordleAppAddress,
        verifier: VERIFIER_ADDRESS,
        deployer: deployer.address,
        blockNumber: receipt.blockNumber,
        gasUsed: receipt.gasUsed.toString(),
        timestamp: new Date().toISOString()
    };
    
    const fs = require('fs');
    const path = require('path');
    const deploymentsDir = path.join(__dirname, '..', 'deployments');
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir);
    }
    
    const deploymentFile = path.join(deploymentsDir, `${hre.network.name}-wordleapp.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log("💾 Deployment info saved to:", deploymentFile);
    
    if (process.env.ETHERSCAN_API_KEY) {
        console.log("🔍 Verifying contract...");
        try {
            await hre.run("verify:verify", {
                address: wordleAppAddress,
                constructorArguments: [VERIFIER_ADDRESS],
            });
            console.log("✅ Contract verified!");
        } catch (error) {
            if (error.message.toLowerCase().includes("already verified")) {
                console.log("ℹ️  Contract already verified");
            } else {
                console.error("❌ Verification failed:", error.message);
            }
        }
    }
    
    // Test the deployed contract
    console.log("\n🧪 Testing deployed contract...");
    try {
        const verifierFromApp = await wordleApp.verifier();
        console.log("WordleApp verifier:", verifierFromApp);
        console.log("Verifier match:", verifierFromApp.toLowerCase() === VERIFIER_ADDRESS.toLowerCase() ? "✅ Yes" : "❌ No");
    } catch (error) {
        console.log("❌ Could not test contract:", error.message);
    }
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});