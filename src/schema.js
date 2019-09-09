const { gql } = require('apollo-server-express');
const { GraphQLDateTime } = require('graphql-iso-date');

const typeDefs = gql`
  scalar DateTime

  enum SortBy {
    LATEST
    OLDEST
    POPULAR
  }

  type User {
    id: ID!
    username: String!
    avatar: String
    createdAt: DateTime
  }

  type Reply {
    id: ID!
    text: String!
    thread: Thread!
    createdBy: User!
    createdAt: DateTime!
    likesNumber: Int!
    likes(skip: Int, limit: Int): [Like!]!
  }

  type Thread {
    id: ID!
    title: String!
    text: String
    createdBy: User!
    createdAt: DateTime!
    likesNumber: Int!
    likes(skip: Int, limit: Int): [Like!]!
    repliesNumber: Int!
    replies(skip: Int, limit: Int): [Reply!]!
  }

  type Like {
    id: ID!
    thread: Thread
    reply: Reply
    createdBy: User!
    createdAt: DateTime!
  }

  type Query {
    threads(sortBy: SortBy!, skip: Int, limit: Int): [Thread!]!
    thread(id: ID!): Thread
  }

  type SigninResult {
    me: User!
    token: String!
  }

  type Mutation {
    signup(username: String!, password: String!): SigninResult
    signin(username: String!, password: String!): SigninResult
  }
`;

const resolvers = {
  DateTime: GraphQLDateTime,
  Query: {
    threads: async (_, { sortBy, skip = 0, limit = 10 }, ctx) => {
      const users = await ctx.db.select().from("users").limit(limit).offset(skip).orderBy(sortBy)
    },
    thread: async (_, { id }, ctx) => {
      return await ctx.db.first().from("users").where({ id })
    }
  },
  Mutation: {
    signup: async (_, { username, password }, ctx) => {
      const userRows = await ctx.db
        .select()
        .from("users")
        .where({ username })
        .limit(1);

      if (userRows || userRows.length !== 0) {
        throw new Error("A user with this username already exists!");
      }
    }
  }
};

module.exports = { typeDefs, resolvers };
