// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity >=0.8.0;
import "./Ownable.sol";
contract HelloEventWithOwner is Ownable {
    uint8 public myValue;
    event Increased (uint8 newValue, string message);
    event Decreased (uint8 newValue, string message);
    event ValueSet (uint8 newValue, string message);

    function increase() public {
        myValue++;
        emit Increased(myValue, "My Value's increased by 1");
    }

    function decrease() public {
        myValue--;
        emit Increased(myValue, "My Value's decreased by 1");
    }

    function setValue(uint8 newValue) public isOwner{
        myValue = newValue;
        emit Increased(myValue, "My Value's set new value with new value");
    }
}