@echo off
echo Building BotCommands plugin...

:: Create directories
mkdir classes 2>nul

:: Download Spigot API if not exists
if not exist spigot-api.jar (
    echo Downloading Spigot API...
    curl -o spigot-api.jar https://hub.spigotmc.org/nexus/repository/snapshots/org/spigotmc/spigot-api/1.21-R0.1-SNAPSHOT/spigot-api-1.21-R0.1-20240807.214924-87.jar
)

:: Download Gson if not exists
if not exist gson.jar (
    echo Downloading Gson...
    curl -o gson.jar https://repo1.maven.org/maven2/com/google/code/gson/gson/2.10.1/gson-2.10.1.jar
)

:: Compile
javac -cp "spigot-api.jar;gson.jar" -d classes src/main/java/*.java

:: Copy resources
xcopy src\main\resources classes /E /Y

:: Create JAR
cd classes
jar cf ../BotCommands.jar *
cd ..

:: Copy to plugins folder
copy BotCommands.jar ..\BotCommands.jar

echo Plugin built successfully!
pause