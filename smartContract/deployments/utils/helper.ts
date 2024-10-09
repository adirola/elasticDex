const fs = require("fs");
const path = require("path");

export async function sleep(ms: number) {
    new Promise((resolve) => setTimeout(resolve, ms));
}

export function loadDeployedContracts(network: string) {
    const depDir = path.join(__dirname, ".." ,`Chain-${network}_deployed_contracts`);
    if (!fs.existsSync(depDir)) {
        fs.mkdirSync(depDir);
    }
    const deployedContractsPath = path.join(__dirname, ".." , `Chain-${network}_deployed_contracts`, `deployed_contracts.json`);
    if (fs.existsSync(deployedContractsPath)) {
        return JSON.parse(fs.readFileSync(deployedContractsPath));
    }
    return {};
}

export function saveDeployedContracts(network: string, contracts: any) {
    const depDir = path.join(__dirname, ".." , `Chain-${network}_deployed_contracts`);
    if (!fs.existsSync(depDir)) {
        fs.mkdirSync(depDir);
    }
    const deployedContractsPath = path.join(__dirname, ".." , `Chain-${network}_deployed_contracts`, `deployed_contracts.json`);
    fs.writeFileSync(
        deployedContractsPath,
        JSON.stringify(contracts, null, 2)
    );
    loadDeployedContracts(network);
}