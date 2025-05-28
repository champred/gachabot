import 'dotenv/config';

const reqHeaders = new Headers({
	Authorization: `Bot ${process.env.DISCORD_TOKEN}`,
	'Content-Type': 'application/json; charset=UTF-8',
})

export default async function DiscordRequest(endpoint, options) {
	// append endpoint to root API URL
	const url = 'https://discord.com/api/v10/' + endpoint;
	// Stringify payloads
	if (options.body) options.body = JSON.stringify(options.body);
	// Use fetch to make requests
	const res = await fetch(url, {
		headers: reqHeaders,
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

async function InstallGlobalCommands(appId, commands) {
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

const FILE_COMMAND = {
	name: 'addmons',
	type: 1,
	description: 'Add an entire GachaMon collection!',
	options: [{
		type: 11,
		name: 'file',
		description: 'Collection file (.gccg extension)',
		required: true
	}]
}

const CLEAR_COMMAND = {
	name: 'clearmons',
	type: 1,
	description: 'Clear out your GachaMon collection!'
}

const REMOVE_COMMAND = {
	name: 'removemon',
	type: 1,
	description: 'Remove a GachaMon from your collection!',
	options: [{
		type: 4,
		name: 'id',
		description: 'The ID number to remove.',
		required: true
	}]
}

const RATE_COMMAND = {
	name: 'ratemon',
	type: 1,
	description: 'Rate a GachaMon in your collection!',
	options: [{
		type: 4,
		name: 'id',
		description: 'The ID number to rate.',
		required: true
	}, {
		type: 4,
		name: 'stars',
		description: 'The number of stars (1-5) to rate it as.',
		min_value: 1,
		max_value: 5,
		required: true
	}]
}

const VIEW_COMMAND = {
	name: 'collection',
	type: 1,
	description: 'Access a collection of GachaMon for viewing!',
	options: [{
		type: 1,
		name: 'view',
		description: 'Share the entire collection.',
		options: [{
			type: 6,
			name: 'owner',
			description: 'The user who owns the collection. Defaults to your own.'
		}, {
			type: 5,
			name: 'top10',
			description: 'Show the top 10 highest rated GachaMon in the collection.'
		}]
	}, {
		type: 1,
		name: 'search',
		description: 'Filter the collection to only contain certain results.',
		options: [{
			type: 6,
			name: 'owner',
			description: 'The user who owns the collection. Defaults to your own.'
		}, {
			type: 3,
			name: 'species',
			description: 'The name of the Pokémon species to search for.'
		}, {
			type: 3,
			name: 'ability',
			description: 'The name of the Pokémon ability to search for.'
		}, {
			type: 3,
			name: 'move',
			description: 'The name of the Pokémon move to search for.'
		}]
	}]
}

InstallGlobalCommands(process.env.APP_ID, [ADD_COMMAND, VIEW_COMMAND, FILE_COMMAND, CLEAR_COMMAND, REMOVE_COMMAND, RATE_COMMAND]);