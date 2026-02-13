const hre = require("hardhat");

async function main() {
  // Set your beneficiary address here
  const BENEFICIARY = "YOUR_BENEFICIARY_ADDRESS";
  
  if (BENEFICIARY === "YOUR_BENEFICIARY_ADDRESS") {
    console.error("ERROR: Set BENEFICIARY address before deploying!");
    process.exit(1);
  }

  console.log("Deploying BAITokenVesting...");
  console.log("Beneficiary:", BENEFICIARY);

  const BAITokenVesting = await hre.ethers.getContractFactory("BAITokenVesting");
  const vesting = await BAITokenVesting.deploy(BENEFICIARY);
  await vesting.waitForDeployment();

  const address = await vesting.getAddress();
  console.log("\n✅ BAITokenVesting deployed to:", address);
  console.log("\nNext steps:");
  console.log("1. Send BAItest tokens to:", address);
  console.log("2. Call recordDeposit() to start the 2-year lock");
  console.log("\nVerify on BaseScan:");
  console.log(`npx hardhat verify --network base ${address} ${BENEFICIARY}`);
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
