const server = require('http').createServer()
const p2pServer = require('socket.io-p2p-server').Server
const io = require('socket.io')(server, {
    cors: {
        origin: '*'
    }
})
const client = require('socket.io-client')

const events = require('./config/events')

class P2pServer {
    constructor (blockchain, transactionPool) {
        this._blockchain = blockchain
        this._transactionPool = transactionPool
        this._peers = []
    }

    init (port) {
        io.use(p2pServer)
        server.listen(port, () => console.log('Listening p2pServer on port: ', port))
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

    connectToPeer (peer) {
        const socket = client.io(peer)
        socket.on('connect', () => {
            console.log('Connected to ', peer)
            this.initPeer(socket)
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

module.exports = P2pServer
