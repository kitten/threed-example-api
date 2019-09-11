const { ApolloServer } = require('apollo-server-express');
const express = require('express');
const http = require("http");

const database = require('./database');
const schema = require('./schema');
const crypt = require('./crypt');
const auth = require('./auth');

const DEV = process.env.NODE_ENV !== 'development';
const PORT = process.env.PORT || 3000;

const server = new ApolloServer({
  typeDefs: schema.typeDefs,
  resolvers: schema.resolvers,
  cacheControl: false,
  tracing: DEV,
  introspection: DEV,
  playground: DEV,
  context: ({ req }) => ({
    db: database,
    user: (req && req.user) || null,
    jwt: auth,
    crypt
  })
});

const app = express();

app.use('*', auth.middleware);
const httpServer = http.createServer(app);
server.installSubscriptionHandlers(httpServer);
server.applyMiddleware({ app });

httpServer.listen(PORT, () => {
    console.log(
      `🚀 Server ready at http://localhost:${PORT}${server.graphqlPath}`
    );
    console.log(
      `🚀 Subscriptions ready at ws://localhost:${PORT}${server.subscriptionsPath}`
    );
});
