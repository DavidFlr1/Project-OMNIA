package me.indestructibleblocks;

import com.google.gson.*;
import org.bukkit.Bukkit;
import org.bukkit.ChatColor;
import org.bukkit.Material;
import org.bukkit.entity.Player;
import org.bukkit.event.EventHandler;
import org.bukkit.event.Listener;
import org.bukkit.event.block.BlockBreakEvent;
import org.bukkit.event.entity.EntityExplodeEvent;
import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabCompleter;

import java.io.File;
import java.io.FileReader;
import java.io.FileWriter;
import java.util.*;

public class IndestructibleBlocksPlugin extends JavaPlugin implements Listener, TabCompleter {

    private final Set<Material> protectedMaterials = new HashSet<>();
    private final Map<UUID, Integer> opLevels = new HashMap<>();
    private File configFile;

    @Override
    public void onEnable() {
        configFile = new File(getDataFolder(), "protected_blocks.json");
        
        loadProtectedBlocks();
        loadOpLevels();
        
        Bukkit.getPluginManager().registerEvents(this, this);
        getCommand("blocklock").setExecutor(this);
        getCommand("blocklock").setTabCompleter(this);
        
        getLogger().info("IndestructibleBlocks plugin enabled!");
    }

    private void loadProtectedBlocks() {
        if (!configFile.exists()) {
            getDataFolder().mkdirs();
            saveProtectedBlocks();
            return;
        }

        try {
            FileReader reader = new FileReader(configFile);
            JsonObject data = new Gson().fromJson(reader, JsonObject.class);
            reader.close();

            if (data != null && data.has("protected_blocks")) {
                JsonArray blocks = data.getAsJsonArray("protected_blocks");
                for (JsonElement element : blocks) {
                    try {
                        Material material = Material.valueOf(element.getAsString().toUpperCase());
                        protectedMaterials.add(material);
                    } catch (IllegalArgumentException e) {
                        getLogger().warning("Invalid material in config: " + element.getAsString());
                    }
                }
            }
            
            getLogger().info("Loaded " + protectedMaterials.size() + " protected blocks");
        } catch (Exception e) {
            getLogger().severe("Failed to load protected blocks: " + e.getMessage());
        }
    }

    private void saveProtectedBlocks() {
        try {
            JsonObject data = new JsonObject();
            JsonArray blocks = new JsonArray();
            
            for (Material material : protectedMaterials) {
                blocks.add(material.name().toLowerCase());
            }
            
            data.add("protected_blocks", blocks);
            
            FileWriter writer = new FileWriter(configFile);
            new Gson().toJson(data, writer);
            writer.close();
            
        } catch (Exception e) {
            getLogger().severe("Failed to save protected blocks: " + e.getMessage());
        }
    }

    private void loadOpLevels() {
        try {
            File ops = new File(Bukkit.getServer().getWorldContainer(), "ops.json");
            if (!ops.exists()) return;
            
            JsonArray arr = JsonParser.parseReader(new FileReader(ops)).getAsJsonArray();
            for (JsonElement el : arr) {
                JsonObject obj = el.getAsJsonObject();
                UUID uuid = UUID.fromString(obj.get("uuid").getAsString());
                int lvl = obj.get("level").getAsInt();
                opLevels.put(uuid, lvl);
            }
        } catch (Exception e) {
            getLogger().warning("Could not load ops.json: " + e.getMessage());
        }
    }

    private boolean canModify(Player p) {
        if (p.hasPermission("indestructibleblocks.bypass")) return true;
        if (p.hasPermission("indestructibleblocks.admin")) return true;
        Integer lvl = opLevels.get(p.getUniqueId());
        return lvl != null && lvl >= 3;
    }

    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (!(sender instanceof Player)) {
            sender.sendMessage("This command can only be used by players.");
            return true;
        }

        Player player = (Player) sender;

        if (args.length == 0) {
            player.sendMessage(ChatColor.GOLD + "IndestructibleBlocks Commands:");
            player.sendMessage(ChatColor.YELLOW + "/blocklock set <block>" + ChatColor.WHITE + " - Make a block indestructible");
            player.sendMessage(ChatColor.YELLOW + "/blocklock remove <block>" + ChatColor.WHITE + " - Remove block protection");
            player.sendMessage(ChatColor.YELLOW + "/blocklock list" + ChatColor.WHITE + " - List protected blocks");
            return true;
        }

