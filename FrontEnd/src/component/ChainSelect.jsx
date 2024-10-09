import { useState } from "react";
import { IoIosArrowDown } from "react-icons/io";
import SelectChain from "../modal/SelectChain";

const ChainSelect = ({ handleSelect, value, selectedChains }) => {
  const [selectChainModalOpen, setSelectChainModalOpen] = useState(false);

  const handleChainModalClose = () => {
    setSelectChainModalOpen(false);
  };
  const handleChainModalOpen = () => {
    setSelectChainModalOpen(true);
  };
  return (
    <>
      <div className="p-2 w-1/2 flex flex-col gap-1.5 border-l border-[#323232]">
        <span className="text-xs text-[#999999] text-normal">From</span>
        <button
          onClick={handleChainModalOpen}
          className="flex items-center gap-1"
        >
          {value?.icon ? (
            <img
              src={value?.icon}
              alt={value.name}
              className="h-[20px] w-[20px] rounded-full"
            />
          ) : (
            <div className="h-[20px] w-[20px] rounded-full bg-[#232323]" />
          )}
          <span className="text-[#999999] font-medium">
            {value?.name ? value?.name : "Select"}
          </span>
          <IoIosArrowDown className="fill-slate-400" />
        </button>
      </div>
      <SelectChain
        open={selectChainModalOpen}
        handleClose={handleChainModalClose}
        handleSelect={handleSelect}
        selectedChains={selectedChains}
      />
    </>
  );
};

export default ChainSelect;
