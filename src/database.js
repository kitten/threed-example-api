const knex = require('knex');
const constants = require('./constants');

const db = knex({
  client: 'pg',
  connection: constants.POSTGRES_CONNECTION
});

module.exports = db;
