const fetchLeague = async (msg, client, league) => new Promise(async (resolve, reject) => {
    try {
        const found = await client.query(`SELECT * FROM gtmadden WHERE league=${league}`)
        if (found.rowCount <= 0) return msg.reply('League is not configged yet, run !config with league id')
        resolve(true)
    } catch (error) {
        reject(error)
        console.error(error)
    }
})

module.exports = {
    fetchLeague
}