const WEB3_URL = 'http://localhost:9545/';
//Global variable
let web3, accounts, balances, txCounts, borrowIndex, payerIndex, borrower, payer;
let owner, contractAddress, debts;
let simpleLoan;
const DEFAULT_OPTION = -1;

async function init() {
    const provider = new Web3.providers.HttpProvider(WEB3_URL);
    web3 = new Web3(provider);
    accounts = await web3.eth.getAccounts()

    await deployContract();
    // await populateAccountTable();
}

async function setupBorrowButton() {
    $('#BorrowBtn').on('click', async e => {
        let borrowAmount = parseFloat($('#BorrowAmount').val());
        if(isNaN(borrowAmount) || typeof borrower == 'undefined')
            return;
        const amount = web3.utils.toWei(borrowAmount, 'ether');
        try {
            const estGas = await simpleLoan.borrow.estimateGas(amount, {from: borrower});
            const sendingGas = Math.round(estGas * 1.5);
            const reciept = await simpleLoan.borrow(amount, {from: borrower, gas: sendingGas});
            updateBorrowLog(reciept);
        } catch (err) {
            console.log(err);
            alert('Unable to borrow');
            return;
        } finally {
            resetBorrowControl();
        }
    });
}

function resetBorrowControl() {
    $('#BorrowAmount').val('');
    $('Borrowers').val(-1);
}

function updateBorrowLog(reciept) {
    const logEntry = 
    '<li><p>TxHash:' + reciept.transtactionHash + '</p>' +
    '<p>BlockNumber:' + reciept.blockNumber + '</p>'  +
    '<p>Borrower:' + reciept.from + '</p>' +
    '<p>Gas used:' + reciept.cumulativeGasUsed + '</p>' +
    '</li>';
    $('#BorrowTxLog').append(logEntry);
}

function updateSelectOptions() {
    if(!(Array.isArray(accounts) && accounts.length > 0)){
        return;
    }
    let borrowOption = '<option value="-1">Select Borrower Account</option>'
    for(let i = 1; i < accounts.length; i++){
        borrowOption += '<option value="' + i + '">' + (i + 1) + ') ' + accounts[i] + '</option>';
        $('#Borrowers').html(borrowOption);
        $('#PaybackBorrowers').html(borrowOption);
    }
    $('#Borrowers').on('change', async e => {
        borrowIndex = e.target.value;
        borrower =  accounts[borrowIndex];
        console.log('Borrowers', borrower);
    });
    
    $('#PaybackBorrowers').on('change', async e => {
        payerIndex = e.target.value;
        payer = accounts[payerIndex];
        console.log('PaybackBorrowers', payer);
    });
    
}

async function getLoanInfo() {
    owner = accounts[0];
    $('#LoanOwner').html(owner);
    $('#LoanContractAddress').html(contractAddress);
    const firstDeposit = web3.utils.toWei('20', 'ether');
    try {
        // const firstDepositBN = web3.utils.BN(firstDeposit);
        await simpleLoan.deposit({value: firstDeposit, from: owner});
        const contractBalance = await web3.eth.getBalance(contractAddress);
        $('#LoanContractBalance').html(web3.utils.fromWei(contractBalance, 'ether'));
        const borrower = await simpleLoan.getBorrowers.call();
        $('#BorrowerCount').html(borrower.length);
        const rateNumerator = await simpleLoan.interestRateNumerator.call();
        const rateDedominator = await simpleLoan.interestRateDenominator.call();
        const interestRate = Number(rateNumerator * 100 / rateDedominator).toFixed(2);
        $('#InterestRate').html(interestRate);
    } catch (err) {
        console.log(err)
    }

    // await populateAccountTable();
}

async function deployContract() {
    $.getJSON('SimpleLoan.json', async contractABI => {
        const contract = TruffleContract(contractABI);
        contract.setProvider(web3.currentProvider);
        try {
            simpleLoan = await contract.deployed();
            contractAddress = simpleLoan.address;
            console.log('simple loan contract',simpleLoan);
            await getLoanInfo();
            await populateAccountTable();
            await updateSelectOptions();
        } catch (err) {
            console.log(err);
        }
    })
}
async function getDebtsInfo() {
    const borrowers = await simpleLoan.getBorrowers.call();
    debts = await Promise.all(borrowers.map(async borrower => await simpleLoan.getDebt(borrower)));
}
async function populateAccountTable() {
    try {
        // accounts = await web3.eth.getAccounts();
        await getBalances();
        await getDebtsInfo();
        const borrowers = await simpleLoan.getBorrowers.call();
        const currentDebts = [];
        for(let i = 0; i < accounts.length; i++){
            let found = false;
            for(let j = 0; j < borrowers.length; j++){
                currentDebts[i] = web3.utils.fromWei(debts[j], 'ether');
                found = true;
                break;
            }
            if(!found)
                currentDebts[i] = 0;
        }

        if(Array.isArray(accounts) && accounts.length > 0){
            let htmlStr = '';
            for(let i = 0; i < accounts.length; i++){
                const balanceEth = await web3.utils.fromWei(balances[i], 'ether');
                htmlStr += '<tr>';
                htmlStr += '<th scope="row">' + (i + 1) + '</th>';
                htmlStr += '<td>' + accounts[i] + '</td>';
                htmlStr += '<td>' + Number(balanceEth).toFixed(8) + '</td>';
                htmlStr += '<td>' + currentDebts[i] + '</td>';
                htmlStr += '</tr>';
            }
            $('#AccountList').html(htmlStr);
        }
    } catch (err) {
        console.log(err);
    }
    
}

async function getBalances() {
    balances = await Promise.all(accounts.map(async account => await web3.eth.getBalance(account)));
    // Use For-Loop Method
    // balances = [];
    // for(let i = 0; i < accounts.length; i++){
    //     const balance = await web3.eth.getBalance(accounts[i]);
    //     balances.push(balance);
    // }
}