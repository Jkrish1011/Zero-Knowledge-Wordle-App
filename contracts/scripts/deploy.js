const hre = require("hardhat");

async function main() {
    console.log("🚀 Starting deployment to Sepolia...");
    // 0x79e5d84E7cD09D8a6e83988986bC07F489164A9A - HonkVerifier
    // 0x26912B21075324F3a71f6AADFA6cA5581A81a2A7 - WordleApp
    // Get the deployer account
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying contracts with account:", deployer.address);
    
    // Check balance
    const balance = await hre.ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");
    
    if (balance < hre.ethers.parseEther("0.01")) {
        console.log("⚠️  Low balance! You might need more ETH for deployment.");
    }
    
    // Deploy Verifier contract first
    console.log("\n📋 Deploying Verifier contract...");
    const Verifier = await hre.ethers.getContractFactory("HonkVerifier"); // Replace with your actual verifier contract name
    console.log("Deploying Verifier...");
    const verifier = await Verifier.deploy();
    await verifier.waitForDeployment();
    
    const verifierAddress = await verifier.getAddress();
    console.log("✅ Verifier deployed to:", verifierAddress);
    
    // Deploy WordleApp contract with verifier address
    console.log("\n🎮 Deploying WordleApp contract...");
    const WordleApp = await hre.ethers.getContractFactory("WordleApp");
    console.log("Deploying WordleApp with verifier address:", verifierAddress);
    const wordleApp = await WordleApp.deploy(verifierAddress);
    await wordleApp.waitForDeployment();
    
    const wordleAppAddress = await wordleApp.getAddress();
    console.log("✅ WordleApp deployed to:", wordleAppAddress);
    
    // Wait for a few confirmations before verification
    console.log("\n⏳ Waiting for confirmations...");
    const verifierReceipt = await verifier.deploymentTransaction().wait(5);
    const wordleAppReceipt = await wordleApp.deploymentTransaction().wait(5);
    
    console.log("Verifier confirmed in block:", verifierReceipt.blockNumber);
    console.log("WordleApp confirmed in block:", wordleAppReceipt.blockNumber);
    
    console.log("\n🎉 Deployment completed!");
    console.log("📄 Contract Addresses:");
    console.log("  Verifier:", verifierAddress);
    console.log("  WordleApp:", wordleAppAddress);
    
    // Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        verifier: verifierAddress,
        wordleApp: wordleAppAddress,
        deployer: deployer.address,
        blockNumbers: {
            verifier: verifierReceipt.blockNumber,
            wordleApp: wordleAppReceipt.blockNumber
        },
        timestamp: new Date().toISOString(),
        gasUsed: {
            verifier: verifierReceipt.gasUsed.toString(),
            wordleApp: wordleAppReceipt.gasUsed.toString()
        }
    };
    
    const fs = require('fs');
    const path = require('path');
    
    // Create deployments directory if it doesn't exist
    const deploymentsDir = path.join(__dirname, '..', 'deployments');
    if (!fs.existsSync(deploymentsDir)) {
        fs.mkdirSync(deploymentsDir);
    }
    
    const deploymentFile = path.join(deploymentsDir, `${hre.network.name}-deployment.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log("💾 Deployment info saved to:", deploymentFile);
    
    // Verify contracts on Etherscan
    if (process.env.ETHERSCAN_API_KEY) {
        console.log("\n🔍 Starting contract verification...");
        await verifyContract(verifierAddress, []);
        await verifyContract(wordleAppAddress, [verifierAddress]);
    } else {
        console.log("\n⚠️  ETHERSCAN_API_KEY not found in .env file. Skipping verification.");
        console.log("To verify manually, run:");
        console.log(`npx hardhat verify --network sepolia ${verifierAddress}`);
        console.log(`npx hardhat verify --network sepolia ${wordleAppAddress} ${verifierAddress}`);
    }
    
    // Test basic functionality
    console.log("\n🧪 Testing basic contract functionality...");
    try {
        const verifierFromApp = await wordleApp.verifier();
        console.log("WordleApp verifier address:", verifierFromApp);
        console.log("Verifier match:", verifierFromApp.toLowerCase() === verifierAddress.toLowerCase() ? "✅ Yes" : "❌ No");
    } catch (error) {
        console.log("❌ Could not test contract functionality:", error.message);
    }
}

async function verifyContract(address, constructorArgs) {
    try {
        console.log(`Verifying contract at ${address}...`);
        await hre.run("verify:verify", {
            address: address,
            constructorArguments: constructorArgs,
        });
        console.log(`✅ Contract verified: ${address}`);
    } catch (error) {
        if (error.message.toLowerCase().includes("already verified")) {
            console.log(`ℹ️  Contract already verified: ${address}`);
        } else {
            console.error(`❌ Verification failed for ${address}:`, error.message);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });