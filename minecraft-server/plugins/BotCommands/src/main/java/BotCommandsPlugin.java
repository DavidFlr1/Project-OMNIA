import org.bukkit.plugin.java.JavaPlugin;
import org.bukkit.command.Command;
import org.bukkit.command.CommandSender;
import org.bukkit.command.TabCompleter;
import org.bukkit.entity.Player;
import org.bukkit.Bukkit;
import com.google.gson.Gson;
import com.google.gson.JsonObject;
import org.bukkit.ChatColor;
import org.bukkit.Material;

import java.io.FileReader;
import java.util.*;

public class BotCommandsPlugin extends JavaPlugin implements TabCompleter {
    
    private JsonObject commandsData;
    private List<String> commandNames;
    
    @Override
    public void onEnable() {
        loadCommandsJson();
        getCommand("bot").setExecutor(this);
        getCommand("bot").setTabCompleter(this);
        getLogger().info("BotCommands plugin enabled!");
    }
    
    private void loadCommandsJson() {
        try {
            // Try to load from plugin folder only
            String[] paths = {
                getDataFolder() + "/commands.json",
                "commands.json"
            };
            
            for (String path : paths) {
                try {
                    getLogger().info("Trying to load commands from: " + path);
                    FileReader reader = new FileReader(path);
                    commandsData = new Gson().fromJson(reader, JsonObject.class);
                    reader.close();
                    
                    // Extract command names from nested structure
                    commandNames = new ArrayList<>();
                    JsonObject commands = commandsData.getAsJsonObject("commands");
                    if (commands != null) {
                        for (String category : commands.keySet()) {
                            JsonObject categoryCommands = commands.getAsJsonObject(category);
                            if (categoryCommands != null) {
                                for (String commandName : categoryCommands.keySet()) {
                                    JsonObject commandInfo = categoryCommands.getAsJsonObject(commandName);
                                    // Only add commands that have status: true
                                    if (commandInfo != null && commandInfo.has("status") && 
                                        commandInfo.get("status").getAsBoolean()) {
                                        commandNames.add(commandName);
                                    }
                                }
                            }
                        }
                    }
                    
                    getLogger().info("Successfully loaded " + commandNames.size() + " commands from " + path);
                    return;
                } catch (Exception e) {
                    getLogger().warning("Failed to load from " + path + ": " + e.getMessage());
                }
            }
            
            // Fallback - hardcode basic commands
            commandNames = Arrays.asList("goto", "follow", "mine", "status", "inventory");
            getLogger().warning("Could not load commands.json, using fallback commands");
            
        } catch (Exception e) {
            getLogger().severe("Failed to load commands: " + e.getMessage());
        }
    }
    
    @Override
    public boolean onCommand(CommandSender sender, Command command, String label, String[] args) {
        if (!(sender instanceof Player)) {
            sender.sendMessage("Only players can use this command!");
            return true;
        }
        
        Player player = (Player) sender;
        
        if (args.length < 2) {
            player.sendMessage(ChatColor.RED + "Usage: /bot <target_player> <command> [args...]");
            player.sendMessage(ChatColor.GOLD + "Available commands: " + ChatColor.WHITE + String.join(", ", commandNames));
            return true;
        }
        
        String targetPlayer = args[0];
        String botCommand = args[1];
        String[] commandArgs = Arrays.copyOfRange(args, 2, args.length);
        
        // Check if target player exists
        Player target = Bukkit.getPlayer(targetPlayer);
        if (target == null) {
            player.sendMessage("§c Player '" + targetPlayer + "' not found!");
            return true;
        }
        
        // Check if command exists
        if (!commandNames.contains(botCommand)) {
            player.sendMessage(ChatColor.RED + "Unknown command: " + botCommand);
            player.sendMessage(ChatColor.GOLD + "Available: " + ChatColor.WHITE + String.join(", ", commandNames));
            return true;
        }
        
        // Build the whisper command
        String fullCommand = "!" + targetPlayer + " " + botCommand;
        if (commandArgs.length > 0) {
            fullCommand += " " + String.join(" ", commandArgs);
        }
        
        // Send whisper to the bot
        player.performCommand("tell " + targetPlayer + " " + fullCommand);
        
        // Confirm to sender
        player.sendMessage(ChatColor.GREEN + "Command sent to " + targetPlayer + ": " + ChatColor.WHITE + botCommand + " " + String.join(" ", commandArgs));
        
        return true;
    }
    
