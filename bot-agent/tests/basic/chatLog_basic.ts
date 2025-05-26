const mineplayer = require('mineflayer')
const chalk = require('chalk');

const bot = mineplayer.createBot({
  local: 'localhost',
  port: 6060,
  username: `chatLog_Bot-${Math.floor(Math.random() * 99)}`
})

bot.on('chat', (player, message) => {
  if (player === bot.username) return
  console.log(chalk.blue(`Bot ${bot.username} get: `), chalk.green(`"${message}"`), chalk.red(`from: ${player}`)) 

  bot.chat("Answer")

})