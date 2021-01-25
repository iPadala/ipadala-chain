const gulp = require('gulp')
const source = require('vinyl-source-stream')
const browserify = require('browserify')

gulp.task('browser', cb => {
    const entries = [
        './src/index.js',
        './src/p2pClient.js'
    ]

    const capitalize = (s) => {
        if (typeof s !== 'string') return ''
        return s.charAt(0).toUpperCase() + s.slice(1)
    }
    return entries.map(function (entry) {
        const file = entry.split('src/')[1].split('.')[0]
        return browserify(entry, { standalone: capitalize(file) })
            .transform('babelify')
            .bundle()
            .pipe(source(`${file}.js`))
            .pipe(gulp.dest('./dist'))
    })
})

gulp.task('client', cb => {
    const entries = [
        './src/block.js',
        './src/blockchain.js',
        './src/minter.js',
        './src/p2pServer.js',
        './src/p2pClient.js',
        './src/transaction.js',
        './src/transactionPool.js',
        './src/util.js',
        './src/wallet.js'
    ]

    const capitalize = (s) => {
        if (typeof s !== 'string') return ''
        return s.charAt(0).toUpperCase() + s.slice(1)
    }
    return entries.map(function (entry) {
        const file = entry.split('src/')[1].split('.')[0]
        return browserify(entry, { standalone: capitalize(file) })
            .transform('babelify')
            .bundle()
            .pipe(source(`${file}.js`))
            .pipe(gulp.dest('./dist'))
    })
})
