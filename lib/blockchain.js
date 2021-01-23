const genesisConfig = require('../config/genesis')
const Util = require('./util')

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

    addNewBlock (block) {
        if (!this.isValidBlock(block)) return null
        this._chain.push(block)
        return block
    }

    isValidBlock (block) {
        const latestBlock = this.getLatestBlock()
        if (latestBlock.hash !== block.prevHash) return false
        if (block.hash !== block.calculateBlockHash()) return false
        return block.transactions.length > 0
    }

    isValidChain () {
        if (JSON.stringify(this._chain[0]) !== JSON.stringify(this.genesisBlock())) return false

        for (let i = 1; i < this._chain.length; i++) {
            const block = this._chain[i]
            const lastBlock = this._chain[i - 1]
            if (block.prevHash !== lastBlock.hash || block.hash !== block.calculateBlockHash()) return false
        }
        return true
    }

    replaceChain (newChain) {
        if (newChain.length <= this._chain.length) return
        if (!this.isValidChain(newChain)) return
        this._chain = newChain
    }
}

module.exports = {
    Block,
    Blockchain
}
