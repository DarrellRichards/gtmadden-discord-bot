require('dotenv').config();
const Discord = require('discord.js');
const { Pool } = require('pg')
const client = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: {
        rejectUnauthorized: false
    }
});
const axios = require('axios');
const TOKEN = process.env.TOKEN;

const bot = new Discord.Client({ intents: ["GUILDS", "GUILD_MESSAGES", "GUILD_MESSAGE_REACTIONS"], partials: ['MESSAGE', 'CHANNEL', 'REACTION'] })
bot.login(TOKEN);

let msg;

const checkIfUserVoted = async (reaction, user, checkDelete = false) => {
    return new Promise(async (resolve, reject) => {
        try {
            if (checkDelete) {
                const query = `SELECT * FROM gameofweekvotes WHERE messageid='${reaction.message.id}'`
                const found = await client.query(query)
                
                if (found.rowCount > 0) {
                    if (reaction._emoji.name === '🟢' && found.rows[0].votecolor === 'Green') {
                        return resolve(true)
                    }
                    if (reaction._emoji.name === '🔵' && found.rows[0].votecolor === 'Blue') {
                        return resolve(true)
                    }

                    resolve(false)
                }
                resolve(false)
            } else {
                const query = `SELECT * FROM gameofweekvotes WHERE messageid='${reaction.message.id}'`
                const found = await client.query(query)
                if (found.rowCount > 0) return resolve(true)
                resolve(false)
            }
            
        } catch (error) {
            reject(error)
        }
        
    })
}


const checkIfLocked = async (reaction, user) => {
    return new Promise(async (resolve, reject) => {
        try {
            const query = `SELECT * FROM gameofweek WHERE messageid='${reaction.message.id}' AND locked = true`
            const found = await client.query(query)
            if (found.rowCount > 0) return resolve(true)
            resolve(false)
        } catch (error) {
            reject(error)
        }
        
    })
}

bot.on('messageReactionAdd', async (reaction, user) => {
    const hasUserVoted = await checkIfUserVoted(reaction, user)
    const isGameLocked = await checkIfLocked(reaction, user)
    const message = reaction.message
    if (reaction.partial) {
        // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
        try {
            await reaction.fetch();
        } catch (error) {
            console.log('Something went wrong when fetching the message: ', error);
            // Return as `reaction.message.author` may be undefined/null
            return;
        }
    }

    try {
        if (user.username !== 'GTMadden') {
            // Save Reaction to DB
            // Check if a user has already voted...
            // if (reaction._emoji.name !== '🔵' || reaction._emoji.name !== '🟢') return reaction.remove(user)
            if (!hasUserVoted && !isGameLocked) {
                if (reaction._emoji.name === '🟢') {
                    const query = `INSERT INTO gameofweekvotes(messageid, userid, votecolor, username, discorduser)VALUES(${reaction.message.id}, ${user.id}, 'Green', '${user.username}', '${user.username}#${user.discriminator}')`
                    await client.query(query)
                    const query2 = `UPDATE gameofweek SET teamVote = teamVote + 1 WHERE messageid = '${reaction.message.id}'`
                    await client.query(query2)
                    return await message.channel.send(`<@${user.id}> your vote has been accepted`).then(r => setTimeout(() => {
                        r.delete({ timeout: 5000 })
                    }, 5000))
                }
    
                if (reaction._emoji.name === '🔵') {
                    const query = `INSERT INTO gameofweekvotes(messageid, userid, votecolor, username, discorduser)VALUES(${reaction.message.id}, ${user.id}, 'Blue', '${user.username}', '${user.username}#${user.discriminator}')`
                    await client.query(query)
                    const query2 = `UPDATE gameofweek SET team2vote = team2vote + 1 WHERE messageid = '${reaction.message.id}'`
                    await client.query(query2)
                    return await message.channel.send(`<@${user.id}> your vote has been accepted`).then(r => setTimeout(() => {
                        r.delete({ timeout: 5000 })
                    }, 5000))
                } 
                
            } else {
                await message.channel.send(`<@${user.id}> you have already voted. Please remove your other vote before voting again`).then(r => setTimeout(() => {
                    r.delete()
                }, 5000))
                const msg = await message.channel.messages.fetch(reaction.message.id)
                return msg.reactions.resolve(reaction._emoji.name).users.remove(user.id);
            }
        } else {
            console.log('GTMadden Setup Reactions')
        }
    } catch (error) {
        console.error(error)   
    }
});

