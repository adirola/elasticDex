import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App.jsx";
import "./index.css";
import { http, createConfig, WagmiProvider } from "wagmi";
import { polygon, avalanche } from "wagmi/chains";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { injected, metaMask, safe, walletConnect } from "wagmi/connectors";
import { defineChain } from "viem";

const binance = defineChain({
  id: 56,
  name: "Binance Smart Chain (BSC)",
  network: "bsc",
  nativeCurrency: {
    decimals: 18,
    name: "Binance Coin",
    symbol: "BNB",
  },
  rpcUrls: {
    default: {
      http: ["https://bsc-dataseed.binance.org/"],
      webSocket: ["wss://bsc-ws-node.nariox.org:443"],
    },
    public: {
      http: ["https://bsc-dataseed.binance.org/"],
      webSocket: ["wss://bsc-ws-node.nariox.org:443"],
    },
  },
  blockExplorers: {
    default: {
      name: "BscScan",
      url: "https://bscscan.com/",
    },
  },
});

const config = createConfig({
  chains: [polygon, avalanche, binance],
  connectors: [
    injected(),
    walletConnect({ projectId: "3fcc6bba6f1de962d911bb5b5c3dba68" }),
    metaMask(),
    safe(),
  ],
  transports: {
    [polygon.id]: http(),
    [avalanche.id]: http(),
    [binance.id]: http(),
  },
});

const queryClient = new QueryClient();
createRoot(document.getElementById("root")).render(
  <StrictMode>
    <WagmiProvider config={config}>
      <QueryClientProvider client={queryClient}>
        <App />
      </QueryClientProvider>
    </WagmiProvider>
  </StrictMode>
);
