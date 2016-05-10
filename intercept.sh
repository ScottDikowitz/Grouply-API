#!/bin/bash

onINT() {
echo "Killing mongod $mongodPID too"
kill "$mongodPID"
exit
}

trap "onINT" SIGINT
mongod &
mongodPID="$!"
nodemon app.js
echo Done
