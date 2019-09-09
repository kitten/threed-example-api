const cuid = require('cuid');
const { gql } = require('apollo-server-express');
const { GraphQLDateTime } = require('graphql-iso-date');

const typeDefs = gql`
  scalar DateTime

  enum SortBy {
    LATEST
    OLDEST
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
    createdBy: User!
    createdAt: DateTime!
  }

  type Query {
    threads(sortBy: SortBy!, skip: Int, limit: Int): [Thread!]!
    thread(id: ID!): Thread
  }
  
  input ThreadInput {
    title: String!
    text: String
  }
  
  input ReplyInput {
    threadId: ID!
    text: String!
  }

  type SigninResult {
    me: User!
    token: String!
  }

  type Mutation {
    createThread(input: ThreadInput!): Thread!
    reply(input: ReplyInput!): Thread!
    likeThread(threadId: ID!): Thread!
    likeReply(replyId: ID!): Reply!
    signup(username: String!, password: String!): SigninResult
    signin(username: String!, password: String!): SigninResult
  }
`;

const translateSortBy = (baseQuery, val) => {
  switch (val) {
    case "LATEST":
      return baseQuery.orderBy("created_at", "desc");
    case "POPULAR":
      return baseQuery.orderBy("created_at", "desc");
    default: throw new Error("Invalid sort_by field.");
  }
}

const resolvers = {
  DateTime: GraphQLDateTime,
  User: parent => ({
    id: parent.id,
    username: parent.username,
    avatar: parent.avatar || null,
    createdAt: parent.created_at
  }),
  Query: {
    threads: async (_, { sortBy, skip = 0, limit = 10 }, ctx) => {
      const baseQuery = ctx.db
        .select(
          "threads.id",
          "threads.title",
          "threads.text",
          "threads.created_by AS createdBy",
          "threads.created_at AS createdAt"
        )
        .from("threads")
        .limit(limit)
        .offset(skip)
        .orderBy(sortBy);

      return await translateSortBy(baseQuery, sortBy);
    },
    thread: async (_, { id }, ctx) => {
      return await ctx.db
        .first()
        .from("threads")
        .where({ id });
    }
  },
  Thread: {
    createdBy: async ({ createdBy }, _, ctx) => {
      return await ctx.db
        .first("id", "username", "avatar", "created_at AS createdAt")
        .from("users")
        .where({ id: createdBy });
    },
    likesNumber: async ({ id }, _, ctx) => {
      return await ctx.db
        .count("id")
        .from("likes")
        .where({ thread_id: id });
    },
    likes: async ({ id }, { skip = 0, limit = 10 }, ctx) => {
      return await ctx.db
        .select()
        .from("likes")
        .limit(limit)
        .offset(skip)
        .where({ thread_id: id });
    },
    repliesNumber: async ({ id }, _, ctx) => {
      return await ctx.db
        .count("id")
        .from("replies")
        .where({ thread_id: id });
    },
    replies: async ({ id }, { skip = 0, limit = 10 }, ctx) => {
      return await ctx.db
        .select()
        .from("replies")
        .limit(limit)
        .offset(skip)
        .where({ thread_id: id });
    }
  },
  Like: {
    createdBy: async ({ created_by: createdBy }, _, ctx) => {
      return await ctx.db
        .first("id", "username", "avatar", "created_at AS createdAt")
        .from("users")
        .where({ id: createdBy });
    }
  },
  Reply: {
    likesNumber: async ({ id }, _, ctx) => {
      return await ctx.db
        .count("id")
        .from("likes")
        .where({ reply_id: id });
    },
    likes: async ({ id }, { skip = 0, limit = 10 }, ctx) => {
      return await ctx.db
        .select()
        .from("likes")
        .limit(limit)
        .offset(skip)
        .where({ reply_id: id });
    },
    createdBy: async ({ created_by: createdBy }, _, ctx) => {
      return await ctx.db
        .first("id", "username", "avatar", "created_at AS createdAt")
        .from("users")
        .where({ id: createdBy });
    }
  },
  Mutation: {
    createThread: async (_, { input }, ctx) => {
      const thread = {
        id: cuid(),
        title: input.title,
        text: input.text || null,
        created_by: ctx.user.id
      };

      const [res] = await ctx.db
        .insert(thread)
        .into('threads')
        .returning(['id', 'title', 'text', 'created_by', 'created_at']);

      return res;
    },
    reply: async (_, { input }, ctx) => {
      const reply = {
        id: cuid(),
        thread_id: input.threadId,
        text: input.text || null,
        created_by: ctx.user.id
      };

      const [res] = await ctx.db
        .insert(reply)
        .into('replies')
        .returning(['id', 'thread_id', 'text', 'created_by', 'created_at']);

      return res;
    },
    likeThread: async (_, { threadId }, ctx) => {
      const like = {
        id: cuid(),
        thread_id: threadId,
        reply_id: null,
        created_by: ctx.user.id
      };

      await ctx.db.insert(like).into('likes')
      return await ctx.db.first().from('threads').where({ id: threadId });
    },
    likeReply: async (_, { replyId }, ctx) => {
      const reply = {
        id: cuid(),
        reply_id: replyId,
        thread_id: null,
        created_by: ctx.user.id
      };

      await ctx.db.insert(like).into('likes');
      return await ctx.db.first().from('replies').where({ id: replyId });
    },
    signup: async (_, { username, password }, ctx) => {
      const userEntry = await ctx.db
        .select()
        .from("users")
        .where({ username })
        .first();

      if (userRows || userRows.length !== 0) {
        throw new Error("A user with this username already exists!");
      }

      const user = {
        id: cuid(),
        username,
        hash: ctx.crypt.hash(password)
      };

      const [res] = await ctx.db
        .insert(user)
        .into("users")
        .returning(["id", "username", "hash", "avatar", "created_at"]);

      return res;
    },
    signin: async (_, { username, password }, ctx) => {
      const userEntry = await ctx.db
        .select()
        .from("users")
        .where({ username })
        .first();

      if (userEntry) {
        return userEntry;
      } else {
        throw new Error("A user with this username already exists!");
      }
    }
  }
};

module.exports = { typeDefs, resolvers };
