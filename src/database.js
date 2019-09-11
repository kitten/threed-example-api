const knex = require('knex');
const constants = require('./constants');

const db = knex({
  client: 'pg',
  connection: {
    host: constants.POSTGRES_HOST,
    user: constants.POSTGRES_USER,
    password: constants.POSTGRES_PASSWORD,
    database: constants.POSTGRES_DB
  }
});

module.exports = db;
