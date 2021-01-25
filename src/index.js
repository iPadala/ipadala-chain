const CryptoJs = require('crypto-js')
const moment = require('moment')
const EC = require('elliptic').ec
const ec = new EC('secp256k1')
const fs = require('fs')
const { BigNumber } = require('bignumber.js')

const config = require('./config')
const genesisConfig = require('./config/genesis')
const events = require('./config/events')

class Util {
    static genKeyPair () {
        return ec.genKeyPair()
    }

    static calculateHash (data) {
        return CryptoJs.SHA256(data).toString()
    }

    static verifySignature (address, signature, data) {
        return ec.keyFromPublic(address, 'hex').verify(data, signature)
    }

    static signData (secret, data) {
        return ec.keyFromPrivate(secret, 'hex').sign(data).toDER('hex')
    }

    static getKeyPair (secret) {
        return ec.keyFromPrivate(secret, 'hex')
    }

    static getCurrentTimestamp () {
        return moment().unix()
    }

    static readFile (file, cb) {
        if (fs.existsSync(file)) return fs.readFile(file, 'utf8', cb)
        return null
    }

    static writeFile (file, data, cb) {
        if (fs.existsSync(file)) return fs.writeFile(file, data, cb)
        return null
    }

    static validateAddress (address) {
        if (address.length !== 130) return false
        if (address.match('^[a-fA-F0-9]+$') === null) return false
        return address.startsWith('04')
    }
}

class Block {
    constructor ({ height, timestamp, transactions = [], minter, difficulty, prevHash = '' }) {
        this.height = height
        this.timestamp = timestamp
        this.transactions = transactions
        this.minter = minter
        this.difficulty = difficulty
        this.prevHash = prevHash
        this.hash = this.calculateBlockHash()
    }

    calculateBlockHash () {
        return Util.calculateHash(this.height + this.timestamp + this.transactions + this.minter + this.difficulty + this.prevHash)
    }
}

class Blockchain {
    constructor () {
        this._chain = [this.genesisBlock()]
    }

    genesisBlock () {
        return new Block(genesisConfig)
    }

    getChainBlocks () {
        return this._chain
    }

    getLatestBlock () {
        return this._chain[this._chain.length - 1]
    }

    getBlockByHash (hash) {
        return this._chain.filter((block) => block.hash === hash)
    }

    getBlockByHeight (height) {
        let block = {}
        this._chain.forEach((b) => {
            if (b.height === height) {
                block = b
            }
        })
        return block
    }

    getTransactionByHash (hash) {
        let list = {}
        this._chain.forEach((block) => {
            block.transactions.forEach((tx) => {
                if (tx.hash === hash) {
                    tx.block = block.height
                    list = tx
                }
            })
        })
        return list
    }

    getTransactionsByAddress (address) {
        const list = []
        this._chain.forEach((block) => {
            block.transactions.forEach((tx) => {
                if (tx.receiver === address || tx.sender === address) {
                    tx.block = block.height
                    tx.confirmation = this.getLatestBlock().height - block.height
                    list.push(tx)
                }
            })
        })
        list.sort((a, b) => {
            if (a < b) return -1
            if (a > b) return 1
            return 0
        })
        return list
    }

    addNewBlock (block) {
        if (!this.isValidBlock(block)) return null
        this._chain.push(block)
        return block
    }

    isValidBlock (block) {
        const latestBlock = this.getLatestBlock()
        if (latestBlock.hash !== block.prevHash) return false
        if (block.hash !== Util.calculateHash(block.height + block.timestamp + block.transactions + block.minter + block.difficulty + block.prevHash)) return false
        return block.transactions.length > 0
    }

    isValidChain () {
        if (JSON.stringify(this._chain[0]) !== JSON.stringify(this.genesisBlock())) return false

        for (let i = 1; i < this._chain.length; i++) {
            const block = this._chain[i]
            const lastBlock = this._chain[i - 1]
            if (block.prevHash !== lastBlock.hash || block.hash !== Util.calculateHash(block.height + block.timestamp + block.transactions + block.minter + block.difficulty + block.prevHash)) return false
        }
        return true
    }

    replaceChain (newChain) {
        if (newChain.length <= this._chain.length) return
        if (!this.isValidChain(newChain)) return
        this._chain = newChain
    }
}

class Transaction {
    static createTransaction (wallet, receiver, amount) {
        const tx = { sender: wallet.address, receiver, amount: parseFloat(amount) }
        if (typeof tx.amount !== 'number' || isNaN(tx.amount)) throw Error('Amount must be a decimal number')
        if (tx.amount <= 0) throw Error('Amount must be more than zero')
        if (wallet.balance < tx.amount) throw Error('Not enough balance')
        if (!Util.validateAddress(tx.receiver)) throw Error('Invalid receiver address')
        if (!Util.validateAddress(tx.sender)) throw Error('Invalid sender address')
        tx.timestamp = Util.getCurrentTimestamp()
        tx.hash = Util.calculateHash(tx)
        tx.signature = Util.signData(wallet.secret, tx.hash)
        return tx
    }

    static verifyTransaction (transaction) {
        return Util.verifySignature(transaction.sender, transaction.signature, transaction.hash)
    }
}

class TransactionPool {
    constructor () {
        this.transactions = []
    }

    updateOrAddTransaction (transaction) {
        const transactionWithHash = this.transactions.find(t => t.hash === transaction.hash)
        if (transactionWithHash) {
            this.transactions[this.transactions.indexOf(transactionWithHash)] = transaction
        } else {
            this.transactions.push(transaction)
        }
    }

