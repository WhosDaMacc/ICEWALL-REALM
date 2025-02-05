require("dotenv").config();

module.exports = {
    networks: {
        goerli: {
            url: `https://eth-goerli.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
            accounts: [process.env.PRIVATE_KEY] // Ensure PRIVATE_KEY is also stored securely
        }
    }
};
module.exports = {
  solidity: "0.8.17",
  networks: {
    polygonMumbai: {
      url: `https://polygon-mumbai.infura.io/v3/YOUR_INFURA_API_KEY`, // Your Infura API key here
      accounts: [`0x${e9ea942aba2efcfb03415e00fed2d67}`] // Your wallet private key here
    },
    polygon: {
      url: `https://polygon-rpc.com`, // For Mainnet Polygon
      accounts: [`0x${e9ea942aba2efcfb03415e00fed2d67}`]
    },
  },
};