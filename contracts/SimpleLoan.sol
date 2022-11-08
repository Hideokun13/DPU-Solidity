// SPDX-License-Identifier: MIT
pragma solidity >=0.8.0;

contract SimpleLoan {
    address payable owner;
    struct DebtInfo {
        uint balance;
        uint lastBorrowed; //Collect time of last borrowing (block.timestamp)
    }
    mapping(address => DebtInfo) public debts; //Debt Table
    uint public interestRateNumerator;
    uint public interestRateDenominator;
    uint public constant DEFAULT_INTEREST_NUMERATOR = 1;
    uint public constant DEFAULT_INTEREST_DENOMINATOR = 10;
    uint public constant PAYBACK_PERIOD = 60 * 60 * 24 * 7; // 7 Days

    address[] public borrowers;
    bool active;

    constructor(){
        owner = payable(msg.sender);
        interestRateNumerator = DEFAULT_INTEREST_NUMERATOR;
        interestRateDenominator = DEFAULT_INTEREST_DENOMINATOR;
        active = true;
    }

    modifier onlyOwner {
        require(msg.sender == owner, "Only owner allowed");
        _;
    }

    modifier notAnOwner {
        require(msg.sender != owner, "Owner not allowed");
        _;
    }

    modifier whenActive {
        require(active, "Contract is not active");
        _;
    }

    event Deposited(uint time, uint amount, uint balance);

    function deposit() public payable onlyOwner whenActive {
        emit Deposited(block.timestamp, msg.value, address(this).balance);
    }

    event InterestRateChanged(uint time, uint newRate);

    function setInterestRate(uint numerator) public onlyOwner whenActive {
        require (numerator > 0, "Invalid interest rate");
        interestRateNumerator = numerator;
        interestRateDenominator = 100;
        emit InterestRateChanged(block.timestamp, numerator);
    }

    event Borrowed(uint time, uint amount, uint interest, address borrower);

    function borrow(uint amount) external notAnOwner whenActive {
        require(address(this).balance >= amount, "Not enough balance");
        uint interest = (amount * interestRateNumerator / interestRateDenominator);
        uint debt = amount + interest;
        if(debts[msg.sender].balance == 0){
            borrowers.push(msg.sender);
            debts[msg.sender] = DebtInfo(0,0);
        }
        debts[msg.sender].balance += debt;
        debts[msg.sender].lastBorrowed = block.timestamp;
        payable(msg.sender).transfer(amount);
        emit Borrowed(block.timestamp, amount, interest, msg.sender);
    }
    event Paybacked(uint time, uint amount, uint remaining, address borrower);
    event LatePaybacked(uint time, uint amount, uint remaining, address borrower, uint period);
    event DebtCleared(uint time, address borrower);
    function payback() external payable notAnOwner whenActive {
        require(msg.value <= debts[msg.sender].balance, "Overpaid not allowed");
        debts[msg.sender].balance -= msg.value;
        if(block.timestamp - debts[msg.sender].lastBorrowed < PAYBACK_PERIOD){
            emit Paybacked(block.timestamp, msg.value, debts[msg.sender].balance, msg.sender);
        }
        else {
            emit LatePaybacked(block.timestamp, msg.value, debts[msg.sender].balance, msg.sender, 
                block.timestamp - debts[msg.sender].lastBorrowed - PAYBACK_PERIOD);
        }
        if(debts[msg.sender].balance == 0){
            for(uint i = 0; i < borrowers.length; i++){
                if(borrowers[i] == msg.sender){
                    delete borrowers[i];
                    delete debts[msg.sender];
                    emit DebtCleared(block.timestamp, msg.sender);
                    break;
                }
            }
        }
    }

    event Withdrawn(uint time, uint amount);
    function withdraw(uint amount) external onlyOwner whenActive {
        require(amount <= address(this).balance, "Not enought balance");
        owner.transfer(amount);
        emit Withdrawn(block.timestamp, amount);
    }
    event ClosedDown(uint time);
    function closeDown() external onlyOwner whenActive {
        require(borrowers.length == 0, "Cannot close due existing borrowers");
        active = false;
        emit ClosedDown(block.timestamp);
        selfdestruct(owner);
    }
}