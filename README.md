# Gacha Bot

This is a Discord bot that integrates with the [GachaMon](https://github.com/besteon/Ironmon-Tracker/wiki/GachaMon-Collectable-Card-Game) component of the ironMON tracker. The app is written in Node.js using a SQLite database. It supports the following commands:

* `/addmon <code>` adds a GachaMon to your collection using the shareable code string from the tracker.
* `/addmons <file>` takes a `.gccg` file from your tracker's `gachamon` folder and adds all of the entries to your collection.
* `/removemon <id>` removes the GachaMon with the specified ID number from your collection.
* `/ratemon <id> <stars>` rate the GachaMon with the specified ID number from 1-5 stars. This doesn't affect the actual rating. In the future these ratings may be used for aggregate purposes.
* `/clearmons` removes all GachaMon from your collection.
* `/collection view <@user> <top10>` shares a user's collection. If no user is specified, defaults to the sender. If `top10` is true, shows the 10 highest rated GachaMon in descending order.
* `/collection search <@user> <species> <ability> <move>` searches a user's collection for certain GachaMon. If no user is specified, defaults to the sender.
* `/collection ratings <@user>` shows a user's 10 most recent ratings. If no user is specified, defaults to the sender.

## Installation

If you would like to add this bot, you can use the following link: https://discord.com/oauth2/authorize?client_id=1372650395381268610

Follow along with the instructions Discord gives you. There are two installation options: server and user.

### Server Install

For server owners, this allows the bot to be joined to your server. This will allow anyone in the server to use it. You may want to consider making a bot channel, so as not to spam other channels. You will also need to give everyone (or only certain roles) the "Use Application Commands" permission in that channel.

### User Install

The bot will be added to your account. This allows you to use the bot in any server, however the messages will be private unless you're given the "Use Application Commands" permission in that server/channel. You can also open a DM with the bot to message it privately. This is recommended for adding multiple GachaMon to your collection.
