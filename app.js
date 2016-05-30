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
var MongoClient = require('mongodb').MongoClient;
// var Db = require('mongodb').Db;
var database;
var db = MongoClient.connect(dbConfig.url, function(err, db) {
  if (err) throw err;
  console.log("Connected to Database");
  database = db;
  });

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

  if(error){
    accept(new Error(message));
}
  else {
     accept(null, false);

  }
  // this error will be sent to the user as a special error-package
  // see: http://socket.io/docs/client-api/#socket > error-object
}

app.use(passport.initialize());
app.use(passport.session());

var allRooms = {};
// var users = {};
var numGuests = 0;
io.sockets.on('connection', function(socket){
    // socket.emit('news', {hello: 'world'});
    if (socket.request.user.logged_in){
        socket.username = socket.request.user.name;
    } else {
        socket.username = 'guest#' + Math.floor(Math.random() * 10000000000);
    }
		// usernames[username] = username;
    // console.log(io.sockets.adapter.rooms);
    // console.log(socket.rooms);
    for (var client in io.sockets.adapter.rooms){
        // console.log(client);

        if (io.sockets.connected[client]){
            // console.log(client);
            // console.log(io.sockets.connected[client].username);
        } else {
            // console.log(client);
            // console.log(io.sockets.adapter.rooms[client].sockets);
        }
    }
    // console.log(io.sockets.connected);
    socket.nickname = socket.request.user;
    socket.on('subscribe', function(data) {
        socket.join(data.room);
        socket.room = data.room;

        database.createCollection(data.room, { capped : true, size : 10000, max : 10 }, function(err, collection){
           if (err) throw err;

            console.log("Created " + data.room);
        });



        var users = [];
        for (var client in io.sockets.adapter.rooms[data.room].sockets){
            users.push(io.sockets.connected[client].username);
        }
        var collection = database.collection(socket.room);
        collection.find((err, data)=>{
            data.toArray().then((messages)=>{
                socket.emit('receive-messages', messages);

            });
        });
        io.sockets.in(socket.room).emit('receive-users', users);
        // io.sockets.in(socket.room).emit('receive-users', {users: users, comments: []});
        // if (socket.request.user.logged_in){
            // if (users[data.room]){
            //     users[data.room][socket.request.user.id] = socket.request.user;
            // } else {
            //     users[data.room] = {};
            //     users[data.room][socket.request.user.id] = socket.request.user;
            // }
        // }

    });
    socket.on('unsubscribe', function(data) {
        socket.leave(data.room);

        var users = [];
        if (io.sockets.adapter.rooms[data.room]){
            for (var client in io.sockets.adapter.rooms[data.room].sockets){
                users.push(io.sockets.connected[client].username);
            }
            io.sockets.in(socket.room).emit('receive-users', users);
        }
    });


    // setInterval(function(){
    //     io.sockets.in('roomTwo').emit('roomChanged', { chicken: 'tasty' });
    // }, 2000);

    socket.on('send-comment', function (data) {
        // if (socket.request.user.logged_in){
        //     data.user = socket.request.user;
        // } else {
            data.user = {name: socket.username};
        // }
        var collection = database.collection(socket.room);
        collection.insert({comment:data.comment, name: data.user.name, id: data.user.id});
        // var roster = io.sockets.clients(socket.room);
        // console.log(roster);
        // console.log(socket.rooms);
        // var allRooms = [];
        // console.log(io.sockets.adapter.rooms);

        // for(var room in io.sockets.adapter.rooms){
        //     if(room !== socket.id){
        //         allRooms.push(room);
        //     }
        // }
        // data.rooms = allRooms;
        // console.log(JSON.stringify(users));
        // data.users = users;
        io.sockets.in(socket.room).emit('receive-comment', data);

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
    done(null, {id: user.facebookId, name: user.name});
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
