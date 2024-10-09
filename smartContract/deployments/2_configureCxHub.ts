const { ethers } = require("hardhat");
const hre = require("hardhat");
import { loadDeployedContracts, sleep } from "./utils/helper";

async function configure() {
    const [deployer] = await ethers.getSigners();
    const network = hre.network.config.chainId;
    let deployedContracts: any = loadDeployedContracts(`${network}`);
    console.log("Deployer Address:", deployer.address);
    console.log("Network: ", network);

    if (!deployedContracts.CX_HUB) {
        throw new Error("CxHub not deployed");
    }

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

    const CxHub = await ethers.getContractFactory("CxHub");
    const cxHub: any = CxHub.attach(deployedContracts.CX_HUB);

    for(let i = 0; i < REMOTE_CHAIN.length; i++) {
        const {chainId, rmtCxRouter, rmtToken, decimal} = REMOTE_CHAIN[i];
        console.log(`\n\n---------------Step : Configure Rmt Token in CxHub--------------`)
        await cxHub.configureRmtToken(
            chainId,
            rmtToken,
            decimal
        );
        await sleep(50000);
        console.log(`\n\n---------------Step : Configure Rmt Router in CxHub--------------`)
        await cxHub.configureRmtRouter(
            chainId,
            rmtCxRouter
        );
        await sleep(50000);
    }

}

configure();