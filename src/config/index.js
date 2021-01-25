const packageJson = require('../../package.json')

const args = {}

process.argv.forEach(function (val) {
    if (val.startsWith('--b')) args.bgi = val.split('=')[1]
    if (val.startsWith('--d')) args.dai = val.split('=')[1]
    if (val.startsWith('--a')) args.ap = val.split('=')[1]
    if (val.startsWith('--p')) args.pp = val.split('=')[1]
    if (val.startsWith('--w')) args.bw = val.split('=')[1]
    if (val.startsWith('--m')) args.me = val.split('=')[1]
})

module.exports = {
    BLOCK_GENERATION_INTERVAL: args.bgi || 60,
    DIFFICULTY_ADJUSTMENT_INTERVAL: args.dai || 10000,
    API_PORT: args.ap || 8080,
    P2P_PORT: args.pp || 21121,
    BLOCK_WALLET: args.bw || null,
    ALLOW_ZERO_BALANCE_MINTER: true,
    MINTING_ENABLED: (args.me === 'true' || args.me === true) || false,
    NODE_VERSION: packageJson.version
}
