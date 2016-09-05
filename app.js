var express = require('express');
var app = express();
app.set('port', process.env.PORT || 8000);
var server = require('http').createServer(app);
var io = require('socket.io').listen(server);
// console.log(io);
server.listen(app.get('port'));
var auth = require('./config/auth.js');
var dbConfig = require('./db.js');
var mongoose = require('mongoose');
var User = require('./models/user.js');
var passportSocketIo = require('passport.socketio');
var cookieParser = require('cookie-parser');
var MongoClient = require('mongodb').MongoClient;
var database;
var defaultRooms = {
    global: true,
    roomOne: true,
    roomTwo: true,
    roomThree: true
};

var UI_SERVER = process.env.UI_SERVER;
var test = process.env.NODE_ENV === 'test';
var db = !test ? MongoClient.connect(dbConfig.url, function(err, db) {
  if (err) throw err;
  console.log("Connected to Database");
  database = db;
  }) : null;

var development = process.env.NODE_ENV !== 'production';
if (!test) {mongoose.connect(dbConfig.url); }

FacebookStrategy = require('passport-facebook').Strategy;


var path = require('path');
var passport = require('passport');
var expressSession = require('express-session');
var RedisStore = require('connect-redis')(expressSession);
var client = require('redis').createClient(process.env.REDIS_URL || '');
var options = !development ? { url: process.env.REDIS_URL} : { host: 'localhost', port: 6379, client: client,ttl :  260};
var RedisStoreInstance = new RedisStore(options);

app.use(express.static('public'));
app.use(expressSession({
    cookieParser: cookieParser,
    // cookie: { httpOnly: false },
    store: RedisStoreInstance,
    secret: 'mySecretKey',
    saveUninitialized: false,
    resave: false
}));

if (!test){
    io.use(passportSocketIo.authorize({
      cookieParser: cookieParser,
      secret:       'mySecretKey',
      store:        RedisStoreInstance,
      success:      onAuthorizeSuccess,
      fail:         onAuthorizeFail,
    }));
}

