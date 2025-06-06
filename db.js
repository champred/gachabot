import {DatabaseSync} from 'node:sqlite'

export const db = new DatabaseSync('db/db.sqlite3')

db.exec(`CREATE TABLE IF NOT EXISTS collection(
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    gachamon BLOB NOT NULL UNIQUE
);`)
db.exec(`CREATE TABLE IF NOT EXISTS ratings(
    id INTEGER PRIMARY KEY,
    user_id INTEGER NOT NULL,
    mon_id INTEGER NOT NULL,
    score INTEGER NOT NULL,
    UNIQUE(user_id,mon_id),
    FOREIGN KEY(mon_id) REFERENCES collection(id) ON DELETE CASCADE
);`)
