const axios = require('axios');
const { fetchLeague } = require('../../utils/fetchLeague')

class GOTW {
    data = {
        bot: null,
        db: null,
        league: null
    }
    constructor(db, bot, league) {
        this.data = {
            db,
            bot,
            league
        }
    }

    async createGOTW(msg) {
        try {
            // console.log('hello?')
            await fetchLeague(msg, this.data.db, this.data.league)
            const commands = msg.content.substr("!gotw ".length);

            if (!commands) return msg.reply('Must pass back the teams you wish to create GOTW with')
            const teams = commands.split(/[ ,]+/);

            if (teams[0] === 'lock') {
                const query2 = `UPDATE gameofweek SET locked = true WHERE messageid = '${teams[1]}'`
                await client.query(query2)
                return msg.reply(`${teams[1]} has been locked, all voting from here will be rejected in the database`)
            }

            if (teams[0] === 'winner') {
                // Add Winner to the DB
                // return addingWinnerToDB(msg, league, teams)
            }

            if (teams[0] === 'wft') {
                teams[0] = 'Football Team'
            }
        
            if (teams[1] === 'wft') {
                teams[1] = 'Football Team'
            }            

            const data = await axios.get(`https://gametime-21.herokuapp.com/${this.data.league}/stats/?team=${teams[0]}&team2=${teams[1]}`) 
            const fetchedTeams = []
            let favs = null
            for(const team of data.data.matchedTeams) {
                fetchedTeams.push(team)
            }

            const overUnder = fetchedTeams[0].ppg + fetchedTeams[1].ppg
            console.log(overUnder)
            // console.log(Math.max(...fetchedTeams))
            const whoBetter = fetchedTeams[0].ppg - fetchedTeams[1].ppg
            if (Math.sign(whoBetter) === 1) {
                favs = `**The ${fetchedTeams[0].teamName} are a ${whoBetter} point favorite**`
                console.log(favs)
            }

            if (Math.sign(whoBetter) === -1) {
                favs = `**The ${fetchedTeams[1].teamName} are a ${Math.abs(whoBetter)} point favorite**`
                console.log(favs)
            }

            const message = `
@everyone 
**THE GAME OF THE WEEK**

**${fetchedTeams[0].teamName.toUpperCase()} (${fetchedTeams[0].record})** vs **${fetchedTeams[1].teamName.toUpperCase()} (${fetchedTeams[1].record})**

KICKOFF: **TBD**

**Team Stats:**

${fetchedTeams[0].teamName.toUpperCase()}
Points Per Game Ranking: ${fetchedTeams[0].ppgRank}
Points Per Game: ${fetchedTeams[0].ppg}
Power Ranking: ${fetchedTeams[0].powerRank}

------------------------------------------------------

${fetchedTeams[1].teamName.toUpperCase()}
Points Per Game Ranking: ${fetchedTeams[1].ppgRank}
Points Per Game: ${fetchedTeams[1].ppg}
Power Ranking: ${fetchedTeams[1].powerRank}

${favs} 

Betting on the underdog will result in a 2.5x return given they win

The over/under line is: ${overUnder}

You may place bets on both team and over/under to parlay for 2.6 odds. Betting on the underdog with a parley will result in a 3.1x payout

**Current Bets:**
`

msg.channel.send(message).then(async (message) => {
    msg.channel.send(`The above GOTW ID is ${message.id}`)
    const query = `INSERT INTO gameoftheweek2(messageid, teamname1, teamname2, team1ppgr, team1ppg, team1rank, team2ppgr, team2ppg, team2rank, league, week)
        VALUES(
            ${message.id}, 
            '${fetchedTeams[0].teamName}', 
            '${fetchedTeams[1].teamName}', 
            '${fetchedTeams[0].ppgRank}',
            '${fetchedTeams[0].ppg}',
            '${fetchedTeams[0].powerRank}',
            '${fetchedTeams[1].ppgRank}',
            '${fetchedTeams[1].ppg}',
            '${fetchedTeams[1].powerRank}',
            ${this.data.league}, 
            ${fetchedTeams[0].week + 1})`
    // console.log(query)
    await this.data.db.query(query)
  }).catch((err) => {
    console.error(err)
    return msg.reply('GOTW was unable to created...')
   });
        } catch (error) {
            console.log(error)
            return msg.reply('There was a issue with the creating the GOTW')
        }
        
    }

    async addBet(msg) {
        // We need to add a bet to the team
        // See if we can grab the last message by GTMadden
        // console.log(msg)

        // Find Channel

        try {
            const commands = msg.content.substr("!bet ".length);
            // console.log(msg)
            const bets = commands.split(/[ ,]+/);
            // if (bets[0] !== Number) return msg.reply('Must return a number value bet')
            const channel = await this.data.bot.channels.fetch(msg.channelId)

            channel.messages.fetch().then(messages => {
                const lastMessage = messages.filter(m => m.author.username === 'GTMadden').last();
                msg.channel.messages.fetch({around: lastMessage.id, limit: 1})
                    .then(msg1 => {
                        const fetchedMsg = msg1.first();
                        const message = this.createMessage(msg, lastMessage.id, bets[1])
                        fetchedMsg.edit(message);
                    });
            })
            .catch(console.error);
        } catch (error) {
            console.error(error)
            return msg.reply('There was a issue with placing your bet, please try again')
        }
    }


    async createMessage(msg, messageId) {
        try {
            let message
            console.log(messageId)
            const message2 = await this.data.db.query(`SELECT * FROM gameoftheweek2 WHERE messageid = '${messageId}'`)
            const bets = await this.data.db.query(`select * from gotwbets where messageid = '${messageId}'`)
            if (message2.rows.length > 0) {
                message = ``
            } else {
                return msg.reply('No GOTW was found.')
            }
        } catch (error) {
            console.log(error)
            return msg.reply('There was a issue with placing your bet, please try again.')
        }
    }
}

module.exports = { GOTW }