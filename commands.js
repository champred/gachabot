import 'dotenv/config';

export async function DiscordRequest(endpoint, options) {
	// append endpoint to root API URL
	const url = 'https://discord.com/api/v10/' + endpoint;
	// Stringify payloads
	if (options.body) options.body = JSON.stringify(options.body);
	// Use fetch to make requests
	const res = await fetch(url, {
		headers: {
			Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
			'Content-Type': 'application/json; charset=UTF-8',
			'User-Agent': 'DiscordBot (https://github.com/discord/discord-example-app, 1.0.0)',
		},
		...options
	});
	// throw API errors
	if (!res.ok) {
		const data = await res.json();
		console.log(res.status);
		throw new Error(JSON.stringify(data));
	}
	// return original response
	return res;
}

export async function InstallGlobalCommands(appId, commands) {
	// API endpoint to overwrite global commands
	const endpoint = `applications/${appId}/commands`;

	try {
		// This is calling the bulk overwrite endpoint: https://discord.com/developers/docs/interactions/application-commands#bulk-overwrite-global-application-commands
		await DiscordRequest(endpoint, { method: 'PUT', body: commands });
	} catch (err) {
		console.error(err);
	}
}

const ADD_COMMAND = {
	name: 'addmon',
	type: 1,
	description: 'Add a GachaMon to your collection!',
	options: [{
		type: 3,
		name: 'code',
		description: 'Shareable GachaMon code string.',
		required: true
	}]
}

const VIEW_COMMAND = {
	name: 'collection',
	type: 1,
	description: 'Share your collection of GachaMon for others to view!',
	options: [{
		type: 6,
		name: 'owner',
		description: 'The user who owns the collection.'
	}]
}

InstallGlobalCommands(process.env.APP_ID, [ADD_COMMAND, VIEW_COMMAND]);