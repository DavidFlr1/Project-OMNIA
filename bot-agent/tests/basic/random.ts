const mineflayer = require('mineflayer')
const collectBlock = require('mineflayer-collectblock').plugin
const Vec3 = require('vec3')

const { pathfinder, Movements, goals } = require('mineflayer-pathfinder')

const bot = mineflayer.createBot({
  local: process.env.MINECRAFT_HOST || "localhost",
  port: Number.parseInt(process.env.MINECRAFT_PORT || "25565"),
  username: `Random_Bot-${Math.floor(Math.random() * 99)}`,
  auth: 'offline'
})


bot.loadPlugin(pathfinder)
bot.loadPlugin(collectBlock)

let mcData
let defaultMove

bot.once('spawn', () => {
  mcData = require('minecraft-data')(bot.version)
  defaultMove = new Movements(bot, mcData)
  bot.pathfinder.setMovements(defaultMove)

  // bot.chat('Spawning. Starting task...')

  // collectLogsAndStore()
})

// async function collectLogsAndStore() {
//   try {
//     const logTypes = Object.values(mcData.blocks)
//       .filter(block => block.name.includes('log'))
//       .map(block => block.id)

//     const logPositions = bot.findBlocks({
//       matching: logTypes,
//       maxDistance: 32,
//       count: 10
//     })

//     if (!logPositions.length) {
//       bot.chat('No logs found nearby.')
//       return
//     }

//     const targets = logPositions.slice(0, 5).map(pos => bot.blockAt(pos))
//     bot.chat(`Found ${targets.length} logs. Collecting...`)
//     await bot.collectBlock.collect(targets)
//     bot.chat('Collected 5 logs.')

//     const chestBlock = bot.findBlock({
//       matching: block => bot.isChest(block),
//       maxDistance: 16
//     })

//     if (!chestBlock) {
//       bot.chat('No chest nearby to store logs!')
//       return
//     }

//     bot.chat(`Chest found. Moving to store items...`)
//     await bot.pathfinder.goto(new goals.GoalBlock(
//       chestBlock.position.x,
//       chestBlock.position.y,
//       chestBlock.position.z
//     ))

//     const chest = await bot.openChest(chestBlock)

//     const logsToStore = bot.inventory.items().filter(item => item.name.includes('log'))
//     for (let item of logsToStore) {
//       await chest.deposit(item.type, null, item.count)
//       bot.chat(`Stored ${item.count} ${item.name}.`)
//     }

//     chest.close()
//     bot.chat('Task complete.')

//   } catch (err) {
//     bot.chat(`❌ Task failed: ${err.message}`)
//     console.error(err)
//   }
// }

// Simple task list
// const tasks = [
//   { task: 'picking wood', goal: 'got 5 blocks of wood' },
//   { task: 'idling', goal: 'wait 10 seconds' },
//   { task: 'jumping', goal: 'jump 5 times' }
// ]

// let currentTask = null
// let jumpCount = 0
// let idleStart = null

// bot.once('spawn', () => {
//   bot.chat('Hello world!')
//   pickRandomTask()
// })

// // Chooses a random task
// function pickRandomTask() {
//   currentTask = tasks[Math.floor(Math.random() * tasks.length)]
//   bot.chat(`New task: ${currentTask.task}`)

//   if (currentTask.task === 'jumping') {
//     jumpCount = 0
//     doJumping()
//   }

//   if (currentTask.task === 'idling') {
//     idleStart = Date.now()
//     setTimeout(() => {
//       bot.chat('Done idling.')
//       pickRandomTask()
//     }, 10000)
//   }

//   if (currentTask.task === 'picking wood') {
//     // For now, simulate task done instantly
//     setTimeout(() => {
//       bot.chat('Pretending I picked 5 wood blocks.')
//       pickRandomTask()
//     }, 3000)
//   }
// }

// // Jumping task logic
// function doJumping() {
//   const interval = setInterval(() => {
//     if (jumpCount >= 5) {
//       clearInterval(interval)
//       bot.chat('Done jumping.')
//       pickRandomTask()
//     } else {
//       bot.setControlState('jump', true)
//       setTimeout(() => bot.setControlState('jump', false), 200)
//       jumpCount++
//     }
//   }, 1000)
// }



// Talking
const responses = [
  "Hey there!",
  "What’s up?",
  "Leave me alone, I’m busy.",
  "Nice weather, huh?",
  "Just bot things."
]

// Respond to nearby players looking at the bot
bot.on('chat', (username, message) => {
  if (username === bot.username) return

  const player = bot.players[username]
  if (!player || !player.entity) return

  const distance = bot.entity.position.distanceTo(player.entity.position)
  const playerYaw = player.entity.yaw
  const botPos = bot.entity.position

  // Check if within 4 blocks and looking roughly at the bot
  if (distance <= 4 && isLookingAtBot(player.entity)) {
    const reply = responses[Math.floor(Math.random() * responses.length)]
    bot.chat(reply)
  }
})

// Roughly determine if player is looking at the bot
function isLookingAtBot(entity) {
  const botPos = bot.entity.position
  const playerPos = entity.position

  const yaw = entity.yaw
  const pitch = entity.pitch

  const viewDir = getDirectionFromYawPitch(yaw, pitch)
  const toBot = botPos.minus(playerPos).normalize()
  const dot = viewDir.dot(toBot)

  return dot > 0.9 // Higher means more accurate
}

function getDirectionFromYawPitch(yaw, pitch) {
  const x = -Math.sin(yaw) * Math.cos(pitch)
  const y = Math.sin(pitch)
  const z = -Math.cos(yaw) * Math.cos(pitch)
  return new Vec3(x, y, z).normalize()
}

function lookAtNearestPlayer() {
  const getPlayer = ent => ent.type === 'player'
  const player = bot.nearestEntity(getPlayer)

  if(!player) return

  const pos = player.position.offset(0, player.height, 0)
  bot.lookAt(pos)
}

bot.on('physicTick', lookAtNearestPlayer)