import { HardhatUserConfig } from "hardhat/config";
import "hardhat-contract-sizer";
import "@openzeppelin/hardhat-upgrades";
import "@nomicfoundation/hardhat-toolbox";
import dotenv from 'dotenv';
dotenv.config();

const config: HardhatUserConfig = {
  solidity: {
    version: "0.8.22",
    settings: {
      optimizer: {
        enabled: true,
        runs: 1000
      }
    }
  },
  contractSizer: {
    alphaSort: true,
    runOnCompile: false,
    disambiguatePaths: false,
  },
  networks: {
    polygon: {
      url: `${process.env.POLYGON_RPC_URL}`,
      accounts: [`${process.env.DEPLOYER_PRIVATE_KEY}`],
      chainId: Number(`${process.env.POLYGON_CHAIN_ID}`),
    },
    avalanche: {
      url: `${process.env.AVALANCHE_RPC_URL}`,
      accounts: [`${process.env.DEPLOYER_PRIVATE_KEY}`],
      chainId: Number(`${process.env.AVALANCHE_CHAIN_ID}`),
    },
    binance: {
      url: `${process.env.BINANCE_RPC_URL}`,
      accounts: [`${process.env.DEPLOYER_PRIVATE_KEY}`],
      chainId: Number(`${process.env.BINANCE_CHAIN_ID}`),
    }
  },
  mocha: {
    timeout: 120000
  }
};

export default config;
