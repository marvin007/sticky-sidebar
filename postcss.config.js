module.exports = {
    plugins: [
        require('cssnano')({
            preset: ['default', {
                discardComments: {
                    removeAll: true
                },
                calc: false
            }]
        }),
        require('autoprefixer')({
            grid: true
        })
    ]
};