    syncTransactions (transactions) {
        transactions.forEach((transaction) => {
            this.updateOrAddTransaction(transaction)
        })
    }

    hasExistingTransaction (address) {
        return this.transactions.find(tx => {
            return tx.sender === address
        })
    }

    validTransactions () {
        return this.transactions.filter(transaction => {
            if (transaction.amount <= 0) {
                return console.log(`Invalid transaction: ${transaction.hash}`)
            }

            if (!Transaction.verifyTransaction(transaction)) {
                return console.log(`Invalid transaction signature: ${transaction.hash}`)
            }
            return transaction
        })
    }

    getTransactionByHash (hash) {
        let list = {}
        this.transactions.forEach((block) => {
            block.transactions.forEach((tx) => {
                if (tx.hash === hash) {
                    tx.block = block.height
                    list = tx
                }
            })
        })
        return list
    }

    clear () {
        this.transactions = []
    }
}

class Wallet {
    constructor (blockchain) {
        this._blockchain = blockchain
        this._keyPair = Util.genKeyPair()
        this._wallet = null
    }

    createWallet () {
        const address = this._keyPair.getPublic('hex')
        const secret = this._keyPair.getPrivate('hex')
        return {
            address,
            secret
        }
    }

    getBalance (address) {
        let balance = 0
        this._blockchain._chain.forEach((block) => {
            block.transactions.forEach((tx) => {
                if (tx.receiver === address) {
                    balance += tx.amount
                } else if (tx.sender === address) balance -= tx.amount
            })
        })
        return balance
    }

    getBalanceInfo (address) {
        let sent = 0
        let received = 0
        this._blockchain._chain.forEach((block) => {
            block.transactions.forEach((tx) => {
                if (tx.receiver === address) {
                    received += tx.amount
                } else if (tx.sender === address) sent += tx.amount
            })
        })
        return { sent, received }
    }

    setWallet (wallet) {
        if (wallet.length === 0) return null
        try {
            wallet = JSON.parse(wallet)
            if (!wallet.address || !wallet.secret) return null
            this._wallet = wallet
        } catch (e) {
            return null
        }
    }

    getWallet () {
        return this._wallet
    }

    static getWalletInfoBySecret (secret) {
        if (!secret) return null
        return {
            address: Util.getKeyPair(secret).getPublic('hex'),
            secret
        }
    }
}

class Minter {
    constructor (block, blockchain, transactionPool, wallet, p2pServer) {
        this._block = block
        this._blockchain = blockchain
        this._transactionPool = transactionPool
        this._wallet = wallet
        this._p2pServer = p2pServer
    }

    mint () {
        if (!config.MINTING_ENABLED) return null
        let pastTimestamp = 0
        const latestBlock = this._blockchain.getLatestBlock()
        const height = latestBlock.height + 1
        const prevHash = latestBlock.hash
        const transactions = this._transactionPool.validTransactions()
        const difficulty = this.getDifficulty()
        const address = this._wallet.address
        const balance = this._wallet.balance
        if (transactions.length <= 0) return null
        if (balance <= 0 && !config.ALLOW_ZERO_BALANCE_MINTER) return null

        while (true) {
            const timestamp = Util.getCurrentTimestamp()
            if (pastTimestamp !== timestamp) {
                pastTimestamp = timestamp
                if (this.isValidMinter(height, timestamp, address, balance, difficulty, prevHash)) {
                    this._transactionPool.clear()
                    this._p2pServer.broadcast(events.CLEAR_TRANSACTION_POOL, null)
                    const block = new this._block({
                        height,
                        timestamp,
                        transactions,
                        minter: address,
                        difficulty,
                        prevHash
                    })
                    this._blockchain.addNewBlock(block)
                    this._p2pServer.setChains()
                    return block
                }
            }
        }
    }

    isValidMinter (height, timestamp, minter, balance, difficulty, prevHash) {
        difficulty = difficulty + 1
        if (config.ALLOW_ZERO_BALANCE_MINTER) balance += 1
        const balanceOverDifficulty = new BigNumber(2).exponentiatedBy(256).times(balance).dividedBy(difficulty)
        const stakingHash = Util.calculateHash(prevHash + minter + timestamp)
        const decimalStakingHash = new BigNumber(stakingHash, 16)
        const difference = balanceOverDifficulty.minus(decimalStakingHash).toNumber()
        return difference >= 0
    }

    getDifficulty () {
        const latestBlock = this._blockchain.getLatestBlock()
        if (latestBlock.height % config.DIFFICULTY_ADJUSTMENT_INTERVAL === 0 && latestBlock.height !== 0) {
            return this.getAdjustedDifficulty(latestBlock, this._blockchain._chain)
        } else {
            return latestBlock.difficulty
        }
    }

    getAdjustedDifficulty (latestBlock, _chain) {
        const prevAdjustmentBlock = _chain[_chain.length - config.DIFFICULTY_ADJUSTMENT_INTERVAL]
        const timeExpected = config.BLOCK_GENERATION_INTERVAL * config.DIFFICULTY_ADJUSTMENT_INTERVAL
        const timeTaken = latestBlock.timestamp - prevAdjustmentBlock.timestamp
        if (timeTaken < timeExpected / 2) {
            return prevAdjustmentBlock.difficulty + 1
        } else if (timeTaken > timeExpected * 2) {
            return prevAdjustmentBlock.difficulty - 1
        } else {
            return prevAdjustmentBlock.difficulty
        }
    }
}

module.exports = {
    Util,
    Block,
    Blockchain,
    Transaction,
    TransactionPool,
    Wallet,
    Minter
}
