require('dotenv').config();
const Discord = require('discord.js');
const axios = require('axios');
const TOKEN = process.env.TOKEN;


const bot = new Discord.Client({ intents: ["GUILDS", "GUILD_MESSAGES"] })
bot.login(TOKEN);

bot.on('ready', () => {
  console.info(`Logged in as ${bot.user.tag}!`);
});

bot.on('message', async (msg) => {
    let cat = 0;
    if (msg.content.startsWith('!advanced')) {
        const week = msg.content.substr("!advanced ".length);
        if (week > 0) {
            msg.reply(`Currently setting up game channels for week ${week}`);
        }
        try {
            msg.guild.channels.cache.forEach((channel)=>{
                if (channel.name === 'Weekly') {
                    cat = channel.id
                }
            })
            // msg.guild.channels.fetch()
            //     .then(channels => {
            //         for (const channel of channels) {
            //             console.log(channel)
            //             if (channel.name === 'Weekly') {
            //                 console.log(channel)
            //             }
            //         }
            //     })
            //     .catch(console.error);
            const data = await axios.get(`http://localhost:8080/6214563/schedules?week=${week}`)
            for (const game of data.data) {
                msg.guild.channels.create(`${game.awayTeam}-${game.homeTeam}` , { type: 'text', parent: cat }).then((channel) => {
                    console.log(channel)
                }.catch(err) => {
                    msg.reply(`There was a error: ${err}`);
                });
                // msg.guild.createChannel(`${game.awayTeam}-${game.homeTeam}` , { type: 'text' }).then((channel) => {
                //     channel.setParent(cat);
                // });
            }
        } catch (error) {
            console.error(error)
        }
    }
});
