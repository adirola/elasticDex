//SPDX-License-Identifier: MIT
pragma solidity ^0.8.20;
pragma abicoder v2;

import {OwnableUpgradeable} from "@openzeppelin/contracts-upgradeable/access/OwnableUpgradeable.sol";
import {ReentrancyGuardUpgradeable} from "@openzeppelin/contracts-upgradeable/security/ReentrancyGuardUpgradeable.sol";
import {Initializable} from "@openzeppelin/contracts-upgradeable/proxy/utils/Initializable.sol";
import {UUPSUpgradeable} from "@openzeppelin/contracts-upgradeable/proxy/utils/UUPSUpgradeable.sol";
import {PausableUpgradeable} from "@openzeppelin/contracts-upgradeable/security/PausableUpgradeable.sol";
import {IERC20, SafeERC20} from "@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol";
import {IERC20Metadata} from "@openzeppelin/contracts/token/ERC20/extensions/IERC20Metadata.sol";

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

    function swap(
        CxSwapInfo memory _swapDetails
    ) external payable returns (uint256);

    function getFee(uint256 _amount) external view returns (address, uint256);

    function supportToken(address _token) external view returns (bool);
}

interface ICxRouter {
    struct CxRouterInfo {
        address asset;
        uint256 rmtChainId;
        address rmtCxRouter;
        uint256 gasLimit;
        bytes payload;
    }

    function send(CxRouterInfo memory _route) external payable;

    function sendMany(CxRouterInfo[] memory _routes) external payable;
}

