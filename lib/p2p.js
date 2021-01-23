const server = require('http').createServer()
const io = require('socket.io')(server)
const p2p = require('socket.io-p2p-server').Server
const client = require('socket.io-client')

const Utils = require('./util')

class P2pServer {
    constructor (blockchain, transactionPool) {
        this._blockchain = blockchain
        this._transactionPool = transactionPool
        this._peers = []
    }

    init (port) {
        io.use(p2p)
        server.listen(port, () => console.log('Listening p2p on port: ', port))
        io.on('connection', (socket) => {
            this.addPeer(socket)
            this.connectToPeer(socket)
            this.initListeners(socket)
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

    initListeners (socket) {
        socket.on('disconnect', () => {
            this.removePeer(socket)
        })
        socket.on(Utils.events().NEW_TRANSACTION, (transaction) => {
            this._transactionPool.updateOrAddTransaction(transaction)
        })
        socket.on(Utils.events().UPDATE_BLOCKCHAIN, (chain) => {
            this._blockchain.replaceChain(chain)
        })
        socket.on(Utils.events().CLEAR_TRANSACTION_POOL, () => {
            this._transactionPool.clear()
        })
    }

    connectToPeer (peer) {
        const ioClient = client.io(peer)
        ioClient.on('connection', (socket) => {
            this.initListeners(socket)
        })
    }

    syncChains () {
        this.broadcast(Utils.events().UPDATE_BLOCKCHAIN, this._blockchain._chain)
    }
}

module.exports = P2pServer
