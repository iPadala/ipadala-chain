const Transaction = require('./transaction')

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

    hasExistingTransaction (address) {
        return this.transactions.find(tx => {
            return tx.sender === address
        })
    }

    validTransactions () {
        return this.transactions.filter(transaction => {
            const outputTotal = transaction.reduce((total, output) => {
                return total + output.amount
            }, 0)

            if (transaction.amount !== outputTotal) {
                return console.log(`Invalid transaction: ${transaction.hash}`)
            }

            if (!Transaction.verifyTransaction(transaction)) {
                return console.log(`Invalid transaction signature: ${transaction.hash}`)
            }
            return transaction
        })
    }

    clear () {
        this.transactions = []
    }
}

module.exports = TransactionPool
