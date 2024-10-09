//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
pragma abicoder v2;

import {Ownable} from "@openzeppelin/contracts/access/Ownable.sol";
import {Pausable} from "@openzeppelin/contracts/security/Pausable.sol";
import {ReentrancyGuard} from "@openzeppelin/contracts/security/ReentrancyGuard.sol";
import {SafeERC20, IERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {WmbApp} from "@wandevs/message/contracts/app/WmbApp.sol";

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

interface ICxSwap {
    struct CxSwapInfo {
        address sellToken;
        uint256 sellAmt;
        address buyToken;
        address swapTarget;
        bytes swapData;
    }
}

interface ICxHub {
    function handleBridge(
        address _receiver,
        address _asset,
        uint256 _amount,
        ICxSwap.CxSwapInfo memory _swapDetails
    ) external payable returns (bool);
}

contract CxRouter is Ownable, Pausable, ReentrancyGuard, WmbApp {
    using StringHelper for bytes;
    using StringHelper for uint256;
    using SafeERC20 for IERC20;

    ICxHub public cxHub;

    mapping(bytes32 => uint256) public recover;

    struct CxRouterInfo {
        address asset;
        uint256 rmtChainId;
        address rmtCxRouter;
        uint256 gasLimit;
        bytes payload;
    }

    event MsgStat(bool isSuccess, bytes32 messageId);

    modifier isCx() {
        require(
            _msgSender() == address(cxHub) || _msgSender() == owner(),
            "CxUnAuthorized"
        );
        _;
    }

    constructor(address _wmbGateway) Ownable() Pausable() ReentrancyGuard() WmbApp() {
        initialize(_msgSender(), _wmbGateway);
        _transferOwnership(_msgSender());
    }

    function _wmbReceive(
        bytes calldata data,
        bytes32 messageId,
        uint256,
        address
    ) internal override {
        require(_msgSender() == address(wmbGateway), "CxUnAuthorized");
        (
            address token,
            uint256 amount,
            address receiver,
            ICxSwap.CxSwapInfo memory swapDetails
        ) = abi.decode(data, (address, uint256, address, ICxSwap.CxSwapInfo));
        // Approve Tokens.
        IERC20(token).safeIncreaseAllowance(address(cxHub), amount);
        bool isSuccess;
        try cxHub.handleBridge(receiver, token, amount, swapDetails) returns (
            bool
        ) {
            isSuccess = true;
        } catch {
            recover[messageId] = amount;
        }
        emit MsgStat(isSuccess, messageId);
    }

    function send(CxRouterInfo memory _route) external payable nonReentrant isCx {
        uint256 gasFee = estimateFee(_route.rmtChainId, _route.gasLimit);
        require(msg.value >= gasFee, "CxInsufficientRoutingFee");
        _dispatchMessage(
            _route.rmtChainId,
            _route.rmtCxRouter,
            _route.payload,
            gasFee
        );
    }

    function sendMany(
        CxRouterInfo[] memory _routes
    ) external payable nonReentrant isCx {
        uint256 totalGasFee = 0;
        for (uint256 i = 0; i < _routes.length; i++) {
            CxRouterInfo memory _route = _routes[i];
            uint256 gasFee = estimateFee(_route.rmtChainId, _route.gasLimit);
            _dispatchMessage(
                _route.rmtChainId,
                _route.rmtCxRouter,
                _route.payload,
                gasFee
            );
            totalGasFee += gasFee;
        }
        require(msg.value >= totalGasFee, "CxInsufficientRoutingFee");
    }

    function configureCxHub(address _hub) external onlyOwner {
        require(_hub != address(0), "CxZeroAddressNotAllowed");
        cxHub = ICxHub(_hub);
    }
}
