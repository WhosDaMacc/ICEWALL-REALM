# ICEWALL REALM Deployment Guide

## Prerequisites

1. Node.js (v16 or later)
2. npm or yarn
3. Hardhat
4. MetaMask or other Web3 wallet
5. Alchemy API key
6. Etherscan API key
7. Private key for deployment

## Environment Setup

1. Clone the repository:
```bash
git clone https://github.com/your-username/icewall-realm.git
cd icewall-realm
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file with the following variables:
```env
# Network Configuration
SEPOLIA_URL=https://eth-sepolia.g.alchemy.com/v2/your-api-key
MAINNET_URL=https://eth-mainnet.g.alchemy.com/v2/your-api-key

# Private Keys (DO NOT COMMIT REAL KEYS)
DEPLOYER_PRIVATE_KEY=your-private-key-here
OWNER_PRIVATE_KEY=your-private-key-here

# API Keys
ETHERSCAN_API_KEY=your-etherscan-api-key
ALCHEMY_API_KEY=your-alchemy-api-key

# Contract Addresses (Will be filled after deployment)
ICE_TOKEN_ADDRESS=
BUSINESS_PROFILE_ADDRESS=
REALM_SYSTEM_ADDRESS=
USER_MANAGEMENT_ADDRESS=
```

## Smart Contract Deployment

1. Compile contracts:
```bash
npm run compile
```

2. Deploy to Sepolia testnet:
```bash
npm run deploy
```

3. Verify contracts on Etherscan:
```bash
npx hardhat verify --network sepolia <CONTRACT_ADDRESS> <CONSTRUCTOR_ARGS>
```

## Frontend Deployment

1. Build the frontend:
```bash
npm run build
```

2. Deploy to your preferred hosting service (e.g., Vercel, Netlify, or AWS):
```bash
# For Vercel
vercel --prod

# For Netlify
netlify deploy --prod
```

## Post-Deployment Steps

1. Update the frontend configuration with the deployed contract addresses
2. Test all contract interactions
3. Verify user registration and authentication
4. Test AR realm creation and interaction
5. Test business profile creation and event management

## Security Considerations

1. Keep private keys secure and never commit them to version control
2. Use environment variables for sensitive information
3. Regularly update dependencies
4. Monitor contract activity
5. Implement rate limiting for API endpoints
6. Use secure WebSocket connections for real-time features

## Monitoring and Maintenance

1. Set up monitoring for:
   - Contract events
   - User activity
   - System performance
   - Error rates
   - Gas usage

2. Regular maintenance tasks:
   - Update dependencies
   - Backup user data
   - Monitor contract balances
   - Check for security vulnerabilities

## Troubleshooting

1. Contract deployment issues:
   - Check gas prices
   - Verify network connectivity
   - Ensure sufficient funds
   - Check constructor arguments

2. Frontend issues:
   - Clear browser cache
   - Check network requests
   - Verify contract addresses
   - Check wallet connection

3. AR functionality issues:
   - Verify device permissions
   - Check camera access
   - Test location services
   - Verify marker detection

## Support

For technical support or questions:
- GitHub Issues: https://github.com/your-username/icewall-realm/issues
- Documentation: https://docs.icewall-realm.com
- Discord: https://discord.gg/icewall-realm 