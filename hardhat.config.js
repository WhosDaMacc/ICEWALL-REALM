require("dotenv").config();

module.exports = {
    networks: {
        goerli: {
            url: `https://eth-goerli.alchemyapi.io/v2/${process.env.ALCHEMY_API_KEY}`,
            accounts: [process.env.PRIVATE_KEY] // Ensure PRIVATE_KEY is also stored securely
        }
    }
};