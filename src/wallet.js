const Util = require('./util')

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

module.exports = Wallet
