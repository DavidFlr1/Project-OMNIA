const mineplayer = require('mineflayer')

const bot = mineplayer.createBot({
  local: process.env.MINECRAFT_HOST || "localhost",
  port: Number.parseInt(process.env.MINECRAFT_PORT || "25565"),
  username: `lookAt_Bot-${Math.floor(Math.random() * 99)}`,
  version: '1.21',
  auth: 'offline',
  // username: 'davidricardo.flores33@gmail.com', // Or your email
  // password: 'x', // Or your password
  // auth: 'microsoft', // mojang Or 'microsoft'
})

function lookAtNearestPlayer() {
  const getPlayer = ent => ent.type === 'player'
  const player = bot.nearestEntity(getPlayer)

  if(!player) return

  const pos = player.position.offset(0, player.height, 0)
  bot.lookAt(pos)
}

bot.on('physicTick', lookAtNearestPlayer)

// bot.on('error', async (err) => {
//     // Connection error
//     if (err.code == 'ECONNREFUSED') {
//         this.log(`Failed to connect to ${err.address}:${err.port}`)
//     }
//     // Unhandled errors
//     else {
//         this.log(`Unhandled error: ${err}`);
//     }
// });