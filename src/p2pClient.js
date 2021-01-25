const P2P = require('socket.io-p2p')
const client = require('socket.io-client')

const events = require('./config/events')

class P2pClient {
    constructor (blockchain, transactionPool) {
        this._blockchain = blockchain
        this._transactionPool = transactionPool
        this._peers = []
    }

    connectToPeer (peer) {
        const socket = client.io(peer)
        const p2p = new P2P(socket)
        p2p.on('connect', () => {
            console.log('Connected to ', peer)
            this.initPeer(p2p)
        })
    }

    broadcast (event, data) {
        this.getPeers().forEach((socket) => {
            socket.emit(event, data)
        })
    }

    addPeer (socket) {
        this._peers.push(socket)
    }

    getPeers () {
        return this._peers
    }

    removePeer (socket) {
        this._peers.splice(this._peers.indexOf(socket), 1)
    }

    initPeer (socket) {
        this.addPeer(socket)
        this.initListeners(socket)
        this.getChains()
        this.getTransactionPool()
    }

    initListeners (socket) {
        socket.on('disconnect', () => {
            this.removePeer(socket)
        })
        socket.on(events.NEW_TRANSACTION, (transaction) => {
            this._transactionPool.updateOrAddTransaction(transaction)
        })
        socket.on(events.SET_TRANSACTION_POOL, (transactions) => {
            this._transactionPool.syncTransactions(transactions)
        })
        socket.on(events.SET_BLOCKCHAIN, (chain) => {
            this._blockchain.replaceChain(chain)
        })
        socket.on(events.GET_TRANSACTION_POOL, () => {
            socket.emit(events.SET_TRANSACTION_POOL, this._transactionPool.transactions)
        })
        socket.on(events.GET_BLOCKCHAIN, () => {
            socket.emit(events.SET_BLOCKCHAIN, this._blockchain._chain)
        })
        socket.on(events.CLEAR_TRANSACTION_POOL, () => {
            this._transactionPool.clear()
        })
    }

    setChains () {
        this.broadcast(events.SET_BLOCKCHAIN, this._blockchain._chain)
    }

    setTransactionPool () {
        this.broadcast(events.SET_TRANSACTION_POOL, this._transactionPool.transactions)
    }

    getChains () {
        this.broadcast(events.GET_BLOCKCHAIN)
    }

    getTransactionPool () {
        this.broadcast(events.GET_TRANSACTION_POOL)
    }
}

module.exports = P2pClient
