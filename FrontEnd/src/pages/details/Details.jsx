import { useEffect, useState } from "react";
import { IoIosArrowDown, IoMdClose } from "react-icons/io";
import { LiaExchangeAltSolid } from "react-icons/lia";
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
} from "@headlessui/react";
import TokenSelect from "../../component/TokenSelect";
import ChainSelect from "../../component/ChainSelect";
import { useAccount } from "wagmi";
import { ethers } from "ethers";
import { getTokenBalance } from "../../utils";
import axios from "axios";
import RewiewDetails from "../../modal/RewiewDetails";

const Details = () => {
  const [fromDetails, setFromDetails] = useState({});
  const [toDetails, setToDetails] = useState([{}]);
  const [slippage, setSlippage] = useState(1);
  const [sellAmount, setSellAmount] = useState("");
  const [isTxLoading, setIsTxLoading] = useState(false);
  const [isreviewModalOpen, setIsreviewModalOpen] = useState(false);
  const [txDetails, setTxDetails] = useState();
  const [balance, setBalance] = useState();
  const wagmiAccount = useAccount();
  console.log(wagmiAccount);
  console.log(toDetails);
  console.log(fromDetails);

  const handleRowRemove = (index) => {
    setToDetails((prevDetails) => prevDetails.filter((_, i) => i !== index));
  };

  const handleTokenSelect = (index, data) => {
    setToDetails((prevDetails) =>
      prevDetails.map(
        (detail, i) => (i === index ? { ...detail, token: data } : detail) // Update the token at the correct index
      )
    );
  };
  const handleChainSelect = (index, data) => {
    setToDetails((prevDetails) =>
      prevDetails.map(
        (detail, i) => (i === index ? { ...detail, chain: data } : detail) // Update the chain at the correct index
      )
    );
  };

  useEffect(() => {
    (async () => {
      if (
        wagmiAccount.address &&
        fromDetails?.token?.address &&
        fromDetails?.chain?.rpc
      ) {
        const balance = await getTokenBalance(
          fromDetails?.token?.address,
          wagmiAccount.address,
          fromDetails?.chain?.rpc
        );
        console.log(balance);
        setBalance(balance);
      }
    })();
  }, [
    wagmiAccount.address,
    fromDetails?.token?.address,
    fromDetails?.chain?.rpc,
  ]);

  const getTransactionQuote = async () => {
    try {
      const provider = await wagmiAccount.connector.getProvider();
      const signer = new ethers.providers.Web3Provider(provider).getSigner();

      console.log(signer);
      const response = await axios.get(
        `https://us-central1-capx-x-web3auth.cloudfunctions.net/cx_service/getSwapQuote?chainId=${wagmiAccount.chainId}&sellToken=${fromDetails.token.address}&sellAmount=${sellAmount}&buyToken=${toDetails[0].token.address}&receiver=${wagmiAccount.address}&slippage=${slippage}`
      );
      console.log(response);
    } catch (error) {
      console.log(error);
    }
  };

  const handleSendTransaction = async () => {
    setIsTxLoading(true);
    const provider = await wagmiAccount.connector.getProvider();
    const signer = new ethers.providers.Web3Provider(provider).getSigner();

    console.log(signer);

    console.log(balance);
    try {
      const response = await axios.get(
        `https://us-central1-capx-x-web3auth.cloudfunctions.net/cx_service/getBridgeQuote?srcChainId=${wagmiAccount.chainId}&srcToken=${fromDetails.token.address}&srcAmount=${sellAmount}&rmtChainId=${toDetails[0].chain.id}&rmtToken=0xeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeeee&receiver=${wagmiAccount.address}&slippage=${slippage}`
      );
      console.log(response);
      const tx_details = response.data.result.tx_details;
      const contract = new ethers.Contract(
        tx_details.contract_address,
        tx_details.contract_abi,
        signer
      );
      const tx = await contract.bridge(
        tx_details.contract_params._srcSwapDetails,
        tx_details.contract_params._bridgeInfo,
        { value: tx_details.msg_value }
      );

      // const txResponse = await signer.sendTransaction({
      //   to: tx_details.contract_address,
      //   data: contract.interface.encodeFunctionData(
      //     "bridge",
      //     [
      //       tx_details.contract_params._srcSwapDetails,
      //       tx_details.contract_params._bridgeInfo,
      //     ],
      //     { value: tx_details.msg_value }
      //   ),
      //   type: 0,
      // });
      console.log(tx);
      const recipt = await tx.wait();
      console.log(recipt, " tx recipt");
    } catch (error) {
      console.log(error);
    }
    setIsTxLoading(false);
  };

  return (
    <div className="flex justify-center items-center h-dvh">
      {" "}
      <div className="bg-[#232323] flex flex-col rounded-xl min-w-[400px] p-3 gap-3">
        <h3 className="text-2xl font-semibold">Transfer</h3>
        <span>From</span>
        <div className="flex bg-[#1A1A1A] border border-[#323232] rounded-2xl">
          <TokenSelect
            handleSelect={(token) =>
              setFromDetails((prev) => ({ ...prev, token: token }))
            }
            value={fromDetails?.token}
          />
          <ChainSelect
            handleSelect={(chain) =>
              setFromDetails((prev) => ({ ...prev, chain: chain }))
            }
            value={fromDetails?.chain}
            selectedChains={[fromDetails]}
          />
        </div>
        <button className="rotate-90 self-start h-8 w-8 rounded-full flex justify-center items-center bg-[#323232]">
          <LiaExchangeAltSolid />
        </button>
        <span>To</span>
        {toDetails.map((to, i) => (
          <div key={i} className="flex items-center gap-2">
            <div className="flex bg-[#1A1A1A] border border-[#323232] rounded-2xl grow">
              <TokenSelect
                handleSelect={(data) => handleTokenSelect(i, data)}
                value={toDetails[i]?.token}
              />
              <ChainSelect
                handleSelect={(data) => handleChainSelect(i, data)}
                value={toDetails[i]?.chain}
                selectedChains={toDetails}
              />
            </div>
            {toDetails.length > 1 && (
              <button onClick={() => handleRowRemove(i)}>
                <IoMdClose />
              </button>
            )}
          </div>
        ))}

        {toDetails.length < 3 && (
          <button
            onClick={() => {
              setToDetails((prev) => {
                if (prev.length < 3) {
                  return [...prev, {}];
                } else {
                  return prev;
                }
              });
            }}
            className="bg-white text-black hover:opacity-50 duration-300 rounded-lg min-h-11"
          >
            Add More Assets
          </button>
        )}
        <span>Total Amount</span>
        <div className="relative">
          <input
            value={sellAmount}
            placeholder="0.0"
            className=" w-full py-3 px-2 border border-[#323232] rounded-lg bg-[#1A1A1A]"
            onChange={(e) => {
              const value = e.target.value;
              const regex = /^\d+(\.\d*)?$/;

              // Allow an empty string, or a single '0' without restriction
              if (value === "" || value === "0" || regex.test(value)) {
                setSellAmount(value);
              }
            }}
          />
          <button
            onClick={() => setSellAmount(balance)}
            className="absolute top-1/2 -translate-y-1/2 right-3 border rounded-md border-[#50BEAF] text-[#50BEAF] duration-300 text-xs py-0.5 px-1.5 font-medium hover:bg-[#50BEAF] hover:text-[#1A1A1A]"
          >
            MAX
          </button>
        </div>
        <div className="flex items-center justify-between px-2">
          <span>Balance</span>
          <span>{balance ? balance : 0}</span>
        </div>
        <Disclosure
          as="div"
          className="p-3 border border-[#323232] rounded-lg bg-[#1A1A1A]"
          defaultOpen={false}
        >
          {({ open }) => (
            <>
              <DisclosureButton className="group flex w-full items-center justify-between">
                <span className="text-sm/6 font-medium text-white group-data-[hover]:text-white/80">
                  Slippage
                </span>
                {
                  <IoIosArrowDown
                    className={`fill-slate-400 duration-100 ${
                      open ? "rotate-180" : "rotate-0"
                    }`}
                  />
                }
              </DisclosureButton>
              <DisclosurePanel className="mt-2 text-sm/5 text-white/50 flex gap-1">
                <input
                  className="bg-transparent grow border border-[#323232] rounded-md py-0.5 px-1 mr-2"
                  placeholder="1-50"
                  value={slippage}
                  onChange={(e) => {
                    const value = e.target.value;

                    if (
                      value === "" ||
                      (Number(value) >= 1 && Number(value) <= 50)
                    ) {
                      setSlippage(value);
                    }
                  }}
                />
                <button
                  onClick={() => setSlippage(1)}
                  className={`border rounded-lg text-white px-3 font-semibold bg-[#323232] ${
                    slippage == 1 ? "border-white" : "border-transparent"
                  }`}
                >
                  1
                </button>
                <button
                  onClick={() => setSlippage(5)}
                  className={`border rounded-lg text-white px-3 font-semibold bg-[#323232] ${
                    slippage == 5 ? "border-white" : "border-transparent"
                  }`}
                >
                  5
                </button>
              </DisclosurePanel>
            </>
          )}
        </Disclosure>
        <button
          disabled={isTxLoading}
          onClick={handleSendTransaction}
          className="bg-white text-black hover:opacity-50 duration-300 rounded-lg flex justify-center items-center min-h-11"
        >
          {isTxLoading ? (
            <div className="w-6 h-6 border-2 border-black border-b-transparent rounded-full animate-spin" />
          ) : (
            " Approve"
          )}
        </button>
      </div>
      <RewiewDetails
        open={isreviewModalOpen}
        handleSubmit={handleSendTransaction}
        handleClose={() => {
          setIsreviewModalOpen(false);
          setToDetails([{}]);
          setFromDetails({});
        }}
      />
    </div>
  );
};

export default Details;
