#!/bin/bash

onINT() {
kill "$redisPID"
exit
}

trap "onINT" SIGINT
redis-server &
redisPID="$!"
nodemon app.js
echo Done
