const { ethers } = require("hardhat");
const hre = require("hardhat");
import { loadDeployedContracts } from "./utils/helper";

async function configure() {
    const [deployer] = await ethers.getSigners();
    const network = hre.network.config.chainId;
    let deployedContracts: any = loadDeployedContracts(`${network}`);
    console.log("Deployer Address:", deployer.address);
    console.log("Network: ", network);

    if (!deployedContracts.CX_ROUTER) {
        throw new Error("CxRouter not deployed");
    }

    const CxRouter = await ethers.getContractFactory("CxRouter");
    const cxRouter: any = CxRouter.attach(deployedContracts.CX_ROUTER);

    console.log(`\n\n---------------Step : Configure CxHub in CxRouter--------------`)
    await cxRouter.configureCxHub(deployedContracts.CX_HUB);
}

configure();