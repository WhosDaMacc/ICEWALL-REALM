const { ethers } = require("hardhat");

async function main() {
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);

    const IceToken = await ethers.getContractFactory("IceToken");
    const iceToken = await IceToken.deploy();
    await iceToken.deployed();
    console.log("IceToken deployed to:", iceToken.address);

    const FightSystem = await ethers.getContractFactory("FightSystem");
    const fightSystem = await FightSystem.deploy(iceToken.address);
    await fightSystem.deployed();
    console.log("FightSystem deployed to:", fightSystem.address);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});