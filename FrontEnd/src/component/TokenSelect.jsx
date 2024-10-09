import { IoIosArrowDown } from "react-icons/io";
import SelectToken from "../modal/SelectToken";
import { useState } from "react";

const TokenSelect = ({ handleSelect, value }) => {
  const [selectTokenModalOpen, setSelectTokenModalOpen] = useState(false);

  const handleTokenModalClose = () => {
    setSelectTokenModalOpen(false);
  };
  const handleTokenModalOpen = () => {
    setSelectTokenModalOpen(true);
  };

  return (
    <>
      <div className="p-2 w-1/2 flex flex-col gap-1.5">
        <span className="text-xs text-[#999999] text-normal">Token</span>
        <button
          onClick={handleTokenModalOpen}
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
            {value?.value ? value?.value : "Select"}
          </span>
          <IoIosArrowDown className="fill-slate-400" />
        </button>
      </div>
      <SelectToken
        open={selectTokenModalOpen}
        handleClose={handleTokenModalClose}
        handleSelect={handleSelect}
      />
    </>
  );
};

export default TokenSelect;
