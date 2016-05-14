#!/bin/bash

onINT() {
echo "Killing mongod $mongodPID too"
kill "$mongodPID"
kill "$redisPID"
exit
}

trap "onINT" SIGINT
mongod &
mongodPID="$!"
redis-server &
redisPID="$!"
nodemon app.js
echo Done
