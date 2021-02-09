const Util = require('./util')

class Transaction {
    static createTransaction (wallet, receiver, amount, reference = '') {
        const tx = { sender: wallet.address, receiver, amount: parseFloat(amount) }
        if (typeof tx.amount !== 'number' || isNaN(tx.amount)) throw Error('Amount must be a decimal number')
        if (tx.amount <= 0) throw Error('Amount must be more than zero')
        if (wallet.balance < tx.amount) throw Error('Not enough balance')
        if (!Util.validateAddress(tx.receiver)) throw Error('Invalid receiver address')
        if (!Util.validateAddress(tx.sender)) throw Error('Invalid sender address')
        tx.reference = reference
        tx.timestamp = Util.getCurrentTimestamp()
        tx.id = Util.generateId()
        const hash = Util.calculateHash(JSON.stringify(tx))
        tx.signature = Util.signData(wallet.secret, hash)
        tx.hash = hash
        return tx
    }

    static verifyTransaction (transaction) {
        return Util.verifySignature(transaction.sender, transaction.signature, transaction.hash)
    }
}

module.exports = Transaction
