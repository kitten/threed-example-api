CREATE TABLE users (
    id character varying(25) PRIMARY KEY,
    username text NOT NULL UNIQUE,
    avatar text,
    hash text NOT NULL,
    created_at timestamp without time zone DEFAULT now()
);

CREATE UNIQUE INDEX users_pkey ON users(id text_ops);
CREATE UNIQUE INDEX users_handle_key ON users(username text_ops);

CREATE TABLE threads (
    id character varying(25) PRIMARY KEY,
    title text NOT NULL,
    text text,
    created_by character varying(25) REFERENCES users(id),
    created_at timestamp without time zone NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX threads_pkey ON threads(id text_ops);

CREATE TABLE replies (
    id character varying(25) PRIMARY KEY,
    created_by character varying(25) NOT NULL REFERENCES users(id),
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    text text NOT NULL,
    thread_id character varying(25) NOT NULL REFERENCES threads(id)
);

CREATE UNIQUE INDEX messages_pkey ON replies(id text_ops);

CREATE TABLE likes (
    id character varying(25) PRIMARY KEY,
    reply_id character varying(25) REFERENCES replies(id),
    created_by character varying(25) NOT NULL REFERENCES users(id),
    created_at timestamp without time zone NOT NULL DEFAULT now(),
    thread_id character varying(25) REFERENCES threads(id)
);

CREATE UNIQUE INDEX reactions_pkey ON likes(id text_ops);
