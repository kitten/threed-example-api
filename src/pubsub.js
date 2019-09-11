const { PostgresPubSub } = require("graphql-postgres-subscriptions");
const constants = require('./constants');

const pubsub = new PostgresPubSub({
  user: constants.POSTGRES_USER,
  host: constants.POSTGRES_HOST,
  database: constants.POSTGRES_DB,
  password: constants.POSTGRES_PASSWORD,
});

module.exports = pubsub;
