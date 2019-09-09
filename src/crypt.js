const bcrypt = require('bcryptjs');
const BCRYPT_ROUNDS = 10;

const hash = str => bcrypt.hashSync(str, BCRYPT_ROUNDS);
const compare = (str, hash) => bcrypt.compareSync(str, hash);

module.exports = { hash, compare };