bot.on('messageReactionRemove', async (reaction, user) => {
    const hasUserVoted = await checkIfUserVoted(reaction, user, true)
    const isGameLocked = await checkIfLocked(reaction, user)
    const message = reaction.message
    if (reaction.partial) {
        // If the message this reaction belongs to was removed the fetching might result in an API error, which we need to handle
        try {
            await reaction.fetch();
        } catch (error) {
            console.log('Something went wrong when fetching the message: ', error);
            // Return as `reaction.message.author` may be undefined/null
            return;
       
        }
    }

    if (hasUserVoted && !isGameLocked) {
        if (reaction._emoji.name === '🟢') {
            const query = `DELETE FROM gameofweekvotes WHERE messageid = '${reaction.message.id}' AND userid = '${user.id}'`
            await client.query(query)
            const query2 = `UPDATE gameofweek SET teamVote = teamVote - 1 WHERE messageid = '${reaction.message.id}'`
            await client.query(query2)
            return await message.channel.send(`<@${user.id}> we have removed your vote of 🟢`).then(r => setTimeout(() => {
                r.delete({ timeout: 5000 })
            }, 5000))
        }
    
        if (reaction._emoji.name === '🔵') {
            const query = `DELETE FROM gameofweekvotes WHERE messageid = '${reaction.message.id}' AND userid = '${user.id}'`
            await client.query(query)
            const query2 = `UPDATE gameofweek SET team2Vote = team2Vote - 1 WHERE messageid = '${reaction.message.id}'`
            await client.query(query2)
            return await message.channel.send(`<@${user.id}> we have removed your vote of 🔵`).then(r => setTimeout(() => {
                r.delete({ timeout: 5000 })
            }, 5000))
        }
    }

    
});


const grabRookies = async (msg, league, server) => {
    const data = await axios.get(`https://gametime-21.herokuapp.com/${league}/rookie/stats`)
    const element = msg.content.substr("!rookies ".length);
    switch (element) {
        case 'passing':
            let embed = new Discord.MessageEmbed()
            .setTitle('Rooking Passing Leaders')
            for (const player of data.data.passingLeaders) {
                // firstName, lastName, position, teamName
                // stats = passAtt, passComp, passInts, passTDs, passYds
                embed.addField(`${player.firstName} ${player.lastName}, ${player.position}, ${player.teamName}`, `${player.stats.passComp}/${player.stats.passAtt} , ${player.stats.passInts} Ints, ${player.stats.passTDs} TD's, ${player.stats.passYds} Yards`)
                
            }
            if (embed) msg.reply({embeds: [embed]})
            break;
        case 'rushing':
            let embed2 = new Discord.MessageEmbed()
            .setTitle('Rooking Rushing Leaders')
            for (const player of data.data.rushingLeaders) {
                embed2.addField(`${player.firstName} ${player.lastName}, ${player.position}, ${player.teamName}`, `${player.stats.rushAtt} Att  , ${player.stats.rushFum} Fum, ${player.stats.rushYds} Yards, ${player.stats.rushTDs} TDs`)
            }
            if (embed2) msg.reply({embeds: [embed2]})
            break;
    
        default:
            break;
    }
}

