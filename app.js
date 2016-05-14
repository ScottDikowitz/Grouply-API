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
// var cors = require('express-cors');
mongoose.connect(dbConfig.url);

FacebookStrategy = require('passport-facebook').Strategy;


var path = require('path');
var passport = require('passport');
var expressSession = require('express-session');

// app.use(cors({
// 	allowedOrigins: [
// 		'localhost:3000'
// 	]
// }));
app.use(express.static('public'));
app.use(expressSession({secret: 'mySecretKey'}));
app.use(passport.initialize());
app.use(passport.session());
io.sockets.on('connection', function(socket){
    // socket.emit('news', {hello: 'world'});
    socket.on('send-comment', function(data){
        // console.log(data);
        io.sockets.emit('receive-comment', data);
    });
});

app.use(function(req, res, next) {
res.header('Access-Control-Allow-Credentials', true);
console.log(req.headers.origin);
console.log('alkasjdflkjasflkjlksf');
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
    // console.log('hello, ' + user);
    done(null, user);
});

passport.deserializeUser(function(user, done) {

    var query = User.where({facebookId: user.facebookId});
    // console.log(data);
    query.findOne(function(err, user){
        if (err){
            // console.log('error: ' + err);
            // cb(err);
        } else if (user) {
            // console.log('user found!');
            console.log('user: ' + user);
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
    // console.log(req.user);
  res.json({users: { user1: 'test',
                     user2: req.user
                 }});
});

function isLoggedIn(req, res, next) {

    // if user is authenticated in the session, carry on
    if (req.isAuthenticated())
        return next();

    res.json({result: 'not logged in.'});
    // if they aren't redirect them to the home page
    // res.redirect('http://localhost:3000');
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
