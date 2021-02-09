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
        return Util.calculateHash(this.height + this.timestamp + JSON.stringify(this.transactions) + this.minter + this.difficulty + this.prevHash)
    }
}

module.exports = Block
