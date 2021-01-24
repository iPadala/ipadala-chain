const { BigNumber } = require('bignumber.js')
const Util = require('./util')
const config = require('../config')

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
                    this._p2pServer.broadcast(Util.events().CLEAR_TRANSACTION_POOL, null)
                    const block = new this._block({
                        height,
                        timestamp,
                        transactions,
                        minter: address,
                        difficulty,
                        prevHash
                    })
                    this._blockchain.addNewBlock(block)
                    this._p2pServer.syncChains()
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

module.exports = Minter
