require('dotenv').config();
const Discord = require('discord.js');
const { Pool } = require('pg')
const client = new Pool({
    user: 'maskuukd',
    host: 'lallah.db.elephantsql.com',
    database: 'maskuukd',
    password: 'kUxfIkwaGNz7eVL6Z9yOeUygY13Jg87x',
});
const axios = require('axios');
const TOKEN = process.env.TOKEN;

const bot = new Discord.Client({ intents: ["GUILDS", "GUILD_MESSAGES"] })
bot.login(TOKEN);

bot.on('ready', () => {
  console.info(`Logged in as ${bot.user.tag}!`);
});

bot.on('message', async (msg) => {
    try {
        await client.connect()
        let cat = 0;
        let league = '6214563'
        const server = msg.guild.id;
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
            } else {
                msg.reply('You do not have the role to create channels... :disappointed_relieved:')
            }
        }
        if (msg.content.startsWith('!advanced')) {
            const week = msg.content.substr("!advanced ".length);
            const leagueInfo = await client.query(`SELECT * FROM gtmadden WHERE server=${server}`)
            if (leagueInfo.rowCount > 0) {
                for( const item of leagueInfo.rows) {
                    league = item.league
                }
            }
            if (msg.member.roles.cache.some(role => role.name === 'Channel Creator')) {
                if (week > 0) {
                    msg.guild.channels.cache.forEach((channel)=>{
                        if (channel.name === 'Weekly' || channel.name === 'GAMES' || channel.name === '--GAME DAY--') {
                            cat = channel.id
                            msg.reply(`Currently setting up game channels for week ${week}`);
                        }
                    })

                    if (cat === 0 || cat === undefined) {
                        msg.reply('Currently there is no Catorgry for games setup, please use one of the following: Weekly, GAMES, --GAME DAY--');
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
            }
        }

    } catch (error) {
        console.error(error)
    }
});
