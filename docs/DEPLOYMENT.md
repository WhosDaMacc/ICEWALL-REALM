# ICEWALL REALM Deployment Guide

## Prerequisites

1. Node.js (v16 or higher)
2. npm or yarn
3. Hardhat
4. MetaMask or other Web3 wallet
5. Testnet ETH (for Sepolia deployment)
6. Environment variables set up

## Environment Setup

Create a `.env` file in the root directory with the following variables:

```env
PRIVATE_KEY=your_wallet_private_key
ETHERSCAN_API_KEY=your_etherscan_api_key
SEPOLIA_URL=your_sepolia_rpc_url
```

## Installation

1. Install dependencies:
```bash
npm install
```

2. Compile contracts:
```bash
npm run compile
```

3. Generate TypeChain types:
```bash
npm run typechain
```

## Deployment Scripts

### 1. Deploy All Contracts

```typescript
// scripts/deploy/deploy-all.ts
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
```

### 2. Verify Contracts on Etherscan

```typescript
// scripts/verify/verify-all.ts
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
```

## Deployment Steps

1. Deploy to local network for testing:
```bash
npx hardhat node
npm run deploy:contracts -- --network localhost
```

2. Deploy to Sepolia testnet:
```bash
npm run deploy:contracts -- --network sepolia
```

3. Verify contracts on Etherscan:
```bash
npm run verify:contracts -- --network sepolia
```

## Post-Deployment Tasks

1. Update frontend environment variables with new contract addresses
2. Test contract interactions using the test scripts
3. Deploy frontend application
4. Set up monitoring and analytics

## Testing

Run the test suite:
```bash
npm run test:contracts
```

## Troubleshooting

1. If deployment fails:
   - Check network connection
   - Verify private key and API keys
   - Ensure sufficient testnet ETH
   - Check contract compilation

2. If verification fails:
   - Verify constructor arguments
   - Check network configuration
   - Ensure contract is deployed on the correct network

## Security Considerations

1. Never commit private keys or sensitive data
2. Use environment variables for all secrets
3. Verify contract addresses before interacting
4. Test thoroughly on testnet before mainnet deployment

## Support

For deployment issues or questions, please contact the development team or open an issue in the repository. 