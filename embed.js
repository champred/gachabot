const colors = {
	normal: 0xA8A77A,
	fire: 0xEE8130,
	water: 0x6390F0,
	electric: 0xF7D02C,
	grass: 0x7AC74C,
	ice: 0x96D9D6,
	fighting: 0xC22E28,
	poison: 0xA33EA1,
	ground: 0xE2BF65,
	flying: 0xA98FF3,
	psychic: 0xF95587,
	bug: 0xA6B91A,
	rock: 0xB6A136,
	ghost: 0x735797,
	dragon: 0x6F35FC,
	dark: 0x705746,
	steel: 0xB7B7CE,
	fairy: 0xD685AD,
}
const stats = {
	hp: { plus: [], minus: [] },
	atk: {
		plus: [1, 2, 3, 4],
		minus: [5, 10, 15, 20]
	},
	def: {
		plus: [5, 7, 8, 9],
		minus: [1, 11, 16, 21]
	},
	spa: {
		plus: [15, 16, 17, 19],
		minus: [3, 8, 13, 23]
	},
	spd: {
		plus: [20, 21, 22, 23],
		minus: [4, 9, 14, 19]
	},
	spe: {
		plus: [10, 11, 13, 14],
		minus: [2, 7, 17, 22]
	}
}

function formatStats(data) {
	let spread = []
	for (let s in stats) {
		let mod = ''
		if (stats[s].plus.includes(data.nature)) mod = '+'
		else if (stats[s].minus.includes(data.nature)) mod = '-'
		spread.push(`${s.toUpperCase()}${mod} ${data[s]}`)
	}
	return spread.join(' | ')
}

function calculateStars(score) {
	if (score >= 80) return 6
	if (score >= 67) return 5
	if (score >= 54) return 4
	if (score >= 40) return 3
	if (score >= 25) return 2
	return 1
}

export default function createEmbed(data, id, rating) {
	const stars = rating || calculateStars(data.score)
	return {
		title: '⭐ '.repeat(stars) + data.name,
		color: colors[data.types[0]],
		fields: [{
			name: 'Ability',
			value: data.ability,
			inline: true
		}, {
			name: 'BST',
			value: String(data.bst),
			inline: true
		}, {
			name: 'Rating Score',
			value: String(data.score),
			inline: true
		}, {
			name: 'ID Number',
			value: String(id),
			inline: true
		}, {
			name: 'Moves',
			value: data.moves.join('/'),
			inline: true
		}],
		description: `Level ${data.lv} stats: ${formatStats(data)}`,
		thumbnail: {
			url: `https://storage.googleapis.com/gachamon_images/sprites_anim/${encodeURIComponent(data.name.toLowerCase())}.gif`
		},
		footer: {
			text: `v${data.version}, captured on ${data.date.toDateString()}`,
			icon_url: `https://storage.googleapis.com/gachamon_images/sprites_mons/${data.species}.png`
		}
	}
}
