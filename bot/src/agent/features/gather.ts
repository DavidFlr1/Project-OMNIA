import type { Bot as MineflayerBot } from "mineflayer";
import { goals } from "mineflayer-pathfinder";
import { logger } from "../utils";

export class GatherCommands {
  async mine(bot: MineflayerBot, args: string[]): Promise<void> {
    if (args.length < 2) {
      bot.chat("Usage: mine <block_type> <quantity_to_mine> [range] [scout] [scout_tries]");
      return;
    }

    const blockType = args[0];
    const quantity = parseInt(args[1]);
    const range = args[2] ? parseInt(args[2]) : 32;
    const scout = args[3] ? args[3].toLowerCase() === "true" : false;
    const scoutTries = args[4] ? parseInt(args[4]) : 3;

    if (isNaN(quantity) || quantity <= 0) {
      bot.chat("Invalid quantity to mine");
      return;
    }

    try {
      bot.chat(
        `Looking for ${quantity} ${blockType}(s) within range ${range}. Scout ${
          scout ? "enabled" : "disabled"
        } with ${scoutTries} tries`
      );

      let mined = 0;
      let tries = 0;

      while (mined < quantity && tries <= scoutTries) {
        const block = bot.findBlock({
          matching: (block) => block.name === blockType,
          maxDistance: range,
        });

        if (!block) {
          if (scout && tries < scoutTries) {
            bot.chat(`No ${blockType} found, scouting... (${tries + 1}/${scoutTries})`);
            // Move randomly to a nearby position
            const offsetX = Math.floor(Math.random() * 10 - 5);
            const offsetZ = Math.floor(Math.random() * 10 - 5);
            const newPos = bot.entity.position.offset(offsetX, 0, offsetZ);
            const goal = new goals.GoalBlock(newPos.x, newPos.y, newPos.z);
            await bot.pathfinder.goto(goal);
            tries++;
            continue;
          } else {
            bot.chat(`No more ${blockType} found`);
            break;
          }
        }

        // Look at the block
        await bot.lookAt(block.position.offset(0.5, 0.5, 0.5));

        // Check if the bot can mine from current position
        const canMineFromHere = bot.canDigBlock(block);

        // Only move to the block if we can't mine it from here
        if (!canMineFromHere) {
          const goal = new goals.GoalNear(block.position.x, block.position.y, block.position.z, 1);
          await bot.pathfinder.goto(goal);
          await bot.lookAt(block.position.offset(0.5, 0.5, 0.5));
        }

        await bot.dig(block);

        mined++;
        bot.chat(`Mined ${mined}/${quantity} ${blockType}`);
      }

      bot.chat(`Finished mining. Total mined: ${mined} ${blockType}`);
    } catch (error) {
      logger.error("Mining failed:", error);
      bot.chat("Mining failed");
    }
  }

