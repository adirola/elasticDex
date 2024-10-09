import { useConnect } from "wagmi";
const ConnectWallet = () => {
  const { connectors, connect } = useConnect();
  console.log(connectors);

  return (
    <div className="flex flex-col items-center gap-2 h-dvh w-vw justify-center">
      {connectors.map((connector) => (
        <button key={connector.uid} onClick={() => connect({ connector })}>
          {connector.name}
        </button>
      ))}
    </div>
  );
};

export default ConnectWallet;
