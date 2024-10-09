//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
pragma abicoder v2;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";

library StringHelper {
    function concat(
        bytes memory a,
        bytes memory b
    ) internal pure returns (bytes memory) {
        return abi.encodePacked(a, b);
    }

    function getRevertMsg(
        bytes memory _returnData
    ) internal pure returns (string memory) {
        if (_returnData.length < 68) return "Transaction reverted silently";
        assembly {
            _returnData := add(_returnData, 0x04)
        }
        return abi.decode(_returnData, (string));
    }
}

contract CxSwap is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable
{
    using StringHelper for bytes;
    using StringHelper for uint256;
    using SafeERC20 for IERC20;

    // Cross-chain Fee.
    address payable public FEE_ADDRESS;
    uint256 public FEE;
    uint256 public FEE_DENOM;

    mapping(address => bool) public targets;

    struct CxSwapInfo {
        address sellToken;
        uint256 sellAmt;
        address buyToken;
        address swapTarget;
        bytes swapData;
    }

    function _authorizeUpgrade(
        address _newImplementation
    ) internal override onlyOwner {}

    function initialize(
        address _target,
        address payable _feeAddress,
        uint256 _fee
    ) public initializer {
        require(
                _target != address(0) &&
                _feeAddress != address(0),
            "CxZeroAddressNotAllowed"
        );
        
        targets[_target] = true;
        FEE_ADDRESS = _feeAddress;
        FEE = _fee;
        FEE_DENOM = 10_000;

        __Ownable_init();
        _transferOwnership(_msgSender());
        __UUPSUpgradeable_init();
        __Pausable_init();
        __ReentrancyGuard_init();
    }

    receive() external payable {}

    function withdraw(address _token) external onlyOwner {
        require(_token != address(0), "CxZeroAddressNotAllowed");
        IERC20(_token).safeTransfer(
            msg.sender,
            IERC20(_token).balanceOf(address(this))
        );
    }

    function withdrawETH() public onlyOwner {
        address payable to = payable(msg.sender);
        to.transfer(address(this).balance);
    }

    function configureFee(
        address payable _feeAddress,
        uint256 _fee
    ) external onlyOwner {
        require(_feeAddress != address(0), "CxZeroAddressNotAllowed");
        FEE_ADDRESS = _feeAddress;
        FEE = _fee;
    }

    function configureTarget(address target, bool isActive) external onlyOwner {
        require(target != address(0), "CxZeroAddressNotAllowed");
        targets[target] = isActive;
    }

    function swap(
        CxSwapInfo memory _swapDetails
    ) external payable nonReentrant returns (uint256 buyTokenAmt) {
        {
            require(
                _swapDetails.sellAmt != 0 && targets[_swapDetails.swapTarget],
                "CxInvalidSwapInputs"
            );
        }
        if (_swapDetails.sellToken == address(0)) {
            // Native to Token.
            {
                // Validation.
                require(
                    _swapDetails.sellAmt <= address(this).balance,
                    "CxInsufficientBalanceForSwap"
                );
            }
            uint256 currBuyTokenBal = IERC20(_swapDetails.buyToken).balanceOf(
                address(this)
            );
            {
                // Make Swap.
                (bool success, bytes memory res) = _swapDetails.swapTarget.call{
                    value: _swapDetails.sellAmt
                }(_swapDetails.swapData);
                require(
                    success,
                    string(
                        bytes("CxSwapIntentFailure: ").concat(
                            bytes(res.getRevertMsg())
                        )
                    )
                );
            }
            buyTokenAmt =
                IERC20(_swapDetails.buyToken).balanceOf(address(this)) -
                currBuyTokenBal;
            IERC20(_swapDetails.buyToken).safeTransfer(
                _msgSender(),
                buyTokenAmt
            );
        } else if (_swapDetails.buyToken == address(0)) {
            // Token to Native.
            {
                // Validation
                require(
                    IERC20(_swapDetails.sellToken).approve(
                        _swapDetails.swapTarget,
                        _swapDetails.sellAmt
                    ),
                    "CxApprovalFailed"
                );
            }
            uint256 currBuyTokenBal = address(this).balance;
            {
                // Make Swap.
                (bool success, bytes memory res) = _swapDetails.swapTarget.call(
                    _swapDetails.swapData
                );
                require(
                    success,
                    string(
                        bytes("CxSwapIntentFailure: ").concat(
                            bytes(res.getRevertMsg())
                        )
                    )
                );
            }
            buyTokenAmt = address(this).balance - currBuyTokenBal;
            buyTokenAmt = address(this).balance - currBuyTokenBal;
            (bool sendSuccess, bytes memory sendRes) = payable(_msgSender())
                .call{value: buyTokenAmt}("");
            require(
                sendSuccess,
                string(
                    bytes("Native Transfer Failed: ").concat(
                        bytes(sendRes.getRevertMsg())
                    )
                )
            );
        } else {
            // Token to Token
            {
                // Validation
                require(
                    IERC20(_swapDetails.sellToken).approve(
                        _swapDetails.swapTarget,
                        _swapDetails.sellAmt
                    ),
                    "CxApprovalFailed"
                );
            }
            uint256 currBuyTokenBal = IERC20(_swapDetails.buyToken).balanceOf(
                address(this)
            );
            {
                // Make Swap.
                (bool success, bytes memory res) = _swapDetails.swapTarget.call(
                    _swapDetails.swapData
                );
                require(
                    success,
                    string(
                        bytes("CxSwapIntentFailure: ").concat(
                            bytes(res.getRevertMsg())
                        )
                    )
                );
            }
            buyTokenAmt =
                IERC20(_swapDetails.buyToken).balanceOf(address(this)) -
                currBuyTokenBal;
            IERC20(_swapDetails.buyToken).safeTransfer(
                _msgSender(),
                buyTokenAmt
            );
        }
    }

    function getFee(
        uint256 _amount
    ) external view returns(address _fee, uint256 _feeAmt) {
        _fee = FEE_ADDRESS;
        _feeAmt = _amount * FEE / FEE_DENOM;
    }
}
