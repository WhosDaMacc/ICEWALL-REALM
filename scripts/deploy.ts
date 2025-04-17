import { ethers } from "hardhat";
import * as dotenv from "dotenv";

async function main() {
  // Load environment variables
  dotenv.config();

  // Get deployer account
  const [deployer] = await ethers.getSigners();
  console.log("Deploying contracts with the account:", deployer.address);

  // Deploy ICE Token
  console.log("Deploying ICE Token...");
  const IceToken = await ethers.getContractFactory("IceToken");
  const iceToken = await IceToken.deploy();
  await iceToken.waitForDeployment();
  console.log("ICE Token deployed to:", await iceToken.getAddress());

  // Deploy BusinessProfile
  console.log("Deploying BusinessProfile...");
  const BusinessProfile = await ethers.getContractFactory("BusinessProfile");
  const businessProfile = await BusinessProfile.deploy(await iceToken.getAddress());
  await businessProfile.waitForDeployment();
  console.log("BusinessProfile deployed to:", await businessProfile.getAddress());

  // Deploy RealmSystem
  console.log("Deploying RealmSystem...");
  const RealmSystem = await ethers.getContractFactory("RealmSystem");
  const realmSystem = await RealmSystem.deploy();
  await realmSystem.waitForDeployment();
  console.log("RealmSystem deployed to:", await realmSystem.getAddress());

  // Deploy UserManagement
  console.log("Deploying UserManagement...");
  const UserManagement = await ethers.getContractFactory("UserManagement");
  const userManagement = await UserManagement.deploy();
  await userManagement.waitForDeployment();
  console.log("UserManagement deployed to:", await userManagement.getAddress());

  // Save contract addresses to .env file
  const fs = require("fs");
  const envPath = ".env";
  let envContent = fs.readFileSync(envPath, "utf8");

  envContent = envContent.replace(
    /ICE_TOKEN_ADDRESS=.*/,
    `ICE_TOKEN_ADDRESS=${await iceToken.getAddress()}`
  );
  envContent = envContent.replace(
    /BUSINESS_PROFILE_ADDRESS=.*/,
    `BUSINESS_PROFILE_ADDRESS=${await businessProfile.getAddress()}`
  );
  envContent = envContent.replace(
    /REALM_SYSTEM_ADDRESS=.*/,
    `REALM_SYSTEM_ADDRESS=${await realmSystem.getAddress()}`
  );
  envContent = envContent.replace(
    /USER_MANAGEMENT_ADDRESS=.*/,
    `USER_MANAGEMENT_ADDRESS=${await userManagement.getAddress()}`
  );

  fs.writeFileSync(envPath, envContent);

  console.log("Contract addresses saved to .env file");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  }); 