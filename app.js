import 'dotenv/config';
import express from 'express';
import {
	ButtonStyleTypes,
	InteractionResponseFlags,
	InteractionResponseType,
	InteractionType,
	MessageComponentTypes,
	verifyKeyMiddleware,
} from 'discord-interactions';
import createEmbed from './embed.js'
import decodeMon from './decoder.js'
import {db} from './db.js'

// Create an express app
const app = express();
// Get port, or default to 3000
const PORT = process.env.PORT || 3000;

function generateRatings() {
	let ratings = []
	for (let i = 1; i <= 5; i++) {
		ratings.push({
			label: '⭐'.repeat(i),
			value: String(i)
		})
	}
	return ratings
}

app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
	// Interaction id, type and data
	const { id, type, data, message } = req.body;
	let userId = req.body.context === 0 ? req.body.member.user.id : req.body.user.id;
	/**
	 * Handle verification requests
	 */
	if (type === InteractionType.PING) {
		return res.send({ type: InteractionResponseType.PONG });
	}

	if (type === InteractionType.MESSAGE_COMPONENT) {
		const { custom_id, values } = data;
		if (custom_id === 'user_rating') {
			const [score] = values;
			const monId = message.components[0].id
			const stmt = db.prepare('INSERT OR REPLACE INTO ratings(user_id,mon_id,score) VALUES(?,?,?);')
			const { changes } = stmt.run(userId, monId, score)
			return res.send({
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: {
					content: changes ? `Your response of ${'⭐'.repeat(score)} has been recorded.` : 'There has been an error.',
					flags: InteractionResponseFlags.EPHEMERAL
				}
			})
		} else if (custom_id === 'view_collection') {
			userId = message.mentions[0].id
			const stmt = db.prepare('SELECT gachamon FROM collection WHERE user_id=? ORDER BY id LIMIT 10;')
			const results = stmt.all(userId)
			return res.send({
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: {
					content: `<@${userId}>'s GachaMon collection:`,
					embeds: results.map(r => createEmbed(decodeMon(r.gachamon))),
					flags: InteractionResponseFlags.EPHEMERAL,
					components: [{
						type: MessageComponentTypes.ACTION_ROW,
						id: 1,
						components: [{
							type: MessageComponentTypes.BUTTON,
							style: ButtonStyleTypes.PRIMARY,
							label: 'See More',
							custom_id: 'next_page'
						}]
					}]
				}
			})
		} else if (custom_id === 'next_page') {
			userId = message.mentions[0].id
			const stmt = db.prepare('SELECT gachamon FROM collection WHERE user_id=? ORDER BY id LIMIT 10 OFFSET ?;')
			let page = message.components[0].id
			const results = stmt.all(userId, (page++) * 10)
			return res.send({
				type: InteractionResponseType.UPDATE_MESSAGE,
				data: {
					content: results.length ? `Page ${page} of <@${userId}>'s GachaMon collection:` : `<@${userId}> has nothing more to see!`,
					embeds: results.map(r => createEmbed(decodeMon(r.gachamon))),
					flags: InteractionResponseFlags.EPHEMERAL,
					components: [{
						type: MessageComponentTypes.ACTION_ROW,
						id: page,
						components: [{
							type: MessageComponentTypes.BUTTON,
							style: ButtonStyleTypes.PRIMARY,
							label: 'See More',
							custom_id: 'next_page'
						}]
					}]
				}
			})
		}
	}

	if (type === InteractionType.APPLICATION_COMMAND) {
		const { name, resolved, options } = data;

		if (name === 'addmon') {
			const data = decodeMon(options[0].value)
			if (!data) {
				return res.send({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						flags: InteractionResponseFlags.EPHEMERAL,
						content: "This GachaMon is invalid!"
					}
				})
			}
			const stmt = db.prepare('INSERT OR IGNORE INTO collection(user_id,gachamon) VALUES(?,?);')
			const { changes, lastInsertRowid } = stmt.run(userId, options[0].value)
			console.dir(data)
			if (!changes) {
				return res.send({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						flags: InteractionResponseFlags.EPHEMERAL,
						content: "This GachaMon already exists!"
					}
				})
			}
			return res.send({
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: {
					content: "New GachaMon added!",
					embeds: [createEmbed(data)],
					components: [{
						type: MessageComponentTypes.ACTION_ROW,
						id: lastInsertRowid,
						components: [{
							type: MessageComponentTypes.STRING_SELECT,
							custom_id: "user_rating",
							placeholder: "What do you think the rating should be?",
							options: generateRatings()
						}]
					}]
				},
			});
		} else if (name === 'collection') {
			if (options && options[0]) userId = options[0].value
			return res.send({
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: {
					content: `<@${userId}> is sharing their GachaMon collection!`,
					components: [{
						type: MessageComponentTypes.ACTION_ROW,
						components: [{
							type: MessageComponentTypes.BUTTON,
							style: ButtonStyleTypes.PRIMARY,
							label: 'View',
							custom_id: 'view_collection'
						}]
					}]
				}
			})
		}

		console.error(`unknown command: ${name}`);
		return res.status(400).json({ error: 'unknown command' });
	}

	console.error('unknown interaction type', type);
	return res.status(400).json({ error: 'unknown interaction type' });
});

app.listen(PORT, () => {
	console.log('Listening on port', PORT);
});
