import { ethers } from "hardhat";
import * as dotenv from "dotenv";

dotenv.config();

async function main() {
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with account:", deployer.address);

  // Deploy UserManagement
  const UserManagement = await ethers.getContractFactory("UserManagement");
  const userManagement = await UserManagement.deploy();
  await userManagement.deployed();
  console.log("UserManagement deployed to:", userManagement.address);

  // Deploy BusinessProfile
  const BusinessProfile = await ethers.getContractFactory("BusinessProfile");
  const businessProfile = await BusinessProfile.deploy();
  await businessProfile.deployed();
  console.log("BusinessProfile deployed to:", businessProfile.address);

  // Deploy RealmSystem
  const RealmSystem = await ethers.getContractFactory("RealmSystem");
  const realmSystem = await RealmSystem.deploy();
  await realmSystem.deployed();
  console.log("RealmSystem deployed to:", realmSystem.address);

  // Deploy FightSystem
  const FightSystem = await ethers.getContractFactory("FightSystem");
  const fightSystem = await FightSystem.deploy();
  await fightSystem.deployed();
  console.log("FightSystem deployed to:", fightSystem.address);

  // Save deployment addresses
  const deployment = {
    userManagement: userManagement.address,
    businessProfile: businessProfile.address,
    realmSystem: realmSystem.address,
    fightSystem: fightSystem.address,
    network: await ethers.provider.getNetwork(),
    timestamp: new Date().toISOString()
  };

  const fs = require("fs");
  fs.writeFileSync(
    "deployment.json",
    JSON.stringify(deployment, null, 2)
  );
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 