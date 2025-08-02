import type { Bot as MineflayerBot } from "mineflayer";
import { Vec3 } from "vec3";
import { goals } from "mineflayer-pathfinder";
import { logger } from "../utils";

interface Position {
  x: number;
  y: number;
  z: number;
}

interface PlacementResult {
  success: boolean;
  blockName: string;
  missingQuantity: number;
  remainingPositions: Position[];
}

export class BuildCommands {
  async place(bot: MineflayerBot, args: string[]): Promise<void> {
    if (args.length < 2) {
      bot.chat("Usage: place <position(s)> <block> [invasive|non-invasive]");
      bot.chat("Examples:");
      bot.chat("place 10 64 10 stone invasive");
      bot.chat("place 10 64 10 15 64 15 stone non-invasive");
      bot.chat("place [10 64 10, 15 64 15, 20 64 20] stone");
      return;
    }

    try {
      // Parse positions, block type, and invasive flag
      const { positions, blockType, invasive } = this.parsePlaceArguments(args);

      if (positions.length === 0) {
        bot.chat("Invalid position format");
        return;
      }

      // Check if the bot has the block in inventory
      const blockCount = this.countBlocksInInventory(bot, blockType);

      if (blockCount === 0) {
        bot.chat(`No ${blockType} blocks in inventory`);
        return;
      }

      bot.chat(
        `Placing ${Math.min(blockCount, positions.length)} ${blockType} blocks at ${positions.length} positions`
      );

      // Start placing blocks
      const result = await this.placeBlocks(bot, positions, blockType, invasive);

      if (result.success) {
        bot.chat(`Successfully placed all blocks`);
      } else {
        bot.chat(`Placement incomplete: Missing ${result.missingQuantity} ${result.blockName} blocks`);
        bot.chat(`Remaining positions: ${result.remainingPositions.length}`);
      }
    } catch (error) {
      logger.error("Block placement failed:", error);
      bot.chat("Block placement failed");
    }
  }

