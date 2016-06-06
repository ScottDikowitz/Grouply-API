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
NODE_ENV=development UI_SERVER=http://localhost:5000 API_SERVER=http://localhost:8000 nodemon app.js
echo Done
