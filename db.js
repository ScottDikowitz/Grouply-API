var db;
switch (process.env.NODE_ENV) {
    case 'development':
        db = 'mongodb://localhost/groupy';
        break;
    case 'production':
        db = process.env.MONGODB_URI;
        break;
    default:
        db = 'mongodb://localhost/test';
}

module.exports = {
    'url' : db
};
