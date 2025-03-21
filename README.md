# GWY-BOT-SRC-BY-lordxdev
Officially From Lunar Developments


# Discord Giveaway Bot

A Discord bot for managing giveaways with MongoDB integration.

## Credits
Created by Lunar Developments
© 2024 Lunar Developments. All rights reserved.

Licensed under MIT License

## Features
- Create giveaways
- End giveaways
- Reroll winners
- Download giveaway data
- Custom prefix per server
- MongoDB integration

## Setup
1. Create `.env` file with your Discord token and MongoDB URI
2. Install dependencies: `npm install`
3. Start the bot: `node index.js`

## Commands
- `!gstart [duration] [winners] [prize]` - Start a giveaway
- `!gend [messageId]` - End a giveaway
- `!greroll [messageId]` - Reroll a winner
- `!gdownload` - Download giveaway data
- `!prefix [newPrefix]` - Change server prefix
