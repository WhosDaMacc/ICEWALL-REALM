const hre = require("hardhat");

async function main() {
    const IceToken = await hre.ethers.getContractFactory("IceToken");
    const iceToken = await IceToken.deploy();

    await iceToken.deployed();
    console.log("IceToken deployed to:", iceToken.address);
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });