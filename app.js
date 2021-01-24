const bodyParser = require('body-parser')
const express = require('express')

const { Block, Blockchain } = require('./lib/blockchain')
const Transaction = require('./lib/transaction')
const TransactionPool = require('./lib/transactionPool')
const Wallet = require('./lib/wallet')
const P2pServer = require('./lib/p2p')
const Minter = require('./lib/minter')
const Util = require('./lib/util')
const catchAsync = require('./lib/catchAsync')

const blockchain = new Blockchain()
const transactionPool = new TransactionPool()
const p2p = new P2pServer(blockchain, transactionPool)
const wallet = new Wallet(blockchain)

const config = require('./config')

const initHttpServer = (port) => {
    const app = express()
    app.use(bodyParser.json())

    // GET
    app.get('/blocks', catchAsync((req, res) => {
        res.send(blockchain._chain)
    }))

    app.get('/blocks/latest', catchAsync((req, res) => {
        res.send(blockchain.getLatestBlock())
    }))

    app.get('/blocks/:id', catchAsync((req, res) => {
        res.send(blockchain.getBlockByHash(req.params.id))
    }))

    app.get('/transactions', catchAsync((req, res) => {
        return res.json(transactionPool.validTransactions())
    }))

    app.get('/transaction/:id', catchAsync((req, res) => {
        const inBlock = blockchain.getTransactionByHash(req.params.id)
        const inPool = transactionPool.getTransactionByHash(req.params.id)
        let tx = { error: 'Transaction not found.' }
        if (Object.entries(inBlock).length > 0) {
            inBlock.confirmation = blockchain.getLatestBlock().height - blockchain.getBlockByHeight(inBlock.block).height
            tx = inBlock
        }
        if (Object.entries(inPool).length > 0) {
            inPool.confirmation = 0
            tx = inPool
        }
        return res.json(tx)
    }))

    app.get('/address/:id', catchAsync((req, res) => {
        const balanceInfo = wallet.getBalanceInfo(req.params.id)
        res.send({
            balance: balanceInfo.received - balanceInfo.sent,
            received: balanceInfo.received,
            sent: balanceInfo.sent,
            transactions: blockchain.getTransactionsByAddress(req.params.id)
        })
    }))

    app.get('/createWallet', catchAsync((req, res) => {
        res.send(wallet.createWallet())
    }))

    app.get('/walletBalance', catchAsync((req, res) => {
        res.send({ balance: wallet.getBalance(wallet._wallet.address) })
    }))

    app.get('/walletInfo', catchAsync((req, res) => {
        res.send(wallet.getWallet())
    }))

    // POST

    app.post('/transaction', catchAsync((req, res) => {
        const { address, amount, secret } = req.body
        if (!address) throw Error('Missing receiving address')
        if (!amount) throw Error('Missing amount')
        let txWallet = wallet.getWallet()
        if (secret) txWallet = Wallet.getWalletInfoBySecret(secret)
        if (txWallet === null) throw Error('No wallet specified')
        if (transactionPool.hasExistingTransaction(txWallet.address)) throw Error('Double spend detected')
        const tx = Transaction.createTransaction(txWallet, address, amount)
        if (!Transaction.verifyTransaction(tx)) throw Error('Invalid transaction ' + tx)
        transactionPool.updateOrAddTransaction(tx)
        p2p.broadcast(Util.events().NEW_TRANSACTION, tx)
        res.send(tx)
    }))

    app.post('/mint', catchAsync((req, res) => {
        const { address } = req.body
        if (!address) throw Error('Missing receiving address')
        const minter = new Minter(Block, blockchain, transactionPool, { address, balance: wallet.getBalance(address) }, p2p)
        const block = minter.mint()
        if (!block) throw Error('No blocks minted')
        p2p.broadcast(Util.events().NEW_BLOCK, block)
        res.send(block)
    }))

    app.post('/peers', catchAsync((req, res) => {
        const { host, port } = req.body
        if (!host) throw Error('Missing host')
        if (!port) throw Error('Missing port')
        p2p.connectToPeer(`http://${host}:${port}`)
        res.status(201).end()
    }))

    app.use((err, req, res, next) => {
        if (err) {
            console.log(err)
            res.status(400).send({ error: err.message })
        }
    })

    // PUT

    app.put('/setWallet', (req, res) => {
        const { secret } = req.body
        if (!secret) throw Error('Missing secret')
        Util.writeFile(config.BLOCK_WALLET, JSON.stringify(Wallet.getWalletInfoBySecret(secret)), (err) => {
            if (err) throw err
            wallet.setWallet(Wallet.getWalletInfoBySecret(secret))
        })
        res.status(201).end()
    })

    app.listen(port, () => {
        console.log('Listening http on port: ' + port)
    })
}
if (config.BLOCK_WALLET !== null) {
    Util.readFile(config.BLOCK_WALLET, (err, data) => {
        if (err) throw err
        wallet.setWallet(data)
        console.log('Wallet file set:', config.BLOCK_WALLET)
    })
}
console.log('Minting enabled:', config.MINTING_ENABLED)
p2p.init(config.P2P_PORT)
initHttpServer(config.API_PORT)
