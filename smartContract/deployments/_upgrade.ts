const { ethers, upgrades } = require("hardhat");
const hre = require("hardhat");
import { loadDeployedContracts } from "./utils/helper";

async function upgrade() {
    const [deployer] = await ethers.getSigners();
    const network = hre.network.config.chainId;
    let deployedContracts: any = loadDeployedContracts(`${network}`);
    console.log("Deployer Address:", deployer.address);
    console.log("Network: ", network);

    const contract: string = "CxHub";
    if (deployedContracts.CX_HUB) {
        const contractV2 = await ethers.getContractFactory(`${contract}`);
        console.log(`Upgrading ${contract}...`);

        const upgraded = await upgrades.upgradeProxy(deployedContracts.CX_HUB, contractV2);
        console.log(`${contract} upgraded to V2 at:`, upgraded.target);
    } else {
        console.log(`${contract} is not deployed.`);
    }
}

upgrade().then(() => process.exit(0)).catch(error => {
    console.error(error);
    process.exit(1);
});