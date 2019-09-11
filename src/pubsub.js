const { PostgresPubSub } = require("graphql-postgres-subscriptions");

const {
  POSTGRES_HOST = "127.0.0.1",
  POSTGRES_USER = "postgres",
  POSTGRES_PASSWORD = "postgres",
  POSTGRES_DB = "postgres"
} = process.env;

const pubsub = new PostgresPubSub({
  user: POSTGRES_USER,
  host: POSTGRES_HOST,
  database: POSTGRES_DB,
  password: POSTGRES_PASSWORD,
});

module.exports = pubsub;
