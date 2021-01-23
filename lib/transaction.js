const Util = require('./util')

class Transaction {
    static createTransaction (wallet, receiver, amount) {
        const tx = { sender: wallet.address, receiver, amount }
        if (wallet.balance < tx.amount) throw Error('Not enough balance')
        tx.timestamp = Util.getCurrentTimestamp()
        tx.hash = Util.calculateHash(tx)
        tx.signature = Util.signData(wallet.secret, tx.hash)
        return tx
    }

    static verifyTransaction (transaction) {
        return Util.verifySignature(transaction.sender, transaction.signature, transaction.hash)
    }
}

module.exports = Transaction