        if (!canModify(player)) {
            player.sendMessage(ChatColor.RED + "You don't have permission to use this command.");
            return true;
        }

        String subCommand = args[0].toLowerCase();

        switch (subCommand) {
            case "set":
                if (args.length < 2) {
                    player.sendMessage(ChatColor.RED + "Usage: /blocklock set <block>");
                    return true;
                }
                return handleSetCommand(player, args[1]);

            case "remove":
                if (args.length < 2) {
                    player.sendMessage(ChatColor.RED + "Usage: /blocklock remove <block>");
                    return true;
                }
                return handleRemoveCommand(player, args[1]);

            case "list":
                return handleListCommand(player);

            default:
                player.sendMessage(ChatColor.RED + "Unknown subcommand: " + subCommand);
                return true;
        }
    }

    private boolean handleSetCommand(Player player, String blockName) {
        try {
            Material material = Material.valueOf(blockName.toUpperCase());
            
            if (!material.isBlock()) {
                player.sendMessage(ChatColor.RED + blockName + " is not a valid block!");
                return true;
            }

            if (protectedMaterials.contains(material)) {
                player.sendMessage(ChatColor.YELLOW + material.name().toLowerCase() + " is already protected!");
                return true;
            }

            protectedMaterials.add(material);
            saveProtectedBlocks();
            
            player.sendMessage(ChatColor.GREEN + "Added " + material.name().toLowerCase() + " to protected blocks!");
            return true;
            
        } catch (IllegalArgumentException e) {
            player.sendMessage(ChatColor.RED + "Invalid block: " + blockName);
            return true;
        }
    }

    private boolean handleRemoveCommand(Player player, String blockName) {
        try {
            Material material = Material.valueOf(blockName.toUpperCase());

            if (!protectedMaterials.contains(material)) {
                player.sendMessage(ChatColor.YELLOW + material.name().toLowerCase() + " is not currently protected!");
                return true;
            }

            protectedMaterials.remove(material);
            saveProtectedBlocks();
            
            player.sendMessage(ChatColor.GREEN + "Removed " + material.name().toLowerCase() + " from protected blocks!");
            return true;
            
        } catch (IllegalArgumentException e) {
            player.sendMessage(ChatColor.RED + "Invalid block: " + blockName);
            return true;
        }
    }

    private boolean handleListCommand(Player player) {
        if (protectedMaterials.isEmpty()) {
            player.sendMessage(ChatColor.YELLOW + "No blocks are currently protected.");
            return true;
        }

        player.sendMessage(ChatColor.GOLD + "Protected Blocks (" + protectedMaterials.size() + "):");
        
        List<String> blockNames = new ArrayList<>();
        for (Material material : protectedMaterials) {
            blockNames.add(material.name().toLowerCase());
        }
        Collections.sort(blockNames);
        
        player.sendMessage(ChatColor.WHITE + String.join(", ", blockNames));
        return true;
    }

    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String alias, String[] args) {
        List<String> completions = new ArrayList<>();

        if (args.length == 1) {
            // Subcommands
            completions.addAll(Arrays.asList("set", "remove", "list"));
        } else if (args.length == 2) {
            String subCommand = args[0].toLowerCase();
            
            if ("set".equals(subCommand)) {
                // All blocks for set command
                for (Material material : Material.values()) {
                    if (material.isBlock()) {
                        completions.add(material.name().toLowerCase());
                    }
                }
            } else if ("remove".equals(subCommand)) {
                // Only currently protected blocks for remove command
                for (Material material : protectedMaterials) {
                    completions.add(material.name().toLowerCase());
                }
            }
        }

        return completions;
    }

    @EventHandler(ignoreCancelled = true)
    public void onBlockBreak(BlockBreakEvent e) {
        if (protectedMaterials.contains(e.getBlock().getType()) && !canModify(e.getPlayer())) {
            e.setCancelled(true);
            e.getPlayer().sendMessage(ChatColor.RED + "This block is protected and cannot be broken!");
        }
    }

    @EventHandler(ignoreCancelled = true)
    public void onExplosion(EntityExplodeEvent e) {
        e.blockList().removeIf(b -> protectedMaterials.contains(b.getType()));
    }
}