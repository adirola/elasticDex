import { ethers } from "ethers";

const erc20Abi = [
  // The ERC-20 `balanceOf` function we want to call
  "function balanceOf(address owner) view returns (uint256)",
];

export const getTokenBalance = async (
  tokenAddress,
  walletAddress,
  providerUrl
) => {
  console.log(tokenAddress, walletAddress, providerUrl);
  try {
    const provider = new ethers.providers.JsonRpcProvider(providerUrl);
    if (tokenAddress === "0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee") {
      const balance = await provider.getBalance(walletAddress);
      const balanceInEther = ethers.utils.formatEther(balance);
      return balanceInEther;
    }

    // Create a contract instance to interact with the token
    const tokenContract = new ethers.Contract(tokenAddress, erc20Abi, provider);

    // Fetch the balance of the token for the provided wallet address
    const balance = await tokenContract.balanceOf(walletAddress);

    // Assuming the token has 18 decimals (most common)
    const decimals = 6;

    // Convert the balance to a human-readable format

    const formattedBalance = ethers.utils.formatUnits(balance, decimals);

    console.log(`Balance: ${formattedBalance}`);
    return formattedBalance;
  } catch (error) {
    console.error("Error fetching token balance:", error);
  }
};