  private parsePlaceArguments(args: string[]): { positions: Position[]; blockType: string; invasive: boolean } {
    let positions: Position[] = [];
    let blockType: string;
    let invasive = true; // Default to invasive

    // Check if the last argument is about invasiveness
    const lastArg = args[args.length - 1].toLowerCase();
    const hasInvasiveFlag =
      lastArg === "invasive" || lastArg === "non-invasive" || lastArg === "true" || lastArg === "false";

    if (hasInvasiveFlag) {
      invasive = lastArg === "invasive" || lastArg === "true";
      // Remove the invasive flag from args
      args = args.slice(0, args.length - 1);
    }

    // The block type is the last remaining argument
    blockType = args[args.length - 1];

    // Remove the block type from args
    args = args.slice(0, args.length - 1);

    // Now args should only contain position information

    // Check if we have array notation - join all position args and check if it starts with [ and ends with ]
    const positionString = args.join(" ");
    if (positionString.trim().startsWith("[") && positionString.trim().endsWith("]")) {
      // Remove the brackets
      const positionsContent = positionString.trim().slice(1, -1);

      // Split by commas to get individual positions
      const individualPositions = positionsContent.split(",");

      for (const posStr of individualPositions) {
        const coords = posStr.trim().split(/\s+/);
        if (coords.length === 3) {
          const x = Number(coords[0]);
          const y = Number(coords[1]);
          const z = Number(coords[2]);

          if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
            positions.push({ x, y, z });
          }
        }
      }
    }
    // Case 1: Single position (x y z)
    else if (args.length === 3) {
      const x = Number(args[0]);
      const y = Number(args[1]);
      const z = Number(args[2]);

      if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
        positions.push({ x, y, z });
      }
    }
    // Case 2: Range of positions (x1 y1 z1 x2 y2 z2)
    else if (args.length === 6) {
      const x1 = Number(args[0]);
      const y1 = Number(args[1]);
      const z1 = Number(args[2]);
      const x2 = Number(args[3]);
      const y2 = Number(args[4]);
      const z2 = Number(args[5]);

      if (!isNaN(x1) && !isNaN(y1) && !isNaN(z1) && !isNaN(x2) && !isNaN(y2) && !isNaN(z2)) {
        // Generate all positions in the range
        positions = this.generatePositionsInRange(x1, y1, z1, x2, y2, z2);
      }
    }
    // Case 3: Multiple positions (must be multiple of 3)
    else if (args.length % 3 === 0) {
      for (let i = 0; i < args.length; i += 3) {
        const x = Number(args[i]);
        const y = Number(args[i + 1]);
        const z = Number(args[i + 2]);

        if (!isNaN(x) && !isNaN(y) && !isNaN(z)) {
          positions.push({ x, y, z });
        }
      }
    }

    return { positions, blockType, invasive };
  }

  private generatePositionsInRange(x1: number, y1: number, z1: number, x2: number, y2: number, z2: number): Position[] {
    const positions: Position[] = [];

    // Ensure x1 <= x2, y1 <= y2, z1 <= z2
    const [minX, maxX] = [Math.min(x1, x2), Math.max(x1, x2)];
    const [minY, maxY] = [Math.min(y1, y2), Math.max(y1, y2)];
    const [minZ, maxZ] = [Math.min(z1, z2), Math.max(z1, z2)];

    for (let x = minX; x <= maxX; x++) {
      for (let y = minY; y <= maxY; y++) {
        for (let z = minZ; z <= maxZ; z++) {
          positions.push({ x, y, z });
        }
      }
    }

    return positions;
  }

  private countBlocksInInventory(bot: MineflayerBot, blockType: string): number {
    let count = 0;

    // Check all inventory slots
    const items = bot.inventory.items();
    logger.info(`Inventory item: ${JSON.stringify(items, null, 2)}`);
    for (const item of items) {
      if (item.name === blockType) {
        count += item.count;
      }
    }

    return count;
  }

  private async placeBlocks(
    bot: MineflayerBot,
    positions: Position[],
    blockType: string,
    invasive: boolean
  ): Promise<PlacementResult> {
    let placedCount = 0;
    let availableBlocks = this.countBlocksInInventory(bot, blockType);
    const remainingPositions: Position[] = [];
    const temporaryBlocks: Vec3[] = []; // Track temporary scaffolding blocks

    // Equip the block if possible
    await this.equipBlock(bot, blockType);

    for (const pos of positions) {
      // Check if we have blocks left
      if (availableBlocks <= 0) {
        // Add all remaining positions to the result
        remainingPositions.push(pos);
        continue;
      }

      try {
        // Check if there's a block at the target position
        const targetBlock = bot.blockAt(new Vec3(pos.x, pos.y, pos.z));

        // If the block already exists and is the same type we want to place, skip it
        if (targetBlock && targetBlock.name === blockType) {
          logger.info(`Block at (${pos.x}, ${pos.y}, ${pos.z}) is already ${blockType}, marking as completed`);
          placedCount++;
          continue;
        }

        // Check if the bot is standing at the target position
        const botPos = bot.entity.position;
        const botIsAtTargetPos =
          Math.floor(botPos.x) === pos.x && Math.floor(botPos.y) === pos.y && Math.floor(botPos.z) === pos.z;

        if (botIsAtTargetPos) {
          logger.info(`Bot is standing at target position (${pos.x}, ${pos.y}, ${pos.z}), moving away`);
          // Move away from the target position
          const moveOffsets = [
            { x: 1, y: 0, z: 0 },
            { x: -1, y: 0, z: 0 },
            { x: 0, y: 0, z: 1 },
            { x: 0, y: 0, z: -1 },
          ];

          // Try each offset until we find a safe spot
          let movedAway = false;
          for (const offset of moveOffsets) {
            const newPos = new Vec3(botPos.x + offset.x, botPos.y, botPos.z + offset.z);
            const blockAtNewPos = bot.blockAt(newPos);

            if (blockAtNewPos && blockAtNewPos.name === "air") {
              // Move to this position
              const goal = new goals.GoalBlock(newPos.x, newPos.y, newPos.z);
              await bot.pathfinder.goto(goal);
              movedAway = true;
              break;
            }
          }

          if (!movedAway) {
            logger.warn(`Could not move away from target position, skipping`);
            remainingPositions.push(pos);
            continue;
          }
        }

        // Move near the position
        const goal = new goals.GoalNear(pos.x, pos.y, pos.z, 3);
        await bot.pathfinder.goto(goal);

        // Check if there's a block at the target position (again, after moving)
        const targetBlockAfterMove = bot.blockAt(new Vec3(pos.x, pos.y, pos.z));

        if (targetBlockAfterMove && targetBlockAfterMove.name !== "air") {
          // If it's the block we want to place, mark as completed
          if (targetBlockAfterMove.name === blockType) {
            logger.info(`Block at (${pos.x}, ${pos.y}, ${pos.z}) is already ${blockType}, marking as completed`);
            placedCount++;
            continue;
          }

          // If non-invasive, skip this position
          if (!invasive) {
            logger.info(`Skipping position (${pos.x}, ${pos.y}, ${pos.z}) - block exists and non-invasive mode`);
            remainingPositions.push(pos);
            continue;
          }

          // If invasive, break the block first
          logger.info(`Breaking existing block at (${pos.x}, ${pos.y}, ${pos.z})`);
          await this.equipBestTool(bot, targetBlockAfterMove);
          await bot.dig(targetBlockAfterMove);

          // Re-equip the block we want to place
          await this.equipBlock(bot, blockType);
        }

        // Find a reference block to place against
        let referenceBlock = this.findReferenceBlock(bot, pos);

        // If no reference block found, try to create temporary scaffolding
        if (!referenceBlock) {
          logger.info(
            `No reference block found for position (${pos.x}, ${pos.y}, ${pos.z}), creating temporary scaffolding`
          );

          // Try to create scaffolding
          const scaffoldingCreated = await this.createTemporaryScaffolding(bot, pos, temporaryBlocks);

          if (scaffoldingCreated) {
            // Try to find reference block again
            referenceBlock = this.findReferenceBlock(bot, pos);
          }

          if (!referenceBlock) {
            logger.warn(`Failed to create scaffolding for position (${pos.x}, ${pos.y}, ${pos.z})`);
            remainingPositions.push(pos);
            continue;
          }
        }

        // Determine the face to place against
        const faceVector = this.determinePlacementFace(referenceBlock.position, pos);

        // Place the block
        try {
          logger.info(
            `Attempting to place ${blockType} at (${pos.x}, ${pos.y}, ${pos.z}) against block at (${referenceBlock.position.x}, ${referenceBlock.position.y}, ${referenceBlock.position.z})`
          );
          await bot.placeBlock(referenceBlock, faceVector);

          // Verify placement was successful
          await new Promise((resolve) => setTimeout(resolve, 250)); // Small delay to allow block update
          const newBlock = bot.blockAt(new Vec3(pos.x, pos.y, pos.z));

          if (newBlock && newBlock.name === blockType) {
            placedCount++;
            availableBlocks--;
            logger.info(`Successfully placed ${blockType} at (${pos.x}, ${pos.y}, ${pos.z})`);
          } else {
            logger.warn(`Failed to verify block placement at (${pos.x}, ${pos.y}, ${pos.z})`);
            remainingPositions.push(pos);
          }
        } catch (placeError) {
          logger.warn(`Error during block placement at (${pos.x}, ${pos.y}, ${pos.z}):`, placeError);
          remainingPositions.push(pos);
        }

        // Re-equip if needed
        if (availableBlocks > 0 && placedCount % 10 === 0) {
          await this.equipBlock(bot, blockType);
        }
      } catch (error) {
        logger.warn(`Failed to place block at (${pos.x}, ${pos.y}, ${pos.z}):`, error);
        remainingPositions.push(pos);
      }
    }

    // Clean up temporary scaffolding blocks
    await this.removeTemporaryScaffolding(bot, temporaryBlocks);

    return {
      success: remainingPositions.length === 0,
      blockName: blockType,
      missingQuantity: remainingPositions.length,
      remainingPositions,
    };
  }

  private findReferenceBlock(bot: MineflayerBot, pos: Position): any {
    // Check adjacent positions for a solid block to place against
    const offsets = [
      { x: 0, y: -1, z: 0 }, // Below
      { x: 0, y: 1, z: 0 }, // Above
      { x: 1, y: 0, z: 0 }, // East
      { x: -1, y: 0, z: 0 }, // West
      { x: 0, y: 0, z: 1 }, // South
      { x: 0, y: 0, z: -1 }, // North
    ];

    for (const offset of offsets) {
      const checkPos = new Vec3(pos.x + offset.x, pos.y + offset.y, pos.z + offset.z);

      const block = bot.blockAt(checkPos);

      if (block && block.name !== "air") {
        return block;
      }
    }

    return null;
  }

  private determinePlacementFace(referencePos: Vec3, targetPos: Position): Vec3 {
    // Calculate the vector from reference block to target position
    const dx = targetPos.x - referencePos.x;
    const dy = targetPos.y - referencePos.y;
    const dz = targetPos.z - referencePos.z;

    // Determine which face to place against based on the largest component
    if (Math.abs(dx) >= Math.abs(dy) && Math.abs(dx) >= Math.abs(dz)) {
      return new Vec3(Math.sign(dx), 0, 0);
    } else if (Math.abs(dy) >= Math.abs(dx) && Math.abs(dy) >= Math.abs(dz)) {
      return new Vec3(0, Math.sign(dy), 0);
    } else {
      return new Vec3(0, 0, Math.sign(dz));
    }
  }

  private async equipBlock(bot: MineflayerBot, blockType: string): Promise<void> {
    try {
      // Find the block in inventory
      const items = bot.inventory.items();
      const blockItem = items.find((item) => item.name === blockType);

      if (blockItem) {
        await bot.equip(blockItem, "hand");
      }
    } catch (error) {
      logger.warn(`Failed to equip ${blockType}:`, error);
    }
  }

  /**
   * Creates temporary scaffolding to support placing a block in mid-air
   */
  private async createTemporaryScaffolding(
    bot: MineflayerBot,
    pos: Position,
    temporaryBlocks: Vec3[]
  ): Promise<boolean> {
    // Possible scaffolding positions (below, or adjacent)
    const scaffoldingPositions = [
      { x: pos.x, y: pos.y - 1, z: pos.z }, // Below
      { x: pos.x + 1, y: pos.y, z: pos.z }, // East
      { x: pos.x - 1, y: pos.y, z: pos.z }, // West
      { x: pos.x, y: pos.y, z: pos.z + 1 }, // South
      { x: pos.x, y: pos.y, z: pos.z - 1 }, // North
    ];

    // Find a suitable scaffolding material in inventory
    const scaffoldingMaterials = ["dirt", "cobblestone", "stone", "netherrack"];
    let scaffoldingItem = null;

    for (const material of scaffoldingMaterials) {
      const items = bot.inventory.items();
      const item = items.find((item) => item.name === material);
      if (item) {
        scaffoldingItem = item;
        break;
      }
    }

    if (!scaffoldingItem) {
      logger.warn("No suitable scaffolding material found in inventory");
      return false;
    }

    // Try to place scaffolding at one of the positions
    for (const scaffoldPos of scaffoldingPositions) {
      const scaffoldVec = new Vec3(scaffoldPos.x, scaffoldPos.y, scaffoldPos.z);
      const blockAtPos = bot.blockAt(scaffoldVec);

      // Skip if there's already a block here
      if (blockAtPos && blockAtPos.name !== "air") {
        continue;
      }

      // Find a reference block for the scaffolding
      const scaffoldRefBlock = this.findReferenceBlock(bot, scaffoldPos);
      if (!scaffoldRefBlock) {
        continue;
      }

      try {
        // Equip the scaffolding material
        await bot.equip(scaffoldingItem, "hand");

        // Determine face to place against
        const faceVector = this.determinePlacementFace(scaffoldRefBlock.position, scaffoldPos);

        // Place the scaffolding block
        await bot.placeBlock(scaffoldRefBlock, faceVector);

        // Verify placement
        await new Promise((resolve) => setTimeout(resolve, 250));
        const newBlock = bot.blockAt(scaffoldVec);

        if (newBlock && newBlock.name === scaffoldingItem.name) {
          // Add to temporary blocks list for cleanup later
          temporaryBlocks.push(scaffoldVec);
          logger.info(`Placed temporary scaffolding at (${scaffoldPos.x}, ${scaffoldPos.y}, ${scaffoldPos.z})`);

          // Re-equip the original block
          await this.equipBlock(bot, bot.heldItem?.name || "");

          return true;
        }
      } catch (error) {
        logger.warn(`Failed to place scaffolding at (${scaffoldPos.x}, ${scaffoldPos.y}, ${scaffoldPos.z}):`, error);
      }
    }

    return false;
  }

  /**
   * Removes temporary scaffolding blocks
   */
  private async removeTemporaryScaffolding(bot: MineflayerBot, temporaryBlocks: Vec3[]): Promise<void> {
    if (temporaryBlocks.length === 0) return;

    logger.info(`Removing ${temporaryBlocks.length} temporary scaffolding blocks`);

    for (const blockPos of temporaryBlocks) {
      try {
        const block = bot.blockAt(blockPos);
        if (block && block.name !== "air") {
          // Equip the best tool for breaking this block
          await this.equipBestTool(bot, block);

          await bot.dig(block);
          logger.info(`Removed temporary scaffolding at (${blockPos.x}, ${blockPos.y}, ${blockPos.z})`);
        }
      } catch (error) {
        logger.warn(`Failed to remove scaffolding at (${blockPos.x}, ${blockPos.y}, ${blockPos.z}):`, error);
      }
    }
  }

  /**
   * Equips the best tool for breaking a specific block
   */
  private async equipBestTool(bot: MineflayerBot, block: any): Promise<void> {
    try {
      // Define tool categories and their block types
      const toolCategories = {
        pickaxe: ["stone", "cobblestone", "ore", "obsidian"],
        axe: ["log", "wood", "planks"],
        shovel: ["dirt", "sand", "gravel", "clay"],
        shears: ["leaves", "wool"],
      };

      // Define tool materials in order of effectiveness
      const toolMaterials = ["netherite", "diamond", "iron", "stone", "golden", "wooden"];

      // Determine which tool category is best for this block
      let bestToolCategory = null;
      for (const [category, blockTypes] of Object.entries(toolCategories)) {
        if (blockTypes.some((type) => block.name.includes(type))) {
          bestToolCategory = category;
          break;
        }
      }

      if (!bestToolCategory) {
        // No specific tool needed, use hand
        return;
      }

      // Find the best tool in inventory
      const items = bot.inventory.items();
      let bestTool = null;

      // First try to find the best material for the right tool category
      for (const material of toolMaterials) {
        const toolName = `${material}_${bestToolCategory}`;
        const tool = items.find((item) => item.name === toolName);
        if (tool) {
          bestTool = tool;
          break;
        }
      }

      // If no specific tool found, try any tool of the right category
      if (!bestTool) {
        bestTool = items.find((item) => item.name.includes(bestToolCategory));
      }

      // Equip the tool if found
      if (bestTool) {
        await bot.equip(bestTool, "hand");
        logger.info(`Equipped ${bestTool.name} for breaking ${block.name}`);
      }
    } catch (error) {
      logger.warn(`Failed to equip best tool:`, error);
    }
  }
}
