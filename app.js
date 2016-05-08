var express = require('express');
var app = express();
app.set('port', process.env.PORT || 8000);
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
server.listen(app.get('port'));
var auth = require('./config/auth.js');
var count = 0;
var dbConfig = require('./db.js');
var mongoose = require('mongoose');
var User = require('./models/User.js');
mongoose.connect(dbConfig.url);

FacebookStrategy = require('passport-facebook').Strategy;


var path = require('path');
var passport = require('passport');
var expressSession = require('express-session');

app.use(express.static('public'));
app.use(expressSession({secret: 'mySecretKey'}));
app.use(passport.initialize());
app.use(passport.session());
io.sockets.on('connection', function(socket){
    socket.emit('news', {hello: 'world'});
    socket.on('send-comment', function(data){
        console.log(data);
        count += 1;
        io.sockets.emit('receive-comment', {comment: data, count: count});
    });
});

app.get('/auth/facebook',
  passport.authenticate('facebook', { scope : 'email' }
));
//
app.get('/auth/facebook/callback',
  passport.authenticate('facebook', {failureRedirect : 'http://localhost:3000', successRedirect: 'http://localhost:3000'})
);

passport.use('facebook', new FacebookStrategy(auth.facebookAuth,
  function(accessToken, refreshToken, profile, cb) {
      console.log(profile.emails[0].value);
    User.findOrCreate({ facebookId: profile.id, name: profile.name, email: profile.emails[0].value }, function (err, user) {
      return cb(err, user);
    });
  }
));
