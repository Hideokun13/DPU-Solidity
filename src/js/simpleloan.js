const WEB3_URL = 'ws://localhost:8545/';
//Global variable
let web3, accounts, balances, txCounts, borrowIndex, payerIndex, payer;
let owner, contractAddress, debts;
let simpleLoan;
const DEFAULT_OPTION = -1;

async function init() {
    let provider;
    if(WEB3_URL.startsWith('ws')){
        provider = new Web3.providers.WebsocketProvider(WEB3_URL);
    }
    else{
        provider = new Web3.providers.HttpProvider(WEB3_URL);
    }
    web3 = new Web3(provider);
    accounts = await web3.eth.getAccounts()

    await deployContract();
    // await populateAccountTable();
}

async function setupBorrowButton() {
    $('#BorrowBtn').on('click', async e => {
        let borrowAmount = parseFloat($('#BorrowAmount').val());
        if(isNaN(borrowAmount) || typeof payer == 'undefined')
            return;
        const amount = web3.utils.toWei(borrowAmount, 'ether');
        try {
            const estGas = await simpleLoan.borrow.estimateGas(amount, {from: payer});
            const sendingGas = Math.round(estGas * 1.5);
            const reciept = await simpleLoan.borrow(amount, {from: payer, gas: sendingGas});
            updateBorrowLog(reciept);
            await getLoanInfo();
            await populateAccountTable();
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

async function setupPaybackButton() {
    $('#PaybackBtn').on('click', async e => {
        let paybackAmount = parseFloat($('#PaybackAmount').val());
        if(isNaN(paybackAmount) || typeof payer == 'undefined')
            return;
        const amount = web3.utils.toWei(paybackAmount, 'ether');
        try {
            const estGas = await simpleLoan.payback.estimateGas(amount, {from: payer});
            const sendingGas = Math.round(estGas * 1.5);
            const reciept = await simpleLoan.borrow(amount, {from: payer, gas: sendingGas});
            updatePaybackLog(reciept);
            await getLoanInfo();
            await populateAccountTable();
        } catch (err) {
            console.log(err);
            alert('Unable to payback');
            return;
        } finally {
            resetPaybackControl();
        }
    });
}

function resetPaybackControl() {
    $('#PaybackAmount').val('');
    $('PaybackBorrowers').val(-1);
}

function updatePaybackLog(reciept) {
    const logEntry = 
    '<li><p>TxHash:' + reciept.transtactionHash + '</p>' +
    '<p>BlockNumber:' + reciept.blockNumber + '</p>'  +
    '<p>Payer:' + reciept.from + '</p>' +
    '<p>Gas used:' + reciept.cumulativeGasUsed + '</p>' +
    '</li>';
    $('#PaybackTxLog').append(logEntry);
}

async function setupEventListener(){
    simpleLoan.Deposited().on('data', e => {
        const dateTime = (new Date(e.returnValues.time * 1000)).toLocaleString();
        const amountEther = web3.utils.fromWei(e.returnValues.amount, 'ether');
        const html = '<li class="lead">[Deposited]: Owner has deposited ' + amountEther + 'Ether at ' + dateTime + '</li>';
        $('#EventLog').append(html);
    });
    simpleLoan.InterestRateChanged().on('data', e => {
        const dateTime = (new Date(e.returnValues.time * 1000)).toLocaleString();
        const newRate = e.returnValues.newRate;
        const html = '<li class="lead">[InterestRateChanged]: Interest has changed to ' + newRate + '% at '  + dateTime + '</li>';
        $('#EventLog').append(html);
    });
    simpleLoan.Borrowed().on('data', e => {
        const dateTime = (new Date(e.returnValues.time * 1000)).toLocaleString();
        const amountEther = web3.utils.fromWei(e.returnValues.amount, 'ether');
        const borrower = e.returnValues.borrower;
        const html = '<li class="lead">[Borrowed]: Borrower(' + borrower + ') has borrowed ' + amountEther + 'Ether at ' + dateTime + '</li>';
        $('#EventLog').append(html);
    });
    simpleLoan.Paybacked().on('data', e => {
        const dateTime = (new Date(e.returnValues.time * 1000)).toLocaleString();
        const amountEther = web3.utils.fromWei(e.returnValues.amount, 'ether');
        const borrower = e.returnValues.borrower;
        const remainingEther = web3.utils.fromWei(e.returnValues.remaining, 'ether');
        const html = '<li class="lead">[Paybacked]: Borrower(' + borrower + ') has repaid ' + amountEther + 'Ether(' + remainingEther +' Ether remaining) at' + dateTime + '</li>';
        $('#EventLog').append(html);
    });
    simpleLoan.DebtCleared().on('data', e => {
        const dateTime = (new Date(e.returnValues.time * 1000)).toLocaleString();
        const amountEther = web3.utils.fromWei(e.returnValues.amount, 'ether');
        const borrower = e.returnValues.borrower;
        const html = '<li class="lead">[Borrowed]: Borrower(' + borrower + ') has repaid all debt at' + dateTime + '</li>';
        $('#EventLog').append(html);
    });
    simpleLoan.Withdrawn().on('data', e => {
        const dateTime = (new Date(e.returnValues.time * 1000)).toLocaleString();
        const amountEther = web3.utils.fromWei(e.returnValues.amount, 'ether');
        const html = '<li class="lead">[Withdrawn]: Owner has withdrawn ' + amountEther + 'Ether at ' + dateTime + '</li>';
        $('#EventLog').append(html);
    });
    simpleLoan.ClosedDown().on('data', e => {
        const dateTime = (new Date(e.returnValues.time * 1000)).toLocaleString();
        const html = '<li class="lead">[ClosedDown]: Simple Loan Contract is Destroyed at' + dateTime + '</li>';
        $('#EventLog').append(html);
    });
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
        payer =  accounts[borrowIndex];
        console.log('Borrowers', payer);
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
            await setupBorrowButton();
            await setupPaybackButton();
            await setupEventListener();
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