const hre = require("hardhat");

async function main() {
    console.log("🚀 Deploying only Verifier contract to", hre.network.name, "...");
    
    const [deployer] = await hre.ethers.getSigners();
    console.log("Deploying with account:", deployer);
    
    const balance = await hre.ethers.provider.getBalance(deployer.target);
    console.log("Account balance:", hre.ethers.formatEther(balance), "ETH");
    
    console.log("Deploying Verifier...");
    const Verifier = await hre.ethers.getContractFactory("HonkVerifier");
    const verifier = await Verifier.deploy();
    await verifier.waitForDeployment();
    
    const verifierAddress = await verifier.getAddress();
    console.log("✅ Verifier deployed to:", verifierAddress);
    
    // Wait for confirmations
    console.log("⏳ Waiting for confirmations...");
    const receipt = await verifier.deploymentTransaction().wait(5);
    console.log("Confirmed in block:", receipt.blockNumber);
    console.log("Gas used:", receipt.gasUsed.toString());
    
    // Save deployment info
    const deploymentInfo = {
        network: hre.network.name,
        verifier: verifierAddress,
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
    
    const deploymentFile = path.join(deploymentsDir, `${hre.network.name}-verifier.json`);
    fs.writeFileSync(deploymentFile, JSON.stringify(deploymentInfo, null, 2));
    console.log("💾 Deployment info saved to:", deploymentFile);
    
    if (process.env.ETHERSCAN_API_KEY) {
        console.log("🔍 Verifying contract...");
        try {
            await hre.run("verify:verify", {
                address: verifierAddress,
                constructorArguments: [],
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
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