const creatingTheGOTW = async (msg, league) => {
    try {
        msg = msg
    const found = await client.query(`SELECT * FROM gtmadden WHERE league=${league}`)
    if (found.rowCount <= 0) return msg.reply('League is not configged yet, run !config with league id')
    const stuff = msg.content.substr("!gotw ".length);
    if (!stuff) return msg.reply('Must pass back the teams you wish to create GOTW with')
    // Send Message Save Message ID in DB and update reactions
    // Check which teams are being selected to the GOTW
    const teams = stuff.split(/[ ,]+/);
    if (teams[0] === 'lock') {
        const query2 = `UPDATE gameofweek SET locked = true WHERE messageid = '${teams[1]}'`
        await client.query(query2)
        msg.reply(`${teams[1]} has been locked, all voting from here will be rejected in the database`)
        return
    }
    const data = await axios.get(`https://gametime-21.herokuapp.com/6214563/stats/?team=${teams[0]}&team2=${teams[1]}`) 
    const fetchedTeams = []

    for(const team of data.data.matchedTeams) {
        fetchedTeams.push(team)
    }

    const message = `
        @everyone GAME OF THE WEEK

${fetchedTeams[0].teamName.toUpperCase()} (${fetchedTeams[0].record}) 🟢 vs ${fetchedTeams[1].teamName.toUpperCase()} (${fetchedTeams[1].record}) 🔵

Team Stats:

${fetchedTeams[0].teamName.toUpperCase()}
Points Per Game Ranking: ${fetchedTeams[0].ppgRank}
Points Per Game: ${fetchedTeams[0].ppg}
Power Ranking: ${fetchedTeams[0].powerRank}

------------------------------------------------------

${fetchedTeams[1].teamName.toUpperCase()}
Points Per Game Ranking: ${fetchedTeams[1].ppgRank}
Points Per Game: ${fetchedTeams[1].ppg}
Power Ranking: ${fetchedTeams[1].powerRank}

GAME OF THE WEEK WINNER RECEIVES: 100K 

CORRECTLY GUESSING GOTW: 100K 

TO VOTE SIMPLY REACT WITH THE CORRESPONDING TEAM COLOR 

THERE WILL BE END OF THE SEASON INCENTIVES FOR PARTICIPATION: 

13+ CORRECT GUESSES = TBD 8-12 CORRECT GUESSES = TBD 0-7 CORRECT GUESSES = TBD

STILL WORKING ON THE FINAL DETAILS. MORE INFORMATION WILL BE PROVIDED WHEN AVAILABLE`;
    msg.channel.send(message).then(async (message) => {
        // message.id = the message id of the sent message
        msg.channel.send(`The above GOTW ID is ${message.id}`)
        const query = `INSERT INTO gameofweek(messageid, team, team2, league)VALUES(${message.id}, '${fetchedTeams[0].teamName}', '${fetchedTeams[1].teamName}', ${league})`
        console.log(query)
        await client.query(query)
        // await client.query(`INSERT INTO gameoftheweek(messageID, team, team2, )VALUES(${message.id}, ${fetchedTeams[0]}, ${fetchedTeams[1]})`)
        message.react("🟢")
        message.react("🔵")
        // const filter = (reaction, user) => {
        //     return ['🟢', '🔵'].includes(reaction.emoji.name) && user.id === interaction.user.id;
        // };
        // message.awaitReactions({})
        //     .then(collected => {
        //         const reaction = collected.first();
        //         console.log(reaction)
        //         console.log(collected)
        //         if (reaction.emoji.name === '👍') {
        //             message.reply('You reacted with a thumbs up.');
        //         } else {
        //             message.reply('You reacted with a thumbs down.');
        //         }
        //     })
        //     .catch(collected => {
        //         message.reply('You reacted with neither a thumbs up, nor a thumbs down.');
        //     });
      }).catch((err) => {
        console.error(err)
        return msg.reply('GOTW was unable to created...')
       });
    } catch (error) {
        console.error(error)
        return msg.reply('There was a error')
    }
}


