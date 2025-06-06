import 'dotenv/config'
import express from 'express'
import {
	ButtonStyleTypes,
	InteractionResponseFlags,
	InteractionResponseType,
	InteractionType,
	MessageComponentTypes,
	verifyKeyMiddleware,
} from 'discord-interactions'
import createEmbed from './embed.js'
import decodeMon from './decoder.js'
import {db} from './db.js'
import DiscordRequest from './commands.js'

// Create an express app
const app = express()
// Get port, or default to 3000
const PORT = process.env.PORT || 3000

const ratings = (() => {
	let ratings = []
	for (let i = 1; i <= 5; i++) {
		ratings.push({
			label: '⭐'.repeat(i),
			value: String(i)
		})
	}
	return ratings
})()

app.post('/interactions', verifyKeyMiddleware(process.env.PUBLIC_KEY), async function (req, res) {
	// Interaction id, type and data
	const { token, type, data, message } = req.body
	let userId = req.body.context === 0 ? req.body.member.user.id : req.body.user.id
	/**
	 * Handle verification requests
	 */
	if (type === InteractionType.PING) {
		return res.send({ type: InteractionResponseType.PONG })
	}

	if (type === InteractionType.MESSAGE_COMPONENT) {
		const { custom_id, values } = data

		if (custom_id === 'user_rating') {
			const [score] = values
			const monId = message.components[0].id
			return rateMon(monId, score)
		} else if (custom_id === 'remove_mon') {
			removeMon(message.components[0].id)
			try {
				await DiscordRequest(`/webhooks/${process.env.APP_ID}/${token}/messages/${message.id}`, {
					method: 'DELETE'
				})
			} catch (err) {
				console.error(err)
			}
			return
		} else if (custom_id === 'view_collection') {
			userId = message.mentions[0].id
			const stmt = db.prepare('SELECT id, gachamon FROM collection WHERE user_id=? ORDER BY id LIMIT 10;')
			const results = stmt.all(userId)
			return res.send({
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: pageResults(results, 1)
			})
		} else if (custom_id === 'next_page') {
			userId = message.mentions[0].id
			const stmt = db.prepare('SELECT id, gachamon FROM collection WHERE user_id=? ORDER BY id LIMIT 10 OFFSET ?;')
			let page = message.components[0].id
			const results = stmt.all(userId, (page++) * 10)
			return res.send({
				type: InteractionResponseType.UPDATE_MESSAGE,
				data: pageResults(results, page)
			})
		}
	}

	if (type === InteractionType.APPLICATION_COMMAND) {
		const { name, resolved, options } = data

		if (name === 'addmon') {
			const buf = Buffer.from(lookupOption('code'), 'base64')
			const data = decodeMon(buf)
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
			const { changes, lastInsertRowid } = stmt.run(userId, buf)
			if (!changes) {
				return res.send({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						flags: InteractionResponseFlags.EPHEMERAL,
						content: "This GachaMon already exists!"
					}
				})
			}
			
			res.send({
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: {
					content: "New GachaMon added!",
					embeds: [createEmbed(data, lastInsertRowid)],
				}
			})
			try {
				await DiscordRequest(`/webhooks/${process.env.APP_ID}/${token}`, {
					method: 'POST',
					body: {
						flags: InteractionResponseFlags.EPHEMERAL | InteractionResponseFlags.IS_COMPONENTS_V2,
						components: [{
							type: MessageComponentTypes.ACTION_ROW,
							id: lastInsertRowid,
							components: [{
								type: MessageComponentTypes.STRING_SELECT,
								custom_id: "user_rating",
								placeholder: "What do you think the rating should be?",
								options: ratings
							}]
						}, {
							type: MessageComponentTypes.SECTION,
							components: [{
								type: MessageComponentTypes.TEXT_DISPLAY,
								content: 'Want to remove this from your collection?'
							}],
							accessory: {
								type: MessageComponentTypes.BUTTON,
								style: ButtonStyleTypes.DANGER,
								label: 'Remove',
								custom_id: 'remove_mon'
							}
						}]
					}
				})
			} catch (err) {
				console.error(err)
			}
			return
		} else if (name === 'removemon') {
			return removeMon(lookupOption('id'))	
		} else if (name === 'ratemon') {
			let score = lookupOption('stars')
			const monId = lookupOption('id')
			return rateMon(monId, score)
		} else if (name === 'clearmons') {
			const stmt = db.prepare('DELETE FROM collection WHERE user_id=?;')
			const {changes} = stmt.run(userId)
			return res.send({
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: {
					flags: InteractionResponseFlags.EPHEMERAL,
					content: `Removed ${changes} GachaMon from your collection!`
				}
			})
		} else if (name === 'addmons') {
			const { filename, url, size } = Object.values(resolved.attachments)[0]
			if (!filename.endsWith('.gccg')) {
				return res.send({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						flags: InteractionResponseFlags.EPHEMERAL,
						content: "The file type is incorrect!"
					}
				})
			}
			let buf
			try {
				const attachment = await fetch(url)
				const arr = await attachment.bytes()
				buf = Buffer.from(arr)
			} catch (err) {
				console.error(err)
				return res.send({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						flags: InteractionResponseFlags.EPHEMERAL,
						content: "Failed to download attachment!"
					}
				})
			}
			let collection = []
			for (let pos = 0; pos < size;) {
				const mon = decodeMon(buf, pos)
				if (mon) collection.push(userId, buf.subarray(pos, pos += mon.size))
				else return res.send({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						flags: InteractionResponseFlags.EPHEMERAL,
						content: "There was a problem reading the file!"
					}
				})
			}
			const stmt = db.prepare(`INSERT OR IGNORE INTO collection(user_id,gachamon)
				VALUES ${'(?,?),'.repeat(collection.length).slice(0, -1)};`)
			const {changes} = stmt.run(...collection)
			return res.send({
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: {
					flags: InteractionResponseFlags.EPHEMERAL,
					content: `Added ${changes} GachaMon from file!`
				}
			})
		} else if (name === 'collection') {
			userId = lookupOption('owner', userId)
			if (options[0].name === 'search') {
				const stmt = db.prepare('SELECT id, gachamon FROM collection WHERE user_id=?;')
				let results = stmt.all(userId)
				results.forEach(r => Object.assign(r, decodeMon(r.gachamon)))
				const species = lookupOption('species', '').toLowerCase()
				const ability = lookupOption('ability', '').toLowerCase()
				const move = lookupOption('move', '').toLowerCase()
				results = results.filter(r => r.name.toLowerCase().includes(species) &&
									r.ability.toLowerCase().includes(ability) &&
									r.moves.some(m => m && m.toLowerCase().includes(move))
				)
				return res.send({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						flags: InteractionResponseFlags.EPHEMERAL,
						content: 'Search results:',
						embeds: results.slice(0, 10).map(r => createEmbed(r, r.id))
					}
				})
			} else if (options[0].name === 'ratings') {
				const stmt = db.prepare(`SELECT mon_id, gachamon, score AS rating FROM collection, ratings
					WHERE ratings.user_id=? AND mon_id=collection.id ORDER BY ratings.id DESC LIMIT 10;`)
				const results = stmt.all(userId)
				results.forEach(r => Object.assign(r, decodeMon(r.gachamon)))
				return res.send({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						flags: InteractionResponseFlags.EPHEMERAL,
						content: `<@${userId}>'s recent ratings:`,
						embeds: results.map(r => createEmbed(r, r.mon_id, r.rating))
					}
				})
			} else if (options[0].name === 'list') {
				const stmt = db.prepare('SELECT DISTINCT user_id FROM collection;')
				stmt.setReadBigInts(true)
				const results = stmt.all()
				return res.send({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						flags: InteractionResponseFlags.EPHEMERAL,
						content: results.map(r => `<@${r.user_id}>`).join()
					}
				})
			} else if (lookupOption('top10', false)) {
				const stmt = db.prepare('SELECT id, gachamon FROM collection WHERE user_id=?;')
				const results = stmt.all(userId)
				results.forEach(r => Object.assign(r, decodeMon(r.gachamon)))
				results.sort((a, b) => b.score - a.score)
				return res.send({
					type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
					data: {
						flags: InteractionResponseFlags.EPHEMERAL,
						content: `<@${userId}>'s top 10 GachaMon:`,
						embeds: results.slice(0, 10).map(r => createEmbed(r, r.id))
					}
				})
			}
			return res.send({
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: {
					flags: InteractionResponseFlags.IS_COMPONENTS_V2,
					components: [{
						type: MessageComponentTypes.SECTION,
						components: [{
							type: MessageComponentTypes.TEXT_DISPLAY,
							content: `<@${userId}>'s GachaMon collection:`
						}],
						accessory: {
							type: MessageComponentTypes.BUTTON,
							style: ButtonStyleTypes.PRIMARY,
							label: 'View',
							custom_id: 'view_collection'
						}
					}]
				}
			})
		}

		console.error(`unknown command: ${name}`)
		return res.status(400).json({ error: 'unknown command' })

		function lookupOption(nameKey, defaultValue, opt=options) {
			if (opt.length === 0)//no options
				return defaultValue
			if (opt[0].options)//subcommand
				return lookupOption(nameKey, defaultValue, opt[0].options)
			const option = opt.find(o => o.name === nameKey)
			return option ? option.value : defaultValue
		}
	}

	console.error('unknown interaction type', type)
	return res.status(400).json({ error: 'unknown interaction type' })

	function rateMon(monId, score) {
		try {
			const stmt = db.prepare('INSERT OR REPLACE INTO ratings(user_id,mon_id,score) VALUES(?,?,?);')
			stmt.run(userId, monId, score)
		} catch (err) {
			console.error(err)
			return res.send({
				type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
				data: {
					content: `The ID ${monId} doesn't exist.`,
					flags: InteractionResponseFlags.EPHEMERAL
				}
			})
		}
		return res.send({
			type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
			data: {
				content: `Your response of ${'⭐'.repeat(score)} has been recorded.`,
				flags: InteractionResponseFlags.EPHEMERAL
			}
		})
	}

	function removeMon(monId) {
		const stmt = db.prepare('DELETE FROM collection WHERE user_id=? AND id=?;')
		const {changes} = stmt.run(userId, monId)
		
		return res.send({
			type: InteractionResponseType.CHANNEL_MESSAGE_WITH_SOURCE,
			data: {
				content: changes ? 'This GachaMon has been removed!' : 'You must own this GachaMon to remove it!',
				flags: InteractionResponseFlags.EPHEMERAL
			}
		})
	}

	function pageResults(results, page) {
		return {
			content: results.length ? `Page ${page} of <@${userId}>'s GachaMon collection:` : `<@${userId}> has nothing more to see!`,
			embeds: results.map(r => createEmbed(decodeMon(r.gachamon), r.id)),
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
	}
})
app.listen(PORT, () => console.log('Listening on port', PORT))
