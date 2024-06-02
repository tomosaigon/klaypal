// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "@openzeppelin/contracts/utils/cryptography/ECDSA.sol";
import "@openzeppelin/contracts/utils/cryptography/EIP712.sol";

contract TelegramBotVault is EIP712 {
    using ECDSA for bytes32;

    mapping(address => uint256) private balances;
    mapping(address => uint256) public nonces;
    address public secondSigner;

    bytes32 private constant _TYPEHASH = keccak256("Transfer(address sender,address recipient,uint256 amount,uint256 nonce)");

    // Event to log deposits
    event Deposit(address indexed user, uint256 amount);
    event TransferRequested(address indexed from, address indexed to, uint256 amount);

    constructor(address _secondSigner) EIP712("TelegramBotVault", "1") {
        require(_secondSigner != address(0), "Second signer address cannot be zero");
        secondSigner = _secondSigner;
    }

    // Function to deposit ether
    function deposit(address _to) external payable {
        require(msg.value > 0, "Deposit amount must be greater than zero");
        
        balances[_to] += msg.value;

        emit Deposit(_to, msg.value);
    }

    function getBalance(address _account) external view returns (uint256) {
        return balances[_account];
    }

    function transfer(address _to, uint256 _amount, uint256 _nonce, bytes memory _signature) external {
        require(_amount > 0, "Transfer amount must be greater than zero");
        require(balances[msg.sender] >= _amount, "Insufficient balance");
        require(nonces[msg.sender] == _nonce, "Invalid nonce");

        // Verify the secondSigner signature
        bytes32 structHash = keccak256(abi.encode(_TYPEHASH, msg.sender, _to, _amount, _nonce));
        bytes32 hash = _hashTypedDataV4(structHash);
        address recoveredAddress = ECDSA.recover(hash, _signature);
        require(recoveredAddress == secondSigner, "Invalid second signer signature");

        // Update before making the external call
        nonces[msg.sender]++;
        balances[msg.sender] -= _amount;
        
        (bool success, ) = _to.call{value: _amount}("");
        require(success, "Transfer failed");

        emit TransferRequested(msg.sender, _to, _amount);
    }
}