function onAuthorizeSuccess(data, accept){
  // console.log('successful connection to socket.io');
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
    if (!test && typeof database === 'undefined'){
        return false;
    }
    function extractChatPartners(res, cb){
        var otherId;
        var users = [];
        var userIds = [];
        for (var i = 0; i < res.length; i++){
            if (res[i].users[0] === socket.request.user.id){
                userIds.push(res[i].users[1]);
            } else {
                userIds.push(res[i].users[0]);
            }
        }
        database.collection('users').find(
            { facebookId: { $in: userIds} },
            { socket: 1, name: 1, facebookId: 1 },
          (err, document)=>{
              document.toArray().then((res)=>{
                  cb(res);
              });
          });
    }

    if (socket.request.user && socket.request.user.logged_in){
        socket.username = socket.request.user.name;
        socket.loggedIn = true;
        socket.facebookId = socket.request.user.id;
        database.collection('users').update(
          { facebookId: socket.request.user.id },
          { $set: {socket: socket.id} }
        );

        database.collection('privateChats').find(
             {users: {$in: [socket.request.user.id]}},
             (err, document)=>{
                //  console.log(document._id);
                 document.toArray()
                 .then((res)=>{
                    //  console.log(res);
                     if (res.length > 0){
                        //  console.log('blaskjdlkfjalskjflkas');
                         extractChatPartners(res, (users)=>{
                             socket.emit('receive-chat-partners', users);
                         });
                     } else {
                         console.log('no records found; unknown error occured');
                     }
                 });
             });

    } else {
        socket.username = 'guest#' + Math.floor(Math.random() * 100000000);
        socket.loggedIn = false;
        socket.facebookId = '';
    }



    // socket.emit('found-pvt-chats', pvtChats);


		// usernames[username] = username;
    // console.log(io.sockets.adapter.rooms);
    // console.log(socket.rooms);
    // for (var client in io.sockets.adapter.rooms){
        // console.log(client);

        // if (io.sockets.connected[client]){
            // console.log(client);
            // console.log(io.sockets.connected[client].username);
        // } else {
            // console.log(client);
            // console.log(io.sockets.adapter.rooms[client].sockets);
        // }
    // }
    // console.log(io.sockets.connected);
    socket.nickname = socket.request.user;
    socket.on('subscribe', function(data) {

        socket.join(data.room);
        socket.room = data.room;
        if (!test && !defaultRooms[data.room]){
            database.createCollection(data.room, { capped : true, size : 10000, max : 10 }, function(err, collection){
               if (err) throw err;

                console.log("Created " + data.room);
            });
        }



        var users = [];
        for (var client in io.sockets.adapter.rooms[data.room].sockets){
            var theUser = io.sockets.connected[client];
            users.push({username: theUser.username, client: client, loggedIn: theUser.loggedIn, id: theUser.facebookId});
        }
        if (!test){
            var collection = database.collection(socket.room);
            collection.find((err, data)=>{
                data.toArray().then((messages)=>{
                    socket.emit('receive-messages', messages);

                });
            });
        }
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
                users.push({username: io.sockets.connected[client].username, client: client});
            }
            io.sockets.in(socket.room).emit('receive-users', users);
        }
    });
    socket.on('send-pvt-message', function(data) {
        database.collection('privateChats').find(
             { $and: [ {users: { $in: [data.userId] }}, {users: {$in: [socket.request.user.id]}} ] },
             (err, document)=>{
                //  console.log(document._id);
                 document.toArray()
                 .then((res)=>{
                     if (res.length > 0){
                         database.collection('privateChats').update(
                           { _id: res[0]._id },
                           { $push: { messages: {comment: data.message, user: {name: socket.username}} } }
                         );
                         socket.emit('receive-comment', {comment: data.message, user: {name: socket.username}});

                         database.collection('users').findOne(
                             { facebookId: data.userId },
                             { socket: 1, name: 1, facebookId: 1 },
                           (err, document)=>{
                               var receiveSocket = io.sockets.connected[document.socket];
                               if (typeof receiveSocket !== "undefined"){
                                   receiveSocket.emit('receive-comment', {comment: data.message, user: {name: socket.username}});
                               }
                           });


                     } else {
                         console.log('no records found; unknown error occured');
                     }
                 });
             });
    });

    socket.on('open-pvt-chat-window', function(data) {

        database.collection('privateChats').find(
             { $and: [ {users: { $in: [data.facebookId] }}, {users: {$in: [socket.request.user.id]}} ] },
             (err, data)=>{
                 data.toArray()
                 .then((res)=>{
                     if (res.length > 0){
                         socket.emit('open-window', {messages: res[0].messages});
                     } else {
                         console.log('no records found');
                     }
                 });
             });
    });


    socket.on('open-pvt-chat', function(data) {
        database.collection('privateChats').find(
             { $and: [ {users: { $in: [data.id] }}, {users: {$in: [socket.request.user.id]}} ] },
             (err, documents)=>{
                 documents.toArray()
                 .then((res)=>{
                     if (res.length > 0){
                         socket.emit('open-window', {messages: res[0].messages});
                     } else {
                         database.collection('privateChats').insert({users: [data.id, socket.request.user.id], messages: []});
                         socket.emit('open-window', {messages: []});
                     }
                 });
             });
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
        collection.insert({comment:data.comment, name: data.user.name, id: data.user.id, timestamp: Date.now() });
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

passport.serializeUser(function(user, done) {
    done(null, user);
});

passport.deserializeUser(function(user, done) {
    done(null, {id: user.facebookId, name: user.name});
});

app.get('/auth/facebook',
  passport.authenticate('facebook', { scope : ['email'] })
);

app.get('/api/user', isLoggedIn, function(req, res){
    res.json({user: {
                       user2: req.user
                   }});
});
//
app.get('/auth/facebook/callback',
  passport.authenticate('facebook', {failureRedirect : UI_SERVER, successRedirect: UI_SERVER})
);

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
              email: profile.emails ? profile.emails[0].value : '',
              token: accessToken
          }, function (err, user) {
              return cb(err, user);
            });
      });
    }
));

module.exports = {app: app, io: io};
