#!/bin/bash

onINT() {
kill "$redisPID"
exit
}

trap "onINT" SIGINT
redis-server &
redisPID="$!"
node app.js
echo Done
