#!/bin/bash

onINT() {
kill "$mongodPID"
kill "$redisPID"
exit
}

trap "onINT" SIGINT
mongod &
mongodPID="$!"
redis-server &
redisPID="$!"
NODE_ENV=development SERVER=http://localhost:5000 node app.js
echo Done
