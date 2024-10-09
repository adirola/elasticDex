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

    let REMOTE_CHAIN: any | null = [];
    if (network == 43114) {
        // Avalanche
        const polygonContracts: any = loadDeployedContracts(`137`);
        REMOTE_CHAIN.push(
            {
                chainId: "2147484614",
                rmtCxRouter: polygonContracts.CX_ROUTER,
                rmtToken: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
                decimal: "6"
            }
        );
        const binanceContracts: any = loadDeployedContracts(`56`);
        if (!binanceContracts){
            REMOTE_CHAIN.push(
                {
                    chainId: "2147484362",
                    rmtCxRouter: binanceContracts.CX_ROUTER,
                    rmtToken: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
                    decimal: "18"
                }
            );
        }
    } else if (network == 137) {
        // Polygon
        const avaxContracts: any = loadDeployedContracts(`43114`);
        REMOTE_CHAIN.push(
            {
                chainId: "2147492648",
                rmtCxRouter: avaxContracts.CX_ROUTER,
                rmtToken: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
                decimal: "6"
            }
        );
        const binanceContracts: any = loadDeployedContracts(`56`);
        if (!binanceContracts){
            REMOTE_CHAIN.push(
                {
                    chainId: "2147484362",
                    rmtCxRouter: binanceContracts.CX_ROUTER,
                    rmtToken: "0x8AC76a51cc950d9822D68b83fE1Ad97B32Cd580d",
                    decimal: "18"
                }
            );
        }
    } else if (network == 56) {
        // Binance
        const polygonContracts: any = loadDeployedContracts(`137`);
        REMOTE_CHAIN.push(
            {
                chainId: "2147484614",
                rmtCxRouter: polygonContracts.CX_ROUTER,
                rmtToken: "0x3c499c542cEF5E3811e1192ce70d8cC03d5c3359",
                decimal: "6"
            }
        );
        const avaxContracts: any = loadDeployedContracts(`43114`);
        REMOTE_CHAIN.push(
            {
                chainId: "2147492648",
                rmtCxRouter: avaxContracts.CX_ROUTER,
                rmtToken: "0xB97EF9Ef8734C71904D8002F8b6Bc66Dd9c48a6E",
                decimal: "6"
            }
        );
    } else {
        throw new Error("Invalid Chain");
    }

    console.log(`\n\n---------------Step : Configure CxHub in CxRouter--------------`)
    // await cxRouter.configureCxHub(deployedContracts.CX_HUB);

    console.log(`\n\n---------------Step : Configure TrustedRemoteRouters in CxRouter--------------`);
    const trustedChains: string[] = [];
    const trustedRouters: string[] = [];
    const trusted: boolean[] = [];
    for (let i = 0; i < REMOTE_CHAIN.length; i++) {
        const {chainId, rmtCxRouter} = REMOTE_CHAIN[i];
        trustedChains.push(chainId);
        trustedRouters.push(rmtCxRouter);
        trusted.push(true);
    }
    await cxRouter.setTrustedRemotes(trustedChains,trustedRouters,trusted);
}

configure();