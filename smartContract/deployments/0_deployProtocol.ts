const { ethers, upgrades } = require("hardhat");
const hre = require("hardhat");
import { sleep, loadDeployedContracts, saveDeployedContracts } from "./utils/helper";

async function deploy() {
    const [deployer] = await ethers.getSigners();
    const network = hre.network.config.chainId;
    let deployedContracts: any = loadDeployedContracts(`${network}`);
    console.log("Deployer Address:", deployer.address);
    console.log("Network: ", network);

    const FEE_ADDRESS: string = "0xF4B0595d5599779B2EEe3547cE30984dBFfd33bD";
    const FEE_UNIT: string = "10";

    let SWAP_TARGET: string | null = null;
    let SUPPORT_TOKEN: string | null = null;
    let W_GATEWAY: string | null = null;

    if (network == 43114) {
        // Avalanche
        SWAP_TARGET = "0xDef1C0ded9bec7F1a1670819833240f027b25EfF";
        SUPPORT_TOKEN = "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E";
        W_GATEWAY = "0x7280E3b8c686c68207aCb1A4D656b2FC8079c033";
    } else if (network == 137) {
        // Polygon
        SWAP_TARGET = "0xdef1c0ded9bec7f1a1670819833240f027b25eff";
        SUPPORT_TOKEN = "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359";
        W_GATEWAY = "0x7280E3b8c686c68207aCb1A4D656b2FC8079c033";
    } else if (network == 56) {
        // Binance
        SWAP_TARGET = "0xdef1c0ded9bec7f1a1670819833240f027b25eff";
        SUPPORT_TOKEN = "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d";
        W_GATEWAY = "0x7280E3b8c686c68207aCb1A4D656b2FC8079c033";
    } else {
        throw new Error("Invalid Chain");
    }

    // Deploy Swap.
    let CX_SWAP;
    console.log("\n\n---------------Step 1 : Deploying CxSwap--------------");
    if (deployedContracts.CX_SWAP) {
        CX_SWAP = deployedContracts.CX_SWAP;
        console.log("CxSwap already deployed to:", CX_SWAP);
    } else {
        const CxSwap = await ethers.getContractFactory("CxSwap");
        const cxSwap = await upgrades.deployProxy(
            CxSwap,
            [
                SWAP_TARGET,
                FEE_ADDRESS,
                FEE_UNIT,
            ],
            { initializer: 'initialize' }
        );
        const cxSwapReceipt = await cxSwap;
        CX_SWAP = cxSwapReceipt.target;
        deployedContracts.CX_SWAP = CX_SWAP;
        saveDeployedContracts(`${network}`, deployedContracts);
        console.log("CxSwap deployed to:", CX_SWAP);
        await sleep(5000);
    }

    // Deploy Router
    let CX_ROUTER;
    console.log("\n\n---------------Step 2 : Deploying CxRouter--------------");
    if (deployedContracts.CX_ROUTER) {
        CX_ROUTER = deployedContracts.CX_ROUTER;
        console.log("CxRouter already deployed to:", CX_ROUTER);
    } else {
        const CxRouter = await ethers.getContractFactory("CxRouter");
        const i3BridgeStgRouterV1 = await CxRouter.deploy(
            W_GATEWAY
        );
        const i3BridgeStgRouterV1Receipt = await i3BridgeStgRouterV1;
        CX_ROUTER = i3BridgeStgRouterV1Receipt.target;
        deployedContracts.CX_ROUTER = CX_ROUTER;
        saveDeployedContracts(`${network}`, deployedContracts);
        console.log("CxRouter deployed to:", CX_ROUTER);
        await sleep(5000);
    }

    // Deploy Hub
    let CX_HUB;
    console.log("\n\n---------------Step 3 : Deploying CxHub--------------");
    if (deployedContracts.CX_HUB) {
        CX_HUB = deployedContracts.CX_HUB;
        console.log("CxHub already deployed to:", CX_HUB);
    } else {
        const CxHub = await ethers.getContractFactory("CxHub");
        const cxHub = await upgrades.deployProxy(
            CxHub,
            [
                SUPPORT_TOKEN,
                deployedContracts.CX_SWAP,
                deployedContracts.CX_ROUTER,
            ],
            { initializer: 'initialize' }
        );
        const cxHubReceipt = await cxHub;
        CX_HUB = cxHubReceipt.target;
        deployedContracts.CX_HUB = CX_HUB;
        saveDeployedContracts(`${network}`, deployedContracts);
        console.log("CxHub deployed to:", CX_HUB);
        await sleep(5000);
    }
}

deploy();