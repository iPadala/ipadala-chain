const CryptoJs = require('crypto-js')
const moment = require('moment')
const EC = require('elliptic').ec
const ec = new EC('secp256k1')
const fs = require('fs')
const events = require('./config/events')

class Util {
    static genKeyPair () {
        return ec.genKeyPair()
    }

    static calculateHash (data) {
        return CryptoJs.SHA256(data).toString()
    }

    static verifySignature (address, signature, data) {
        return ec.keyFromPublic(address, 'hex').verify(data, signature)
    }

    static signData (secret, data) {
        return ec.keyFromPrivate(secret, 'hex').sign(data).toDER('hex')
    }

    static getKeyPair (secret) {
        return ec.keyFromPrivate(secret, 'hex')
    }

    static getCurrentTimestamp () {
        return moment().unix()
    }

    static events () {
        return events
    }

    static readFile (file, cb) {
        if (fs.existsSync(file)) return fs.readFile(file, 'utf8', cb)
        return null
    }

    static writeFile (file, data, cb) {
        if (fs.existsSync(file)) return fs.writeFile(file, data, cb)
        return null
    }

    static validateAddress (address) {
        if (address.length !== 130) return false
        if (address.match('^[a-fA-F0-9]+$') === null) return false
        return address.startsWith('04')
    }
}

module.exports = Util
