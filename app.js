var express = require('express');
// var app     = express();
// var server  = require('http').createServer(app);
// var io      = require('socket.io').listen(server);
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
// var passport = require('passport-facebook');
FacebookStrategy = require('passport-facebook').Strategy;


var path = require('path');
// var webpack = require('webpack');
// var webpackMiddleware = require('webpack-dev-middleware');
// var webpackHotMiddleware = require('webpack-hot-middleware');
// var config = require('./webpack.config.js');
//
// const compiler = webpack(config);
var passport = require('passport');
var expressSession = require('express-session');
// var login = require('./passport/login.js');
//
// login(auth, passport);

app.use(express.static('public'));
app.use(expressSession({secret: 'mySecretKey'}));
app.use(passport.initialize());
app.use(passport.session());

// app.use(session({ secret: 'keyboard cat', cookie: { maxAge: 60000 }}));

// app.use(express.static(__dirname + '/dist'));
// app.use(webpackMiddleware(compiler));
// app.use(webpackHotMiddleware(compiler));
// app.get('/', function response(req, res) {
//   res.sendFile(path.join(__dirname, 'dist/index.html'));
// });
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
  passport.authenticate('facebook', {failureRedirect : '/', successRedirect: '/'})
);

passport.use('facebook', new FacebookStrategy(auth.facebookAuth,
  function(accessToken, refreshToken, profile, cb) {
      console.log(profile.emails[0].value);
    User.findOrCreate({ facebookId: profile.id, name: profile.name, email: profile.emails[0].value }, function (err, user) {
      return cb(err, user);
    });
  }
));
