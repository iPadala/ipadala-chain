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
        p2p.on('ready', () => {
            console.log('Connected to ', peer)
            p2p.usePeerConnection = true
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
            console.log('Received chain from', socket.peerId, 'at height:', chain[chain.length - 1].height)
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
        socket.on(events.NEW_BLOCK, (block) => {
            console.log('Received new block at height:', block.height)
            this._blockchain.addNewBlock(block)
            this._blockchain.replaceChain(this._blockchain._chain)
            this.broadcast(events.NEW_BLOCK, block)
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
