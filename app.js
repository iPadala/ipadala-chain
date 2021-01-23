const bodyParser = require('body-parser')
const express = require('express')

const { Blockchain } = require('./lib/blockchain')
const TransactionPool = require('./lib/transactionPool')
const Wallet = require('./lib/wallet')
const P2pServer = require('./lib/p2p')
const Util = require('./lib/util')

const blockchain = new Blockchain()
const transactionPool = new TransactionPool()
const p2p = new P2pServer(blockchain, transactionPool)
const wallet = new Wallet(blockchain)

const config = require('./config')

const initHttpServer = (port) => {
    const app = express()
    app.use(bodyParser.json())

    app.use((err, req, res, next) => {
        if (err) {
            res.status(400).send(err.message)
        }
    })

    app.get('/blocks', (req, res) => {
        res.send(blockchain._chain)
    })

    app.get('/createWallet', (req, res) => {
        res.send(wallet.createWallet())
    })

    app.get('/walletBalance', (req, res) => {
        res.send({ balance: wallet.getBalance(wallet._wallet.address) })
    })

    app.listen(port, () => {
        console.log('Listening http on port: ' + port)
    })
}
if (config.BLOCK_WALLET !== null) wallet.setWallet(Util.readFile(config.BLOCK_WALLET))
p2p.init(config.P2P_PORT)
initHttpServer(config.API_PORT)
