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

const bot = new Discord.Client({ intents: ["GUILDS", "GUILD_MESSAGES"] })
bot.login(TOKEN);


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
            // msg.reply(embed)
            break;
    
        default:
            break;
    }
    // const list = data.data.map((item, i) => {
    //     console.log(item)
    //     return
    // })
    // console.log(data.data.passingLeaders)

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
                    console.log(data.data)
                    msg.guild.channels.create(`week-${week}` , { type: 'text', parent: cat }).then((_) => {
                        // console.log(channel)
                    });
                    msg.guild.channels.create(`gotw-week${week}` , { type: 'text', parent: cat }).then((_) => {
                        // console.log(channel)
                    });
                    for (const game of data.data) {
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
