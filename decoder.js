import pokemon from './data/pokemon.json' with {type: 'json'}
import abilities from './data/abilities.json' with {type: 'json'}
import moves from './data/moves.json' with {type: 'json'}
//TODO find a way to do this dynamically
moves[354].name = "Disarming Voice"
moves[355].name = "Draining Kiss"
moves[356].name = "Play Rough"
moves[357].name = "Fairy Wind"
moves[358].name = "Moonblast"
moves[359].name = "Dazzling Gleam"

function binaryUnpack(format, stream, pos = 0) {
	const vars = [];
	let iterator = pos;
	let endianness = true; // Little-endian by default

	const getBytes = (length) => {
		const bytes = stream.slice(iterator, iterator + length);
		iterator += length;
		return bytes;
	};

	for (let i = 0; i < format.length; i++) {
		const opt = format[i];

		if (opt === '<') {
			endianness = true; // Little-endian
		} else if (opt === '>') {
			endianness = false; // Big-endian
		} else if (/[bBhHiIlL]/.test(opt)) {
			const n = /[hH]/.test(opt) ? 2 : /[iI]/.test(opt) ? 4 : /[lL]/.test(opt) ? 8 : 1;
			const signed = opt.toLowerCase() === opt;

			let val = 0;
			const bytes = getBytes(n);
			for (let j = 0; j < n; j++) {
				const byte = bytes[endianness ? j : n - j - 1];
				val += byte * Math.pow(2, j * 8);
			}

			if (signed && val >= Math.pow(2, n * 8 - 1)) {
				val -= Math.pow(2, n * 8);
			}

			vars.push(Math.floor(val));
		} else if (/[fd]/.test(opt)) {
			const n = opt === 'd' ? 8 : 4;
			const bytes = getBytes(n);
			const buffer = new ArrayBuffer(n);
			const view = new DataView(buffer);

			// Copy bytes into ArrayBuffer
			for (let j = 0; j < n; j++) {
				const byte = bytes[endianness ? j : n - j - 1];
				new Uint8Array(buffer)[j] = byte;
			}

			if (opt === 'd') {
				vars.push(view.getFloat64(0, endianness));
			} else {
				vars.push(view.getFloat32(0, endianness));
			}
		} else if (opt === 's') {
			const bytes = [];
			while (iterator < stream.length) {
				const char = stream[iterator];
				if (char === '\0') {
					break;
				}
				bytes.push(char);
				iterator++;
			}
			iterator++; // Skip null terminator
			vars.push(bytes.join(''));
		} else if (opt === 'c') {
			const nMatch = format.slice(i + 1).match(/^\d+/);
			const len = nMatch ? parseInt(nMatch[0], 10) : 1;
			const length = len > 0 ? len : vars.pop();

			vars.push(stream.slice(iterator, iterator + length));
			iterator += length;
			if (nMatch) {
				i += nMatch[0].length;
			}
		}
	}
	return vars;
}

const formats = [{}, {
	format: "BIHBBBHBBBIIII",
	size: 31,
	reader(stream, pos) {
		const unp = binaryUnpack(this.format, stream, pos)
		return {
			size: this.size,
			species: unp[2] & 0x7ff,
			hp: unp[10] & 0x3ff,
			lv: unp[3] & 0x7f,
			atk: (unp[10] & (0x3ff << 10)) >> 10,
			def: (unp[10] & (0x3ff << 20)) >> 20,
			ability: unp[4],
			spa: unp[11] & 0x3ff,
			spd: (unp[11] & (0x3ff << 10)) >> 10,
			spe: (unp[11] & (0x3ff << 20)) >> 20,
			moves: [
				unp[12] & 0x1ff,
				(unp[12] & (0x1ff << 9)) >> 9,
				(unp[12] & (0x1ff << 18)) >> 18,
				((unp[12] & (0x1ff << 27)) >> 27) + ((unp[13] & 0xf) << 5)
			],
			score: unp[5],
			shiny: Boolean(unp[13] & 256),
			gender: (unp[13] & 0x600) >> 9,
			nature: (unp[13] & 0xf800) >> 11,
			date: new Date(
				((unp[13] & (0x7f << 25)) >> 25) + 2000,//year
				((unp[13] & (0xf << 21)) >> 21) - 1,//month
				(unp[13] & (0x1f << 16)) >> 16//day
			)
		}
	}
}]

export default function decodeMon(stream, pos = 0) {
	let data
	try {
		const [version] = binaryUnpack("B", stream)
		data = formats[version].reader(stream, pos)
		data.version = version
		data.bst = pokemon[data.species - 1].bst
		data.types = pokemon[data.species - 1].types
		data.name = pokemon[data.species - 1].name
		data.ability = abilities[data.ability - 1].name
		data.moves = data.moves.map(m => (moves[m - 1] || {}).name)
		return data
	} catch (err) {
		console.error(err)
		return null
	} finally {
		console.dir(data)
	}
}
