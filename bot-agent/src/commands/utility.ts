import type { Bot as MineflayerBot } from "mineflayer";
import { logger } from "../utils";

export class UtilityCommands {
  async showStatus(bot: MineflayerBot): Promise<void> {
    try {
      const pos = bot.entity.position;
      const health = Math.round(bot.health * 10) / 10;
      const food = Math.round(bot.food * 10) / 10;

      // Send status in separate messages with delays to prevent spam kick
      bot.chat("=== 📊 Bot Status ===");

      await new Promise((resolve) => setTimeout(resolve, 300));
      bot.chat(`Health: ${health}/20, Food: ${food}/20`);

      await new Promise((resolve) => setTimeout(resolve, 300));
      bot.chat(`Position: (${Math.round(pos.x)}, ${Math.round(pos.y)}, ${Math.round(pos.z)})`);

      await new Promise((resolve) => setTimeout(resolve, 300));
      const dimension = bot.game.dimension || "unknown";
      bot.chat(`Dimension: ${dimension}`);
      const gameMode = bot.game.gameMode || "unknown";
      bot.chat(`Mode: ${gameMode}`);

      // Show activity status safely
      await new Promise((resolve) => setTimeout(resolve, 300));
      try {
        const activities = [];

        if (this.moveCommands.isActive()) {
          const moveStatus = this.moveCommands.getStatus();
          if (moveStatus.following && moveStatus.followTarget) {
            activities.push(`Following ${moveStatus.followTarget}`);
          }
          if (moveStatus.patrolling) {
            activities.push("Patrolling");
          }
        }

        if (this.gatherCommands.isActive()) {
          const gatherStatus = this.gatherCommands.getStatus();
          if (gatherStatus.mining) activities.push("Mining");
          if (gatherStatus.collecting) activities.push("Collecting");
        }

        if (this.exploreCommands.isActive()) {
          activities.push("Exploring");
        }

        const activityText = activities.length > 0 ? activities.join(", ") : "Idle";
        bot.chat(`Activities: ${activityText}`);
      } catch (activityError) {
        logger.warn("Error getting activity status:", activityError);
        bot.chat("Activities: Unknown");
      }
    } catch (error) {
      logger.error("Error showing status:", error);
      bot.chat("❌ Error retrieving status");
    }
  }

  async showInventory(bot: MineflayerBot): Promise<void> {
    const items = bot.inventory.items();
    if (items.length === 0) {
      bot.chat("Inventory is empty");
      return;
    }

    const itemCounts = items.reduce((acc, item) => {
      acc[item.name] = (acc[item.name] || 0) + item.count;
      return acc;
    }, {} as Record<string, number>);

    const itemList = Object.entries(itemCounts)
      .map(([name, count]) => `${name}: ${count}`)
      .join(", ");

    bot.chat(`Inventory: ${itemList}`);
  }

  // Equip item (armor/item on hand)
  // Drop item
  // Pick item from storage
  
  async disable(bot: MineflayerBot, args: string[]): Promise<void> {
    if (args.length === 0) {
      bot.chat("Usage: disable <commands | commandCategory | chat | all > [on|off]");
      return;
    }

    bot.chat("Disabling bot...");
  }
}
