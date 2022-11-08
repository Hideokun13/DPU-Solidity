// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

contract Ownable {
    address private owner;
    event OwnerSet(address indexed oldOwner, address indexed newOwner);
    constructor() {
        owner = msg.sender;
        emit OwnerSet(address(0), owner);
    }

    modifier isOwner {
        require(msg.sender == owner, "Caller is not owner");
        _;
    }

    function changeOwner(address newOwner) public isOwner {
        emit OwnerSet(owner, newOwner);
        owner = newOwner;
        
    }

    function getOwner() public view returns (address) {
        return owner;
    }
}