const { ApolloServer } = require('apollo-server-express');
const express = require('express');
const { execute, subscribe } = require("graphql");
const { createServer } = require("http");
const { SubscriptionServer } = require("subscriptions-transport-ws");
const { makeExecutableSchema } = require("graphql-tools");

const database = require('./database');
const schema = require('./schema');
const crypt = require('./crypt');
const auth = require('./auth');

const DEV = process.env.NODE_ENV !== 'development';
const PORT = process.env.PORT || 3000;
const WS_PORT = 3001;

const websocketServer = createServer((_request, response) => {
  response.writeHead(404);
  response.end();
});

SubscriptionServer.create(
  {
    execute,
    subscribe,
    schema: makeExecutableSchema({
      typeDefs: schema.typeDefs,
      resolvers: schema.resolvers,
    })
  },
  {
    server: websocketServer,
    path: "/graphql"
  }
);

const server = new ApolloServer({
  typeDefs: schema.typeDefs,
  resolvers: schema.resolvers,
  subscriptionsPath: `http://localhost:${WS_PORT}`,
  cacheControl: false,
  tracing: DEV,
  introspection: DEV,
  playground: DEV,
  context: ({ req }) => ({
    db: database,
    user: req.user || null,
    jwt: auth,
    crypt
  })
});

const app = express();

app.use('*', auth.middleware);

server.applyMiddleware({ app });

app.listen({ port: PORT }, () => {
  console.log(`🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`);
});
