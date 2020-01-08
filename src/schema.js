const cuid = require("cuid");
const { withFilter } = require("graphql-subscriptions");
const { GraphQLError } = require("graphql");
const { gql } = require("apollo-server-express");
const { GraphQLDateTime } = require("graphql-iso-date");

const pubsub = require("./pubsub");

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
    hasUserLiked: Boolean
  }

  type Thread {
    id: ID!
    title: String!
    text: String
    createdBy: User!
    createdAt: DateTime!
    repliesNumber: Int
    replies(skip: Int, limit: Int): [Reply!]
    likesNumber: Int
    likes(skip: Int, limit: Int): [Like!]
    hasUserLiked: Boolean
  }

  type Like {
    id: ID!
    createdBy: User!
    createdAt: DateTime!
  }

  type Query {
    threads(sortBy: SortBy!, skip: Int, limit: Int): [Thread!]!
    thread(id: ID!): Thread
    me: User
  }

  input ThreadInput {
    title: String!
    text: String
  }

  input ReplyInput {
    threadId: ID!
    text: String!
  }

  type Subscription {
    newThread: Thread!
    newReply(threadId: ID!): Reply!
    newThreadLike(threadId: ID!): Like!
    newReplyLike(replyId: ID!): Like!
  }

  interface Payload {
    viewer: Query!
  }

  type SigninResult {
    user: User!
    token: String!
    viewer: Query!
  }

  type CreateThreadPayload {
    node: Thread!
    viewer: Query!
  }

  type ReplyPayload {
    node: Reply!
    viewer: Query!
  }

  type LikeThreadPayload {
    node: Thread!
    viewer: Query!
  }

  type LikeReplyPayload {
    node: Reply!
    viewer: Query!
  }

  type Mutation {
    createThread(input: ThreadInput!): CreateThreadPayload!
    reply(input: ReplyInput!): ReplyPayload!
    likeThread(threadId: ID!): LikeThreadPayload!
    likeReply(replyId: ID!): LikeReplyPayload!
    signup(username: String!, password: String!): SigninResult!
    signin(username: String!, password: String!): SigninResult!
  }
