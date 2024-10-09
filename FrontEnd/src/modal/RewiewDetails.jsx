import { Dialog, DialogPanel, DialogTitle } from "@headlessui/react";
import { IoMdClose } from "react-icons/io";
import { chainList } from "../data/chainList";

const RewiewDetails = ({ handleClose, open, handletransaction }) => {
  return (
    <Dialog
      open={open}
      as="div"
      className="relative z-10 focus:outline-none "
      onClose={handleClose}
    >
      <div className="fixed inset-0 z-10 w-screen overflow-y-auto">
        <div className="flex min-h-full items-center justify-center p-4  backdrop-blur-sm bg-black bg-opacity-55">
          <DialogPanel
            transition
            className="w-full relative max-w-[400px] rounded-xl bg-[#232323] p-6 backdrop-blur-2xl duration-300 ease-out data-[closed]:transform-[scale(95%)] data-[closed]:opacity-0"
          >
            <buttion
              className="absolute right-2 top-2 h-8 w-8 flex items-center justify-center hover:bg-white hover:bg-opacity-35 rounded-full duration-200"
              onClick={handleClose}
            >
              <IoMdClose />
            </buttion>
            <DialogTitle
              as="h3"
              className="text-base/7 font-medium text-white mb-3"
            >
              Review Details
            </DialogTitle>
            <div></div>
          </DialogPanel>
        </div>
      </div>
    </Dialog>
  );
};

export default RewiewDetails;
