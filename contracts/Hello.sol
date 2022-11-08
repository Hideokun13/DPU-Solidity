// SPDX-License-Identifier: SEE LICENSE IN LICENSE
pragma solidity >=0.8.0;

contract Hello {
    //uint8 myValue; Private Value
    uint8 public myValue; // Public Value

    function increase() public returns (uint8) {
        myValue++;

        return myValue;
    }

    function decrease() public returns (uint8) {
        myValue--;

        return myValue;
    }

    function setValue(uint8 newValue) public {
        myValue = newValue;
    }

    function getValue() public view returns (uint8){
        return myValue;
    }
}