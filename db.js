var development = process.env.NODE_ENV !== 'production';

module.exports = {
    'url' : development ? 'mongodb://localhost/groupy' : process.env.MONGODB_URI
};
