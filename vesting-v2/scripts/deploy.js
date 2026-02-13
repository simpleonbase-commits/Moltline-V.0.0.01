const hre = require("hardhat");

async function main() {
  // BAItest token address on Base mainnet
  // IMPORTANT: Update this to your actual token address before deployment
  const VESTING_TOKEN = "0xE7E3D446E2bd4e4eb8AA329dB8802e235F4B10e3"; // BAItest on Base
  
  console.log("Deploying BAIVesting contract...");
  console.log("Network:", hre.network.name);
  console.log("Token:", VESTING_TOKEN);
  
  const BAIVesting = await hre.ethers.getContractFactory("BAIVesting");
  const vesting = await BAIVesting.deploy(VESTING_TOKEN);
  
  await vesting.waitForDeployment();
  const address = await vesting.getAddress();
  
  console.log("\n✅ BAIVesting deployed to:", address);
  console.log("\n📋 Contract Details:");
  console.log("- Token:", VESTING_TOKEN);
  console.log("- Vesting Duration: 730 days (2 years)");
  console.log("- Network:", hre.network.name);
  
  // Save deployment info
  const fs = require("fs");
  const deployment = {
    contract: "BAIVesting",
    address: address,
    token: VESTING_TOKEN,
    vestingDuration: "730 days",
    network: hre.network.name,
    chainId: hre.network.config.chainId,
    deployedAt: new Date().toISOString(),
    deployer: (await hre.ethers.provider.getSigner()).address,
  };
  
  fs.writeFileSync(
    "deployment.json",
    JSON.stringify(deployment, null, 2)
  );
  console.log("\n💾 Deployment info saved to deployment.json");
  
  // Verification instructions
  console.log("\n🔍 To verify on BaseScan:");
  console.log(`npx hardhat verify --network ${hre.network.name} ${address} ${VESTING_TOKEN}`);
  
  console.log("\n🔍 To verify on Sourcify (Blockscout):");
  console.log("Sourcify verification is automatic via hardhat.config.js");
  console.log("Or manually at: https://sourcify.dev/");
  
  return address;
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });