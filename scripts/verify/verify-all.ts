import { ethers, run } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const deployment = require("../deployment.json");

  // Verify UserManagement
  await run("verify:verify", {
    address: deployment.userManagement,
    constructorArguments: [],
  });

  // Verify BusinessProfile
  await run("verify:verify", {
    address: deployment.businessProfile,
    constructorArguments: [],
  });

  // Verify RealmSystem
  await run("verify:verify", {
    address: deployment.realmSystem,
    constructorArguments: [],
  });

  // Verify FightSystem
  await run("verify:verify", {
    address: deployment.fightSystem,
    constructorArguments: [],
  });
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 