    private List<String> getAllBlocks() {
        List<String> blocks = new ArrayList<>();
        for (Material material : Material.values()) {
            if (material.isBlock()) {
                blocks.add(material.name().toLowerCase());
            }
        }
        return blocks;
    }

    private List<String> getAllItems() {
        List<String> items = new ArrayList<>();
        for (Material material : Material.values()) {
            if (material.isItem()) {
                items.add(material.name().toLowerCase());
            }
        }
        return items;
    }
    
    @Override
    public List<String> onTabComplete(CommandSender sender, Command command, String alias, String[] args) {
        List<String> completions = new ArrayList<>();
        
        if (args.length == 1) {
            // First arg: target player names
            String partial = args[0].toLowerCase();
            for (Player p : Bukkit.getOnlinePlayers()) {
                if (p.getName().toLowerCase().startsWith(partial)) {
                    completions.add(p.getName());
                }
            }
        } else if (args.length == 2) {
            // Second arg: command names
            String partial = args[1].toLowerCase();
            for (String cmd : commandNames) {
                if (cmd.startsWith(partial)) {
                    completions.add(cmd);
                }
            }
        } else if (args.length > 2) {
            // Additional args: smart suggestions based on command
            String cmd = args[1].toLowerCase();
            int argIndex = args.length - 3; // 0-based argument index
            
            switch (cmd) {
                case "goto":
                    if (argIndex == 0) completions.add("<x>");
                    else if (argIndex == 1) completions.add("<y>");
                    else if (argIndex == 2) completions.add("<z>");
                    break;
                    
                case "follow":
                case "reach":
                    if (argIndex == 0) {
                        for (Player p : Bukkit.getOnlinePlayers()) {
                            completions.add(p.getName());
                        }
                    }
                    break;
                    
                case "mine":
                    if (argIndex == 0) {
                        completions.addAll(getAllBlocks());
                    } else if (argIndex == 1) completions.add("<quantity>");
                    else if (argIndex == 2) completions.add("<range>");
                    break;
                    
                case "collect":
                    if (argIndex == 0) {
                        completions.addAll(getAllItems());
                    } else if (argIndex == 1) completions.add("<amount>");
                    else if (argIndex == 2) completions.add("<range>");
                    break;
                    
                case "harvest":
                    if (argIndex == 0) {
                        completions.addAll(Arrays.asList("wheat", "carrot", "potato", "beetroot", 
                            "pumpkin", "melon", "sugar_cane"));
                    } else if (argIndex == 1) completions.add("<quantity>");
                    else if (argIndex == 2) completions.add("<range>");
                    break;
                    
                case "place":
                    if (argIndex == 1) { // After position, suggest blocks
                        completions.addAll(getAllBlocks());
                    } else if (argIndex == 2) { // After block, suggest invasive options
                        completions.addAll(Arrays.asList("invasive", "non-invasive"));
                    }
                    break;
                    
                case "store":
                    if (argIndex == 0) {
                        completions.addAll(Arrays.asList("pick", "put"));
                    } else if (argIndex == 4) { // After coordinates, suggest items
                        completions.addAll(Arrays.asList("diamond", "iron_ingot", "gold_ingot", 
                            "emerald", "coal", "redstone"));
                    } else if (argIndex == 5) completions.add("<quantity>");
                    break;
                    
                case "equip":
                    if (argIndex == 0) {
                        completions.addAll(getAllItems());
                    } else if (argIndex == 1) {
                        completions.addAll(Arrays.asList("hand", "offhand", "head", "torso", "legs", "feet"));
                    }
                    break;
                    
                case "disable":
                    if (argIndex == 0) {
                        completions.addAll(Arrays.asList("commands", "chat", "all"));
                    } else if (argIndex == 1) {
                        completions.addAll(Arrays.asList("on", "off"));
                    }
                    break;
            }
        }
        
        return completions;
    }
}










