const { ApolloServer } = require('apollo-server-express');
const { execute, subscribe } = require('graphql');
const { SubscriptionServer } = require('subscriptions-transport-ws');
const { createServer } = require('http');
const cors = require('cors');
const express = require('express');

const database = require('./database');
const schema = require('./schema');
const crypt = require('./crypt');
const auth = require('./auth');

const DEV = process.env.NODE_ENV !== 'development';
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
  tracing: DEV,
  introspection: DEV,
  subscriptions: '/subscriptions',
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

app.use(cors());
app.use('*', auth.middleware);

server.installSubscriptionHandlers(http);
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
