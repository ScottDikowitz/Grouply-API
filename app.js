var express = require('express');
var app = express();
app.set('port', process.env.PORT || 8000);
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
server.listen(app.get('port'));
var auth = require('./config/auth.js');
// var count = 0;
var dbConfig = require('./db.js');
var mongoose = require('mongoose');
var User = require('./models/User.js');
var passportSocketIo = require('passport.socketio');
var cookieParser = require('cookie-parser');

mongoose.connect(dbConfig.url);

FacebookStrategy = require('passport-facebook').Strategy;


var path = require('path');
var passport = require('passport');
var expressSession = require('express-session');
var RedisStore = require('connect-redis')(expressSession);
var client = require('redis').createClient();
var RedisStoreInstance = new RedisStore({ host: 'localhost', port: 6379, client: client,ttl :  260});

app.use(express.static('public'));
app.use(expressSession({
    cookieParser: cookieParser,
    // cookie: { httpOnly: false },
    store: RedisStoreInstance,
    secret: 'mySecretKey',
    saveUninitialized: false,
    resave: false
}));
io.use(passportSocketIo.authorize({
  cookieParser: cookieParser,
  secret:       'mySecretKey',
  store:        RedisStoreInstance,
  success:      onAuthorizeSuccess,
  fail:         onAuthorizeFail,
}));

function onAuthorizeSuccess(data, accept){
  console.log('successful connection to socket.io');
  accept();
}

function onAuthorizeFail(data, message, error, accept){

  if(error)
    accept(new Error(message));
  // this error will be sent to the user as a special error-package
  // see: http://socket.io/docs/client-api/#socket > error-object
}

app.use(passport.initialize());
app.use(passport.session());


io.sockets.on('connection', function(socket){
    // socket.emit('news', {hello: 'world'});
    socket.on('send-comment', function(data){
        data.user = socket.request.user;
        io.sockets.emit('receive-comment', data);
    });
});

app.use(function(req, res, next) {
res.header('Access-Control-Allow-Credentials', true);
res.header('Access-Control-Allow-Origin', req.headers.origin);

// res.header('Access-Control-Allow-Origin', req.headers.origin);
res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
res.header('Access-Control-Allow-Headers', 'X-Requested-With, X-HTTP-Method-Override, Content-Type, Accept');
if ('OPTIONS' == req.method) {
     res.send(200);
 } else {
     next();
 }
});

// app.all('/*', function(req, res, next) {
//     // res.header('Access-Control-Allow-Origin', '*');
//     res.header('Access-Control-Allow-Headers', 'Content-Type,X-Requested-With');
//     next();
// });

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {

    var query = User.where({facebookId: user.facebookId});
    // console.log(data);
    query.findOne(function(err, user){
        if (err){
            console.log('error: ' + err);
            // cb(err);
        } else if (user) {
            // console.log('user found!');
            // console.log('user: ' + user);
            done(null, {id: user.facebookId, name: user.name});
        } else {
        }
    });

});

app.get('/auth/facebook',
  passport.authenticate('facebook', { scope : ['email'] })
);

app.get('/api/test', isLoggedIn, function(req, res){
    res.json({user: { user1: 'test',
                       user2: req.user
                   }});
});
//
app.get('/auth/facebook/callback',
  passport.authenticate('facebook', {failureRedirect : 'http://localhost:3000', successRedirect: 'http://localhost:3000'})
);

app.get('/test', isLoggedIn, function (req, res, next) {
  res.json({users: { user1: 'test',
                     user2: req.user
                 }});
});

function isLoggedIn(req, res, next) {

    if (req.isAuthenticated())
        return next();

    res.json({result: 'not logged in.'});
}

passport.use('facebook', new FacebookStrategy(auth.facebookAuth,
  function(accessToken, refreshToken, profile, cb) {
      process.nextTick(function() {
      var userName = profile.name.givenName + ' ' + profile.name.familyName;
      User.findOrCreate(
          {
              facebookId: profile.id,
              name: userName,
              email: profile.emails[0].value,
              token: accessToken
          }, function (err, user) {
              return cb(err, user);
            });
      });
    }
));
