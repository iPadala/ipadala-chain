const client = require('socket.io-client')

const events = require('./config/events')

class P2pClient {
    constructor (blockchain, transactionPool) {
        this._blockchain = blockchain
        this._transactionPool = transactionPool
        this._peers = []
        this._function = null
    }

    connectToPeer (peer) {
        const socket = client.io(peer)
        socket.on('connect', () => {
            console.log('Connected to', peer)
            this.initPeer(socket)
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
            this._transactionPool.syncTransactions(transaction)
            if (this._function) this._function()
        })
        socket.on(events.SET_TRANSACTION_POOL, (transactions) => {
            this._transactionPool.syncTransactions(transactions)
            if (this._function) this._function()
        })
        socket.on(events.SET_BLOCKCHAIN, (chain) => {
            console.log('Received chain from', socket.io.engine.hostname + ':' + socket.io.engine.port, 'at height:', chain[chain.length - 1].height)
            this._blockchain.replaceChain(chain)
            if (this._function) this._function()
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
        socket.on(events.NEW_BLOCK, (block) => {
            console.log('Received new block at height:', block.height)
            this._blockchain.addNewBlock(block)
            this._blockchain.replaceChain(this._blockchain._chain)
            if (this._function) this._function()
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

    setFunction (func) {
        this._function = func
    }
}

module.exports = P2pClient
