import 'dotenv/config';
import { REST, Routes } from 'discord.js';
import { commands } from './commands.js';
import { extendedCommands, contextMenuCommands } from './commands-extended.js';

const token = process.env.DISCORD_TOKEN;
const appId = process.env.DISCORD_APP_ID;
const guildId = process.env.DISCORD_GUILD_ID;

if (!token) throw new Error('Missing DISCORD_TOKEN in .env');
if (!appId) throw new Error('Missing DISCORD_APP_ID in .env');
if (!guildId) throw new Error('Missing DISCORD_GUILD_ID in .env');

// Merge all commands
const allCommands = [...commands, ...extendedCommands, ...contextMenuCommands];

const rest = new REST({ version: '10' }).setToken(token);

console.log(`Registering ${allCommands.length} guild slash commands...`);
await rest.put(Routes.applicationGuildCommands(appId, guildId), { body: allCommands });
console.log(`Registered ${allCommands.length} commands successfully.`);
