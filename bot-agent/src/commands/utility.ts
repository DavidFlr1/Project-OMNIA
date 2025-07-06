import type { EquipmentDestination, Bot as MineflayerBot } from "mineflayer";
import { logger } from "../utils";
import { Vec3 } from "vec3";
import { goals } from "mineflayer-pathfinder";

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

  async equip(bot: MineflayerBot, args: string[]): Promise<void> {
    if (args.length === 0) {
      bot.chat("Usage: equip <item_name> [hand | offhand | head | torso | legs | feet]");
      return;
    }

    const itemName = args[0];
    const slot = args[1] || 'hand';
    try {
      // Find the block in inventory
      const items = bot.inventory.items();
      const blockItem = items.find(item => item.name === itemName);
      
      if (blockItem) {
        await bot.equip(blockItem, slot as EquipmentDestination);
      }
    } catch (error) {
      logger.warn(`Failed to equip ${itemName}:`, error);
    }
  }

  async drop(bot: MineflayerBot, args: string[]): Promise<void> {
    if (args.length === 0) {
      bot.chat("Usage: drop <item_name> [quantity]");
      return;
    }

    const itemName = args[0];
    const quantity = args[1] ? Number.parseInt(args[1]) : 1;

    try {
      const items = bot.inventory.items();
      const itemToDrop = items.find(item => item.name === itemName);
      
      if (itemToDrop) {
        await bot.toss(itemToDrop.type, null, quantity);
      }
    } catch (error) {
      logger.warn(`Failed to drop ${itemName}:`, error);
    }
  }

  async interact(bot: MineflayerBot, args: string[]): Promise<void> {
    if (args.length < 3) {
      bot.chat("Usage: interact <x> <y> <z> [type]");
      bot.chat("Types: hand, hoe, shovel, bucket, shears, axe, flint");
      bot.chat("Examples: interact 100 64 200 hand, interact 100 64 200 hoe");
      return;
    }

    const x = Number.parseFloat(args[0]);
    const y = Number.parseFloat(args[1]);
    const z = Number.parseFloat(args[2]);
    const interactionType = args.length > 3 ? args[3].toLowerCase() : "hand";

    if (isNaN(x) || isNaN(y) || isNaN(z)) {
      bot.chat("Invalid coordinates. Please provide numbers.");
      return;
    }

    try {
      // Move near the block
      const blockPos = new Vec3(x, y, z);
      const goal = new goals.GoalNear(x, y, z, 3);
      
      logger.info(`Moving to interact with block at (${x}, ${y}, ${z}) using ${interactionType}`);
      bot.chat(`Moving to interact with block at (${x}, ${y}, ${z})`);
      
      await bot.pathfinder.goto(goal);
      
      // Get the block at the position
      const targetBlock = bot.blockAt(blockPos);
      if (!targetBlock) {
        bot.chat("No block found at the specified position");
        return;
      }
      
      logger.info(`Found block: ${targetBlock.name} at (${x}, ${y}, ${z})`);
      
      // Equip the appropriate tool based on interaction type
      await this.equipInteractionTool(bot, interactionType, targetBlock.name);
      
      // Perform the interaction based on the type
      switch (interactionType) {
        case "hand":
          // Right-click interaction (activate)
          await bot.activateBlock(targetBlock);
          bot.chat(`Activated ${targetBlock.name}`);
          break;
          
        case "hoe":
          // Till dirt/grass into farmland
          if (["dirt", "grass_block", "grass"].includes(targetBlock.name)) {
            await bot.activateBlock(targetBlock);
            bot.chat(`Tilled ${targetBlock.name} into farmland`);
          } else {
            bot.chat(`Cannot till ${targetBlock.name}, need dirt or grass`);
          }
          break;
          
        case "shovel":
          // Create path from grass/dirt
          if (["dirt", "grass_block", "grass"].includes(targetBlock.name)) {
            await bot.activateBlock(targetBlock);
            bot.chat(`Created path from ${targetBlock.name}`);
          } else {
            bot.chat(`Cannot create path from ${targetBlock.name}, need dirt or grass`);
          }
          break;
          
        case "bucket":
          // Handle bucket interactions (collect/place liquid)
          const bucketItem = bot.heldItem;
          if (!bucketItem) {
            bot.chat("No bucket equipped");
            return;
          }
          
          if (bucketItem.name === "bucket") {
            // Empty bucket - try to collect liquid
            if (["water", "lava"].includes(targetBlock.name)) {
              await bot.activateBlock(targetBlock);
              bot.chat(`Collected ${targetBlock.name} with bucket`);
            } else {
              bot.chat(`Cannot collect ${targetBlock.name} with bucket`);
            }
          } else if (["water_bucket", "lava_bucket", "milk_bucket"].includes(bucketItem.name)) {
            // Full bucket - try to place liquid
            await bot.activateBlock(targetBlock);
            bot.chat(`Placed ${bucketItem.name.split('_')[0]} from bucket`);
          }
          break;
          
        case "shears":
          // Shear sheep, vines, leaves, etc.
          await bot.activateBlock(targetBlock);
          bot.chat(`Used shears on ${targetBlock.name}`);
          break;
          
        case "axe":
          // Strip logs, etc.
          if (targetBlock.name.includes("log") || targetBlock.name.includes("wood")) {
            await bot.activateBlock(targetBlock);
            bot.chat(`Used axe on ${targetBlock.name}`);
          } else {
            bot.chat(`Cannot use axe on ${targetBlock.name}`);
          }
          break;
          
        case "flint":
          // Light things on fire
          if (["tnt", "campfire", "candle"].includes(targetBlock.name)) {
            await bot.activateBlock(targetBlock);
            bot.chat(`Used flint and steel on ${targetBlock.name}`);
          } else {
            bot.chat(`Cannot use flint and steel on ${targetBlock.name}`);
          }
          break;
          
        default:
          bot.chat(`Unknown interaction type: ${interactionType}`);
          return;
      }
      
      logger.info(`Successfully interacted with ${targetBlock.name} using ${interactionType}`);
      
    } catch (error) {
      logger.error(`Error during interaction:`, error);
      bot.chat("Failed to interact with the block");
    }
  }

  private async equipInteractionTool(bot: MineflayerBot, interactionType: string, blockName: string): Promise<void> {
      /**
       * Equips the appropriate tool for a specific interaction type
       */
    try {
      const items = bot.inventory.items();
      let toolToEquip = null;
      
      switch (interactionType) {
        case "hand":
          // No tool needed
          return;
          
        case "hoe":
          // Find best hoe
          const hoeMaterials = ["netherite", "diamond", "iron", "stone", "wooden", "golden"];
          for (const material of hoeMaterials) {
            const hoe = items.find(item => item.name === `${material}_hoe`);
            if (hoe) {
              toolToEquip = hoe;
              break;
            }
          }
          break;
          
        case "shovel":
          // Find best shovel
          const shovelMaterials = ["netherite", "diamond", "iron", "stone", "wooden", "golden"];
          for (const material of shovelMaterials) {
            const shovel = items.find(item => item.name === `${material}_shovel`);
            if (shovel) {
              toolToEquip = shovel;
              break;
            }
          }
          break;
          
        case "bucket":
          // Find appropriate bucket based on block
          if (blockName === "water") {
            toolToEquip = items.find(item => item.name === "bucket");
          } else if (blockName === "lava") {
            toolToEquip = items.find(item => item.name === "bucket");
          } else {
            // For placing liquids
            toolToEquip = items.find(item => 
              ["water_bucket", "lava_bucket", "milk_bucket"].includes(item.name)
            );
          }
          break;
          
        case "shears":
          toolToEquip = items.find(item => item.name === "shears");
          break;
          
        case "axe":
          // Find best axe
          const axeMaterials = ["netherite", "diamond", "iron", "stone", "wooden", "golden"];
          for (const material of axeMaterials) {
            const axe = items.find(item => item.name === `${material}_axe`);
            if (axe) {
              toolToEquip = axe;
              break;
            }
          }
          break;
          
        case "flint":
          toolToEquip = items.find(item => item.name === "flint_and_steel");
          break;
      }
      
      if (toolToEquip) {
        await bot.equip(toolToEquip, "hand");
        logger.info(`Equipped ${toolToEquip.name} for ${interactionType} interaction`);
      } else {
        logger.warn(`No appropriate tool found for ${interactionType} interaction`);
        bot.chat(`No appropriate tool found for ${interactionType} interaction`);
      }
    } catch (error) {
      logger.warn(`Failed to equip interaction tool:`, error);
    }
  }

  async store(bot: MineflayerBot, args: string[]): Promise<void> {
    if (args.length < 4) {
      bot.chat("Usage: store <pick|put> <x> <y> <z> <item_name> [quantity]");
      bot.chat("Examples: store pick 100 64 200 diamond 5, store put 100 64 200 stone 64");
      return;
    }

    const action = args[0].toLowerCase();
    const x = parseInt(args[1]);
    const y = parseInt(args[2]);
    const z = parseInt(args[3]);
    const itemName = args[4].toLowerCase();
    const quantity = args.length >= 6 ? parseInt(args[5]) : 1;

    if (action !== "pick" && action !== "put") {
      bot.chat("Invalid action. Use 'pick' to take items or 'put' to store items.");
      return;
    }

    if (isNaN(x) || isNaN(y) || isNaN(z)) {
      bot.chat("Invalid coordinates. Please provide numbers for x, y, and z.");
      return;
    }

    if (isNaN(quantity) || quantity <= 0) {
      bot.chat("Invalid quantity. Please provide a positive number.");
      return;
    }

    try {
      // Move to the container
      const blockPos = new Vec3(x, y, z);
      const goal = new goals.GoalNear(x, y, z, 3);
      
      logger.info(`Moving to storage at (${x}, ${y}, ${z})`);
      bot.chat(`Moving to storage at (${x}, ${y}, ${z})`);
      
      await bot.pathfinder.goto(goal);
      
      // Get the block at the position
      const targetBlock = bot.blockAt(blockPos);
      if (!targetBlock) {
        bot.chat("No block found at the specified position");
        return;
      }
      
      // Check if it's a valid container
      const validContainers = [
        "chest", "trapped_chest", "barrel", "shulker_box", 
        "white_shulker_box", "orange_shulker_box", "magenta_shulker_box", 
        "light_blue_shulker_box", "yellow_shulker_box", "lime_shulker_box", 
        "pink_shulker_box", "gray_shulker_box", "light_gray_shulker_box", 
        "cyan_shulker_box", "purple_shulker_box", "blue_shulker_box", 
        "brown_shulker_box", "green_shulker_box", "red_shulker_box", "black_shulker_box"
      ];
      
      if (!validContainers.includes(targetBlock.name)) {
        bot.chat(`Block at (${x}, ${y}, ${z}) is not a container (${targetBlock.name})`);
        return;
      }
      
      // Open the container
      const container = await bot.openContainer(targetBlock);
      bot.chat(`Opened ${targetBlock.name}`);
      logger.info(`Opened ${JSON.stringify(container.slots.slice(0,container.inventoryStart),null,2)}`);
      //inventoryStart inventoryEnd
      try {
        if (action === "pick") {
          // Find the item in the container
          const containerItems = container.slots.slice(0,container.inventoryStart) || [];
          logger.info(`Container items: ${JSON.stringify(containerItems.map(i => ({ name: i?.name, count: i?.count })))}`);
          
          // More flexible item matching
          const item = containerItems.find(item => item?.name.toLocaleLowerCase() === itemName);
          
          if (!item) {
            bot.chat(`No ${itemName} found in this container`);
            return;
          }
          
          logger.info(`Found item in container: ${item.name} (${item.count})`);
          
          // Determine how many to withdraw
          const availableQuantity = item.count;
          const withdrawQuantity = Math.min(quantity, availableQuantity);
          
          // Withdraw the items
          try {
            await container.withdraw(item.type, null, withdrawQuantity);
            
            if (withdrawQuantity === quantity) {
              bot.chat(`Successfully picked up ${withdrawQuantity} ${item.name}`);
            } else {
              bot.chat(`Picked up ${withdrawQuantity}/${quantity} ${item.name} (not enough in container)`);
            }
          } catch (error: any) {
            logger.error(`Failed to withdraw item: ${error?.message}`);
            bot.chat(`Failed to pick up ${item.name}: ${error?.message}`);
          }
        } else { // action === "put"
          // Find the item in the bot's inventory
          const item = bot.inventory.items().find(item => 
            item.name.toLowerCase() === itemName || 
            item.name.toLowerCase().includes(itemName)
          );
          
          if (!item) {
            bot.chat(`No ${itemName} found in inventory`);
            return;
          }
          
          // Determine how many to deposit
          const availableQuantity = item.count;
          const depositQuantity = Math.min(quantity, availableQuantity);
          
          // Deposit the items
          await container.deposit(item.type, null, depositQuantity);
          
          if (depositQuantity === quantity) {
            bot.chat(`Successfully stored ${depositQuantity} ${item.name}`);
          } else {
            bot.chat(`Stored ${depositQuantity}/${quantity} ${item.name} (not enough in inventory)`);
          }
        }
      } finally {
        // Always close the container
        await container.close();
        bot.chat(`Closed ${targetBlock.name}`);
      }
    } catch (error: any) {
      logger.error(`Error during storage operation:`, error);
      bot.chat(`Failed to ${action} items: ${error?.message}`);
    }
  }

  async feature(bot: MineflayerBot, args: string[], featureList: Set<{name: string, status: boolean}>): Promise<void> {
    if (args.length === 0) {
      bot.chat("Usage: feature <list | chat | commandName | commandCategory | all> [on|off]");
      return;
    }

    const target = args[0].toLowerCase();
    const action = args.length > 1 ? args[1].toLowerCase() : "on"; // Default to "on" (disable)
    
    if (target === "list") {
      const disabledFeatures = Array.from(featureList);
      bot.chat(`Features: ${disabledFeatures.join(", ")}`);
      logger.info(`Features status: ${Array.from(featureList).join(", ")}`);
      return;
    }

    // if (action === "on") {
    //   // Disable the feature
    //   featureList.add(target);
    //   bot.chat(`Disabled: ${target}`);
    //   logger.info(`Disabled feature: ${target}`);
    // } else if (action === "off") {
    //   // Enable the feature
    //   featureList.delete(target);
    //   bot.chat(`Enabled: ${target}`);
    //   logger.info(`Enabled feature: ${target}`);
    // } else {
    //   bot.chat(`Invalid action. Use "on" to disable or "off" to enable.`);
    //   return;
    // }
    
    // Log current disabled features
    logger.info(`Currently disabled features: ${Array.from(featureList).join(", ")}`);
  }
}