contract CxHub is
    Initializable,
    OwnableUpgradeable,
    UUPSUpgradeable,
    ReentrancyGuardUpgradeable,
    PausableUpgradeable
{
    using StringHelper for bytes;
    using StringHelper for uint256;
    using SafeERC20 for IERC20;

    ICxSwap public cxSwap;
    ICxRouter public cxRouter;

    struct CxBridgeInfo {
        address asset;
        uint256 rmtChainId;
        uint256 gasLimit;
        uint256 gasFee;
        address receiver;
        ICxSwap.CxSwapInfo swapDetails;
    }

    struct CxChain {
        address rmtCxRouter;
        address rmtToken;
        uint8 decimals;
    }

    // Supported Remote Address.
    mapping(uint256 => CxChain) public rmtChain;
    mapping(address => bool) public supportToken;

    function _authorizeUpgrade(
        address _newImplementation
    ) internal override onlyOwner {}

    function initialize(
        address _supportToken,
        address _cxSwap,
        address _cxRouter
    ) public initializer {
        require(
            _supportToken != address(0) &&
                _cxSwap != address(0) &&
                _cxRouter != address(0),
            "CxZeroAddressNotAllowed"
        );
        supportToken[_supportToken] = true;
        cxSwap = ICxSwap(_cxSwap);
        cxRouter = ICxRouter(_cxRouter);

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

    function configureCxRouter(address _router) external onlyOwner {
        require(_router != address(0), "CxZeroAddressNotAllowed");
        cxRouter = ICxRouter(_router);
    }

    function configureSupportToken(
        address token,
        bool isActive
    ) external onlyOwner {
        require(token != address(0), "CxZeroAddressNotAllowed");
        supportToken[token] = isActive;
    }

    function configureRmtToken(
        uint256 _rmtChainId,
        address _rmtToken,
        uint8 _decimal
    ) external onlyOwner {
        require(_rmtToken != address(0), "CxZeroAddressNotAllowed");
        CxChain memory chain = rmtChain[_rmtChainId];
        chain.rmtToken = _rmtToken;
        chain.decimals = _decimal;
        rmtChain[_rmtChainId] = chain;
    }

    function configureRmtRouter(
        uint256 _rmtChainId,
        address _rmtCxRouter
    ) external onlyOwner {
        require(_rmtCxRouter != address(0), "CxZeroAddressNotAllowed");
        CxChain memory chain = rmtChain[_rmtChainId];
        chain.rmtCxRouter = _rmtCxRouter;
        rmtChain[_rmtChainId] = chain;
    }

    function configureCxSwap(address _swap) external onlyOwner {
        require(_swap != address(0), "CxZeroAddressNotAllowed");
        cxSwap = ICxSwap(_swap);
    }

    function swap(
        address _receiver,
        ICxSwap.CxSwapInfo memory _swapDetails
    ) external payable nonReentrant {
        uint256 _msgValue = msg.value;
        if (_swapDetails.sellToken != address(0)) {
            IERC20(_swapDetails.sellToken).safeTransferFrom(
                _msgSender(),
                address(cxSwap),
                _swapDetails.sellAmt
            );
            _msgValue = 0;
        }
        uint256 boughtAmt = cxSwap.swap{value: _msgValue}(_swapDetails);
        // Take Fee.
        uint256 afterFee = _takeFee(_swapDetails.buyToken, boughtAmt);
        // Transfer to receiver
        _transfer(_swapDetails.buyToken, afterFee, _receiver);
    }

    function bridge(
        ICxSwap.CxSwapInfo memory _srcSwapDetails,
        CxBridgeInfo memory _bridgeInfo
    ) external payable nonReentrant {
        uint256 _msgValue = msg.value;
        require(supportToken[_bridgeInfo.asset], "CxUnsupportedBridgeAsset");
        if (_srcSwapDetails.sellToken != address(0)) {
            IERC20(_srcSwapDetails.sellToken).safeTransferFrom(
                _msgSender(),
                address(cxSwap),
                _srcSwapDetails.sellAmt
            );
            require(
                msg.value >= _bridgeInfo.gasFee,
                "CxInsufficientGasForRemoteTransaction"
            );
            _msgValue = msg.value;
        } else {
            _msgValue = _srcSwapDetails.sellAmt;
        }
        uint256 boughtAmt = cxSwap.swap{value: _msgValue}(_srcSwapDetails);
        // Liquidity Sent to the Router contract.
        _transfer(_bridgeInfo.asset, boughtAmt, address(cxRouter));
        // Construct Remote Router execution method.
        bytes memory payload = _constructExeMethod(boughtAmt, _bridgeInfo);
        cxRouter.send{value: address(this).balance}(
            ICxRouter.CxRouterInfo({
                asset: _bridgeInfo.asset,
                rmtChainId: _bridgeInfo.rmtChainId,
                rmtCxRouter: rmtChain[_bridgeInfo.rmtChainId].rmtCxRouter,
                gasLimit: _bridgeInfo.gasLimit,
                payload: payload
            })
        );
    }

    function bridgeMany(
        ICxSwap.CxSwapInfo memory _srcSwapDetails,
        CxBridgeInfo[] memory _bridgeInfos,
        uint256[] memory _bridgePercent
    ) external payable nonReentrant {
        uint256 _msgValue = msg.value;
        require(
            _bridgeInfos.length <= 3 &&
                _bridgeInfos.length == _bridgePercent.length,
            "CxInvalidBridgeInputs"
        );
        require(
            supportToken[_srcSwapDetails.buyToken],
            "CxUnsupportedBridgeAsset"
        );
        if (_srcSwapDetails.sellToken != address(0)) {
            IERC20(_srcSwapDetails.sellToken).safeTransferFrom(
                _msgSender(),
                address(cxSwap),
                _srcSwapDetails.sellAmt
            );
            _msgValue = msg.value;
        } else {
            _msgValue = _srcSwapDetails.sellAmt;
        }
        uint256 boughtAmt = cxSwap.swap{value: _msgValue}(_srcSwapDetails);
        // Liquidity Sent to the Router contract.
        _transfer(_srcSwapDetails.buyToken, boughtAmt, address(cxRouter));
        // Construct Remote Router execution method.
        ICxRouter.CxRouterInfo[] memory routes = new ICxRouter.CxRouterInfo[](
            _bridgeInfos.length
        );
        for (uint256 i = 0; i < _bridgeInfos.length; i++) {
            CxBridgeInfo memory _bridgeInfo = _bridgeInfos[i];
            require(_bridgePercent[i] != 0, "CxInvalidBridgePercent");
            bytes memory payload = _constructExeMethod(
                _normaliseAmt(
                    _bridgeInfo.rmtChainId,
                    _bridgeInfo.asset,
                    (boughtAmt * _bridgePercent[i]) / 10_000
                ),
                _bridgeInfo
            );
            {
                ICxRouter.CxRouterInfo memory route = ICxRouter.CxRouterInfo({
                    asset: _bridgeInfo.asset,
                    rmtChainId: _bridgeInfo.rmtChainId,
                    rmtCxRouter: rmtChain[_bridgeInfo.rmtChainId].rmtCxRouter,
                    gasLimit: _bridgeInfo.gasLimit,
                    payload: payload
                });
                routes[i] = route;
            }
        }
        cxRouter.sendMany{value: address(this).balance}(routes);
    }

    function handleBridge(
        address _receiver,
        address _asset,
        uint256 _amount,
        ICxSwap.CxSwapInfo memory _swapDetails
    ) external payable returns (bool) {
        require(
            _asset == _swapDetails.sellToken && supportToken[_asset],
            "CxInvalidSupportToken"
        );
        require(_amount >= _swapDetails.sellAmt, "CxInvalidBridgeAmt");
        _swapDetails.sellAmt = _amount;
        IERC20(_swapDetails.sellToken).safeTransferFrom(
            _msgSender(),
            address(this),
            _swapDetails.sellAmt
        );
        // Take Fee.
        uint256 afterFee = _takeFee(
            _swapDetails.sellToken,
            _swapDetails.sellAmt
        );
        if (_swapDetails.sellToken == _swapDetails.buyToken) {
            // No Swap Required.
            _transfer(_swapDetails.buyToken, afterFee, _receiver);
        } else {
            // Transfer to swap.
            IERC20(_swapDetails.sellToken).safeTransferFrom(
                _msgSender(),
                address(cxSwap),
                afterFee
            );
            _swapDetails.sellAmt = afterFee;
            uint256 boughtAmt = cxSwap.swap(_swapDetails);
            // Transfer to receiver
            _transfer(_swapDetails.buyToken, boughtAmt, _receiver);
        }
        return true;
    }

    function _normaliseAmt(
        uint256 _chainId,
        address _token,
        uint256 _amount
    ) private view returns (uint256 amt) {
        uint256 decimal = rmtChain[_chainId].decimals;
        amt =
            (_amount * 10 ** decimal) /
            10 ** IERC20Metadata(_token).decimals();
    }

    function _constructExeMethod(
        uint256 _amount,
        CxBridgeInfo memory _bridgeInfo
    ) private view returns (bytes memory bridgePayload) {
        bridgePayload = abi.encode(
            rmtChain[_bridgeInfo.rmtChainId].rmtToken, // Token received on destination chain.
            _amount,
            _bridgeInfo.receiver, // Swap Receiver.
            _bridgeInfo.swapDetails
        );
    }

    function _takeFee(
        address _buyToken,
        uint256 _amount
    ) private returns (uint256 afterFee) {
        (address fee, uint256 feeAmt) = cxSwap.getFee(_amount);
        if (_buyToken == address(0)) {
            // Take Fee.
            {
                (bool sendSuccess, bytes memory sendRes) = payable(fee).call{
                    value: feeAmt
                }("");
                require(
                    sendSuccess,
                    string(
                        bytes("Native Transfer Failed: ").concat(
                            bytes(sendRes.getRevertMsg())
                        )
                    )
                );
            }
        } else {
            IERC20(_buyToken).safeTransfer(fee, feeAmt);
        }
        afterFee = _amount - feeAmt;
    }

    function _transfer(
        address _token,
        uint256 _amount,
        address _receiver
    ) private {
        if (_token == address(0)) {
            // Take Fee.
            {
                (bool sendSuccess, bytes memory sendRes) = payable(_receiver)
                    .call{value: _amount}("");
                require(
                    sendSuccess,
                    string(
                        bytes("Native Transfer Failed: ").concat(
                            bytes(sendRes.getRevertMsg())
                        )
                    )
                );
            }
        } else {
            IERC20(_token).safeTransfer(_receiver, _amount);
        }
    }
}
