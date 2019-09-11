const {
  POSTGRES_HOST = '127.0.0.1',
  POSTGRES_USER = 'postgres',
  POSTGRES_PASSWORD = 'postgres',
  POSTGRES_DB = 'postgres',
  JWT_SECRET = 'threed-secret-123'
} = process.env;

module.exports = {
  POSTGRES_HOST,
  POSTGRES_USER,
  POSTGRES_PASSWORD,
  POSTGRES_DB,
  JWT_SECRET
};
