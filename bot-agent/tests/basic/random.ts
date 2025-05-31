const mineflayer = require("mineflayer");
const collectBlock = require("mineflayer-collectblock").plugin;
const Vec3 = require("vec3");

const { pathfinder, Movements, goals } = require("mineflayer-pathfinder");

const bot = mineflayer.createBot({
  local: process.env.MINECRAFT_HOST || "localhost",
  port: Number.parseInt(process.env.MINECRAFT_PORT || "25565"),
  username: `Random_Bot-${Math.floor(Math.random() * 99)}`,
  auth: "offline",
});

const responses = ["Hey there!", "What’s up?", "Leave me alone, I’m busy.", "Nice weather, huh?", "Just bot things."];

// Respond to nearby players looking at the bot
bot.on("chat", (username, message) => {
  if (username === bot.username) return;

  const player = bot.players[username];
  if (!player || !player.entity) return;

  const distance = bot.entity.position.distanceTo(player.entity.position);
  const playerYaw = player.entity.yaw;
  const botPos = bot.entity.position;

  // Check if within 4 blocks and looking roughly at the bot
  if (distance <= 4 && isLookingAtBot(player.entity)) {
    const reply = responses[Math.floor(Math.random() * responses.length)];
    bot.chat(reply);
  }
});

// Roughly determine if player is looking at the bot
function isLookingAtBot(entity) {
  const botPos = bot.entity.position;
  const playerPos = entity.position;

  const yaw = entity.yaw;
  const pitch = entity.pitch;

  const viewDir = getDirectionFromYawPitch(yaw, pitch);
  const toBot = botPos.minus(playerPos).normalize();
  const dot = viewDir.dot(toBot);

  return dot > 0.9; // Higher means more accurate
}

function getDirectionFromYawPitch(yaw, pitch) {
  const x = -Math.sin(yaw) * Math.cos(pitch);
  const y = Math.sin(pitch);
  const z = -Math.cos(yaw) * Math.cos(pitch);
  return new Vec3(x, y, z).normalize();
}

function lookAtNearestPlayer() {
  const getPlayer = (ent) => ent.type === "player";
  const player = bot.nearestEntity(getPlayer);

  if (!player) return;

  const pos = player.position.offset(0, player.height, 0);
  bot.lookAt(pos);
}

bot.on("physicsTick", lookAtNearestPlayer);
