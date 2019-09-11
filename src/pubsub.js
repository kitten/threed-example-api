const { PostgresPubSub } = require("graphql-postgres-subscriptions");
const constants = require('./constants');

const pubsub = new PostgresPubSub({
  connectionString: constants.POSTGRES_CONNECTION
});

module.exports = pubsub;