`;

const resolvers = {
  DateTime: GraphQLDateTime,

  Query: {
    threads: async (_, { sortBy, skip = 0, limit = 10 }, ctx) => {
      const threads = ctx.db
        .select()
        .from("threads")
        .limit(limit)
        .offset(skip);

      switch (sortBy) {
        case "LATEST":
          return await threads.orderBy("created_at", "desc");
        case "OLDEST":
          return await threads.orderBy("created_at", "asc");
        default:
          return await threads;
      }
    },
    thread: async (_, { id }, ctx) => {
      return await ctx.db
        .first()
        .from("threads")
        .where({ id });
    },
    me: async (_, __, ctx) => {
      if (!ctx.user) {
        return null;
      }

      return await ctx.db
        .first()
        .from("users")
        .where({ id: ctx.user.id });
    }
  },

  User: {
    createdAt: parent => parent.created_at
  },

  Thread: {
    createdAt: parent => parent.created_at,
    createdBy: async (parent, _, ctx) => {
      return await ctx.db
        .first()
        .from("users")
        .where({ id: parent.created_by });
    },
    repliesNumber: async (parent, _, ctx) => {
      const { count } = await ctx.db
        .count("id")
        .first()
        .from("replies")
        .where({ thread_id: parent.id });
      return count;
    },
    replies: async (parent, { skip = 0, limit = 10 }, ctx) => {
      return await ctx.db
        .select()
        .from("replies")
        .orderBy("created_at", "desc")
        .where({ thread_id: parent.id })
        .limit(limit)
        .offset(skip);
    },
    likesNumber: async (parent, _, ctx) => {
      const { count } = await ctx.db
        .count("id")
        .first()
        .from("likes")
        .where({ thread_id: parent.id });
      return count;
    },
    likes: async (parent, { skip = 0, limit = 10 }, ctx) => {
      return await ctx.db
        .select()
        .from("likes")
        .orderBy("created_at", "desc")
        .where({ thread_id: parent.id })
        .limit(limit)
        .offset(skip);
    },
    hasUserLiked: async (parent, _, ctx) => {
      if (!ctx.user) return false;
      const hasLike = ctx.db
        .first()
        .from("likes")
        .where({ thread_id: parent.id, created_by: ctx.user.id });
      return !!hasLike;
    }
  },

  Like: {
    createdAt: parent => parent.created_at,
    createdBy: async (parent, _, ctx) => {
      return await ctx.db
        .first()
        .from("users")
        .where({ id: parent.created_by });
    }
  },

  Reply: {
    createdAt: parent => parent.created_at,
    createdBy: async (parent, _, ctx) => {
      return await ctx.db
        .first()
        .from("users")
        .where({ id: parent.created_by });
    },
    likesNumber: async (parent, _, ctx) => {
      const { count } = await ctx.db
        .count("id")
        .first()
        .from("likes")
        .where({ reply_id: parent.id });
      return count;
    },
    likes: async (parent, { skip = 0, limit = 10 }, ctx) => {
      return await ctx.db
        .select()
        .from("likes")
        .orderBy("created_at", "desc")
        .where({ reply_id: parent.id })
        .limit(limit)
        .offset(skip);
    },
    hasUserLiked: async (parent, _, ctx) => {
      if (!ctx.user) return false;
      const hasLike = ctx.db
        .first()
        .from("likes")
        .where({ reply_id: parent.id, created_by: ctx.user.id });
      return !!hasLike;
    }
  },
  Mutation: {
    createThread: async (_, { input }, ctx) => {
      if (!ctx.user) {
        throw new GraphQLError("Not Authenticated");
      }

      const thread = {
        id: cuid(),
        title: input.title,
        text: input.text || null,
        created_by: ctx.user.id
      };

      const [res] = await ctx.db
        .insert(thread)
        .into("threads")
        .returning(["id", "title", "text", "created_by", "created_at"]);

      if (res) {
        pubsub.publish("newThread", { newThread: res });
        return {
          node: res,
          viewer: {}
        };
      } else {
        return null;
      }
    },
    reply: async (_, { input }, ctx) => {
      if (!ctx.user) {
        throw new GraphQLError("Not Authenticated");
      }

      const reply = {
        id: cuid(),
        thread_id: input.threadId,
        text: input.text || null,
        created_by: ctx.user.id
      };

      const [res] = await ctx.db
        .insert(reply)
        .into("replies")
        .returning(["id", "thread_id", "text", "created_by", "created_at"]);

      if (res) {
        pubsub.publish("newReply", { newReply: res });
        return {
          node: res,
          viewer: {}
        };
      } else {
        return null;
      }
    },
    likeThread: async (_, { threadId }, ctx) => {
      if (!ctx.user) {
        throw new GraphQLError("Not Authenticated");
      }

      const like = {
        id: cuid(),
        thread_id: threadId,
        reply_id: null,
        created_by: ctx.user.id
      };

      await ctx.db.insert(like).into("likes");
      const res = await ctx.db
        .first()
        .from("threads")
        .where({ id: threadId });

      if (res) {
        pubsub.publish("newThreadLike", { newThreadLike: res });
        return {
          node: res,
          viewer: {}
        };
      } else {
        return null;
      }
    },
    likeReply: async (_, { replyId }, ctx) => {
      if (!ctx.user) {
        throw new GraphQLError("Not Authenticated");
      }

      const like = {
        id: cuid(),
        reply_id: replyId,
        thread_id: null,
        created_by: ctx.user.id
      };

      await ctx.db.insert(like).into("likes");

      const res = await ctx.db
        .first()
        .from("replies")
        .where({ id: replyId });

      if (res) {
        pubsub.publish("newReplyLike", { newReplyLike: like });
        return {
          node: res,
          viewer: {}
        };
      } else {
        return null;
      }
    },
    signup: async (_, { username, password }, ctx) => {
      const userEntry = await ctx.db
        .first()
        .from("users")
        .where({ username })
        .first();

      if (userEntry) {
        throw new GraphQLError("A user with this username already exists!");
      }

      const userInput = {
        id: cuid(),
        username,
        hash: ctx.crypt.hash(password)
      };

      const [user] = await ctx.db
        .insert(userInput)
        .into("users")
        .returning(["id", "username", "hash", "avatar", "created_at"]);

      if (user) {
        return { user, token: ctx.jwt.create(user), viewer: {} };
      } else {
        throw new GraphQLError("Unable to sign up!");
      }
    },
    signin: async (_, { username, password }, ctx) => {
      const user = await ctx.db
        .select()
        .from("users")
        .where({ username })
        .first();

      if (!user) {
        throw new GraphQLError("A user with this username already exists!");
      } else if (!ctx.crypt.compare(password, user.hash)) {
        throw new GraphQLError("Incorrect password!");
      } else {
        return { user, token: ctx.jwt.create(user), viewer: {} };
      }
    }
  },
  Subscription: {
    newThread: {
      subscribe: () => pubsub.asyncIterator("newThread")
    },
    newReply: {
      subscribe: withFilter(
        () => pubsub.asyncIterator("newReply"),
        (payload, variables) =>
          variables.threadId === payload.newReply.thread_id
      )
    },
    newReplyLike: {
      subscribe: withFilter(
        () => pubsub.asyncIterator("newReplyLike"),
        (payload, variables) => variables.replyId === payload.newReplyLike.id
      )
    },
    newThreadLike: {
      subscribe: withFilter(
        () => pubsub.asyncIterator("newThreadLike"),
        (payload, variables) => variables.threadId === payload.newThreadLike.id
      )
    }
  }
};

module.exports = { typeDefs, resolvers };