const findGOTW = async (msg, league) => {
    // Find a Single GOTW
    // Find all GOTW's
    const games = []
    try {
        const found = await client.query(`SELECT * FROM gtmadden WHERE league=${league}`)
        if (found.rowCount <= 0) return msg.reply('League is not configged yet, run !config with league id')
    
        const query = `SELECT * FROM gameofweek`
    
        const data = await client.query(query)
        for (const game of data.rows) {
            const ff = new Discord.MessageEmbed()
                .setTitle(`${game.team} vs ${game.team2}`)
            // if (embed) msg.reply({embeds: [embed]})
            const queryVotes = `SELECT * FROM gameofweekvotes WHERE messageid = '${game.messageid}'`
            const voteData = await client.query(queryVotes)
            for (const vote of voteData.rows) {
                if (vote.votecolor === 'Green') {
                    ff.addField('Voted:', game.team, true)
                }

                if (vote.votecolor === 'Blue') {
                    ff.addField('Voted:', game.team2, true)
                }
                ff.addField('User:', `<@!${vote.userid}>`, true)
            }

            games.push(ff)

        }
        
        msg.reply({embeds: games})
    } catch (error) {
        console.error(error)
    }
   
}

bot.on('ready', async () => {
  console.info(`Logged in as ${bot.user.tag}!`);
  await client.connect()
});

bot.on('message', async (msg) => {
    try {
        let cat = 0;
        let league = '6214563'
        const server = msg.guild.id;
        const leagueInfo = await client.query(`SELECT * FROM gtmadden WHERE server=${server}`)
        if (leagueInfo.rowCount > 0) {
            for( const item of leagueInfo.rows) {
                league = item.league
            }
        }

        if (msg.content.startsWith('!gotw')) {
            creatingTheGOTW(msg, league)
        }
        if (msg.content.startsWith('!findgotw')) {
            findGOTW(msg, league)
        }
        if (msg.content.startsWith('!config')) {
            if (msg.member.roles.cache.some(role => role.name === 'Channel Creator')) {
                const leagueElement = msg.content.substr("!config ".length);
                const found = await client.query(`SELECT * FROM gtmadden WHERE league=${leagueElement}`)
                if (found.rowCount > 0) {
                    msg.reply('We have already setup support for this league :partying_face:')
                    return
                } 
                await client.query(`INSERT INTO gtmadden(league, server)VALUES(${leagueElement}, ${server})`)
                msg.reply('We have setup the support for youre league :partying_face:')
                return 
            } else {
                msg.reply('You do not have the role to create channels... :disappointed_relieved:')      
                return        
            }
        }
        if (msg.content.startsWith('!rookies')) {
            grabRookies(msg, league, server)
        }
        if (msg.content.startsWith('!advanced')) {
            const week = msg.content.substr("!advanced ".length);
            console.log(week)
            if (msg.member.roles.cache.some(role => role.name === 'Channel Creator')) {
                if (week > 0) {
                    msg.guild.channels.cache.forEach((channel)=>{
                        console.log(channel.name)
                        if (channel.name === 'Weekly' || channel.name === 'games' || channel.name === 'GAMES'|| channel.name === '▬▬ GAME DAY ▬▬') {
                            cat = channel.id
                            msg.reply(`Currently setting up game channels for week ${week}`);
                        }
                    })

                    if (cat === 0 || cat === undefined) {
                        msg.reply('Currently there is no Category for games setup, please use one of the following: Weekly, GAMES, ▬▬ GAME DAY ▬▬');
                        return
                    }
                    const data = await axios.get(`https://gametime-21.herokuapp.com/${league}/schedules?week=${week}`)
                    msg.guild.channels.create(`week-${week}` , { type: 'text', parent: cat }).then((_) => {
                        // console.log(channel)
                    });
                    msg.guild.channels.create(`gotw-week${week}` , { type: 'text', parent: cat }).then((_) => {
                        // console.log(channel)
                    });
                    for (const game of data.data) {
                        if (game.awayTeam === 'Football Team') {
                            game.awayTeam = 'WFT'
                        }
                        if (game.homeTeam === 'Football Team') {
                            game.homeTeam = 'WFT'
                        }
                        msg.guild.channels.create(`${game.awayTeam}-${game.homeTeam}` , { type: 'text', parent: cat }).then((channel) => {
                            // console.log(channel)
                        });
                    }
                } else {
                    msg.reply(`We must supply a week number you wish to create channels for`);
                    return
                }
            } else {
                msg.reply('You do not have the role to create channels... :disappointed_relieved:')
                return 
            }
        }
    } catch (error) {
        console.error(error)
    }
});
