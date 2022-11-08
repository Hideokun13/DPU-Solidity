const WEB3_URL = 'http://localhost:9545/';
//Global variable
let web3, accounts, balances, txCounts;
let owner, contractAddress, debts;
let simpleLoan;
const DEFAULT_OPTION = -1;

async function init() {
    const provider = new Web3.providers.HttpProvider(WEB3_URL);
    web3 = new Web3(provider);

    await populateAccountTable();
    await deployContract();
}

async function deployContract() {
    $.getJSON('SimpleLoan.json', async contractABI => {
        const contract = TruffleContract(contractABI);
        contract.setProvider(web3.currentProvider);
        try {
            simpleLoan = await contract.deployed();
            contractAddress = simpleLoan.address;
            console.log('simple loan contract',simpleLoan);
        } catch (err) {
            console.log(err);
        }
    })
}
async function populateAccountTable() {
    try {
        accounts = await web3.eth.getAccounts();
        await getBalances();
        if(Array.isArray(accounts) && accounts.length > 0){
            let htmlStr = '';
            for(let i = 0; i < accounts.length; i++){
                const balanceEth = await web3.utils.fromWei(balances[i], 'ether');
                htmlStr += '<tr>';
                htmlStr += '<th scope="row">' + (i + 1) + '</th>';
                htmlStr += '<td>' + accounts[i] + '</td>';
                htmlStr += '<td>' + Number(balanceEth).toFixed(8) + '</td>';
                htmlStr += '<td>' + '' + '</td>';
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