  async collect(bot: MineflayerBot, args: string[]): Promise<void> {
    if (args.length < 1) {
      bot.chat("Usage: collect <item_type> [amount] [range]");
      return;
    }

    const itemType = args[0].toLowerCase();
    const amount = args[1] ? Number.parseInt(args[1]) : 1;
    const range = args[2] ? Number.parseInt(args[2]) : 32;

    try {
      logger.info(`Collecting ${amount} ${itemType} from the ground within range ${range}`);
      bot.chat(`Looking for ${itemType} on the ground...`);

      // Get all entities
      const allEntities = Object.values(bot.entities);
      
      // Filter entities by type and range
      const matchingEntities = allEntities.filter(entity => {
        // Filter by entity type (both 'item' and 'other' can be dropped items)
        if (entity.type !== 'object' && entity.name !== 'item') return false;
        
        // Filter by distance
        const distance = entity.position.distanceTo(bot.entity.position);
        if (distance > range) return false;
        
        // Check if the entity's metadata contains the item we're looking for
        if (!entity.metadata) return false;
        
        // Find the metadata entry with itemId
        const itemMetadata: any = Object.values(entity.metadata).find(
          (meta: any) => meta && meta.itemId !== undefined
        );
        
        if (!itemMetadata) return false;
        
        // Get the item from registry using itemId
        const registryItem = bot.registry.items[itemMetadata?.itemId];
        if (!registryItem) return false;
        
        // Check if the item name or displayName matches what we're looking for
        const itemName = registryItem.name?.toLowerCase() || '';
        const displayName = registryItem.displayName?.toLowerCase() || '';
        
        return itemName.includes(itemType) || displayName.includes(itemType);
      });

      if (matchingEntities.length === 0) {
        bot.chat(`No ${itemType} found on the ground within range ${range}`);
        return;
      }

      bot.chat(`Found ${matchingEntities.length} ${itemType} on the ground`);
      
      // Sort by distance to prioritize closest items
      matchingEntities.sort((a, b) => 
        a.position.distanceTo(bot.entity.position) - b.position.distanceTo(bot.entity.position)
      );
      
      let collected = 0;
      for (const entity of matchingEntities.slice(0, amount)) {
        try {
          logger.info(`Moving to collect item at ${JSON.stringify(entity.position)}`);
          
          // Move to the item
          const goal = new goals.GoalNear(entity.position.x, entity.position.y, entity.position.z, 1);
          await bot.pathfinder.goto(goal);
          
          // Wait a moment to pick up the item (happens automatically when close enough)
          await new Promise(resolve => setTimeout(resolve, 1000));
          
          // Check if the entity still exists (if not, we probably collected it)
          if (!bot.entities[entity.id]) {
            collected++;
            bot.chat(`Collected ${collected}/${amount} ${itemType}`);
          }
          
          // If we've collected enough, stop
          if (collected >= amount) break;
        } catch (error) {
          logger.warn(`Failed to collect item at ${entity.position}:`, error);
        }
      }

      bot.chat(`Successfully collected ${collected} ${itemType} from the ground`);
      logger.info(`Successfully collected ${collected} ${itemType} from the ground`);
    } catch (error) {
      logger.error("Collection failed:", error);
      bot.chat("Collection failed");
    }
  }

  async harvest(bot: MineflayerBot, args: string[]): Promise<void> {
    if (args.length < 1) {
      bot.chat("Usage: harvest <crop_type> [quantity] [range]");
      return;
    }

    // Normalize crop type to match its plural form
    let cropType = args[0];
    const cropMappings: Record<string, string> = {
      "carrot": "carrots",
      "potato": "potatoes",
      "beetroot": "beetroots",
      "wheat": "wheat",
    };
    
    // Check if we need to convert from singular to plural
    if (cropMappings[cropType]) {
      cropType = cropMappings[cropType];
    }
    
    const quantity = args[1] ? parseInt(args[1]) : 10;
    const range = args[2] ? parseInt(args[2]) : 32;

    try {
      logger.info(`Harvesting ${cropType} within range ${range}`);
      bot.chat(`Harvesting ${cropType}...`);

      const crops = bot.findBlocks({
        matching: (block) => {
          // Check if it's a mature crop
          return block.name === cropType && this.isMatureCrop(block);
        },
        maxDistance: range,
        count: quantity,
      });

      if (crops.length === 0) {
        bot.chat(`No mature ${cropType} found within range`);
        return;
      }

      let harvested = 0;
      for (const cropPos of crops) {
        try {
          const block = bot.blockAt(cropPos);
          if (block) {
            const goal = new goals.GoalBlock(cropPos.x, cropPos.y, cropPos.z);
            await bot.pathfinder.goto(goal);
            await bot.dig(block);
            harvested++;
          }
        } catch (error) {
          logger.warn(`Failed to harvest crop at ${cropPos}:`, error);
        }
      }

      bot.chat(`Harvested ${harvested} ${cropType}`);
      logger.info(`Successfully harvested ${harvested} ${cropType}`);
    } catch (error) {
      logger.error("Harvesting failed:", error);
      bot.chat("Harvesting failed");
    }
  }

  // Helper functions
  private isMatureCrop(block: any): boolean {
    // Check if crop is mature based on metadata/state
    // This is a simplified check - in practice, you'd check the block state
    const matureCrops = ["wheat", "carrots", "potatoes", "beetroots"];
    return matureCrops.includes(block.name) && block.metadata === 7;
  }
}
