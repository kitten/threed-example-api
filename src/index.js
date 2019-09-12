const { ApolloServer } = require('apollo-server-express');
const { execute, subscribe } = require('graphql');
const { SubscriptionServer } = require('subscriptions-transport-ws');
const { createServer } = require('http');
const express = require('express');

const database = require('./database');
const schema = require('./schema');
const crypt = require('./crypt');
const auth = require('./auth');

const DEV = process.env.NODE_ENV !== 'production';
const PORT = process.env.PORT || 3000;

const context = {
  db: database,
  jwt: auth,
  crypt
};

const server = new ApolloServer({
  typeDefs: schema.typeDefs,
  resolvers: schema.resolvers,
  cacheControl: false,
  cors: true,
  tracing: DEV,
  introspection: DEV,
  subscriptions: false,
  playground: DEV ? {
    endpoint: '/graphql',
    subscriptionEndpoint: '/subscriptions',
  } : false,
  context: ({ req, connection }) => {
    if (connection) {
      return context;
    } else {
      return { ...context, user: (req && req.user) || null };
    }
  }
});

const app = express();
const http = createServer(app);

app.use('*', auth.middleware);

server.applyMiddleware({ app });

http.listen(PORT, () => {
  new SubscriptionServer({
    schema: server.schema,
    execute,
    subscribe,
  }, {
    server: http,
    path: '/subscriptions',
  });
});
