const knex = require('knex');

const {
  POSTGRES_HOST = '127.0.0.1',
  POSTGRES_USER = 'postgres',
  POSTGRES_PASSWORD = 'postgres',
  POSTGRES_DB = 'postgres',
} = process.env;

const db = knex({
  client: 'pg',
  connection: {
    host: POSTGRES_HOST,
    user: POSTGRES_USER,
    password: POSTGRES_PASSWORD,
    database: POSTGRES_DB
  }
});

module.exports = db;
