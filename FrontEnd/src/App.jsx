import { useAccount } from "wagmi";
import "./App.css";
import ConnectWallet from "./pages/connectWallet/ConnectWallet";
import Details from "./pages/details/Details";

function App() {
  const { isConnected } = useAccount();
  console.log(isConnected);
  return <>{isConnected ? <Details /> : <ConnectWallet />}</>;
}

export default App;
