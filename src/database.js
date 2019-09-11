const fs = require('fs');
const path = require('path');
const knex = require('knex');
const constants = require('./constants');

const db = knex({
  client: 'pg',
  connection: constants.POSTGRES_CONNECTION
});

const seed = async () => {
  const hasTable = await db.schema.hasTable('users');
  if (!hasTable) {
    const sql = fs.readFileSync(path.join(
      __dirname,
      '../template.sql'
    )).toString();

    const statements = sql
      .split(';')
      .map(x => x.trim())
      .filter(Boolean);

    await Promise.all(
      sql
        .split(';')
        .map(x => x.trim())
        .filter(Boolean)
        .map(x => db.raw(x))
    );
  }
};

seed().catch(err => {
  console.error(err.message);
});

module.exports = db;
