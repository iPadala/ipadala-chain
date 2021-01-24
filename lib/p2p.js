const server = require('http').createServer()
const io = require('socket.io')(server)
const client = require('socket.io-client')

const Utils = require('./util')

class P2pServer {
    constructor (blockchain, transactionPool) {
        this._blockchain = blockchain
        this._transactionPool = transactionPool
        this._peers = []
    }

    init (port) {
        server.listen(port, () => console.log('Listening p2p on port: ', port))
        io.on('connection', (socket) => {
            console.log('New peer from', socket.id)
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
        this.syncTransactionPool()
    }

    initListeners (socket) {
        socket.on('disconnect', () => {
            this.removePeer(socket)
        })
        socket.on(Utils.events().NEW_TRANSACTION, (transaction) => {
            this._transactionPool.updateOrAddTransaction(transaction)
        })
        socket.on(Utils.events().SYNC_TRANSACTION_POOL, (transactions) => {
            this._transactionPool.syncTransactions(transactions)
        })
        socket.on(Utils.events().SYNC_BLOCKCHAIN, (chain) => {
            this._blockchain.replaceChain(chain)
        })
        socket.on(Utils.events().CLEAR_TRANSACTION_POOL, () => {
            this._transactionPool.clear()
        })
    }

    connectToPeer (peer) {
        const socket = client.io(peer)
        socket.on('connect', () => {
            console.log('Connected to ', peer)
            this.initPeer(socket)
        })
    }

    syncChains () {
        this.broadcast(Utils.events().SYNC_BLOCKCHAIN, this._blockchain._chain)
    }

    syncTransactionPool () {
        this.broadcast(Utils.events().SYNC_TRANSACTION_POOL, this._transactionPool.transactions)
    }
}

module.exports = P2pServer
