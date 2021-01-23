const args = {}

process.argv.forEach(function (val) {
    if (val.startsWith('--b')) args.bgi = val.split('=')[1]
    if (val.startsWith('--d')) args.dai = val.split('=')[1]
    if (val.startsWith('--a')) args.ap = val.split('=')[1]
    if (val.startsWith('--p')) args.pp = val.split('=')[1]
    if (val.startsWith('--w')) args.bw = val.split('=')[1]
})

module.exports = {
    BLOCK_GENERATION_INTERVAL: args.bgi || 10,
    DIFFICULTY_ADJUSTMENT_INTERVAL: args.dai || 10,
    API_PORT: args.ap || 8080,
    P2P_PORT: args.pp || 21121,
    BLOCK_WALLET: args.bw || null,
    NODE_VERSION: '1.0.0'
}
