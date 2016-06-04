#!/bin/bash

onINT() {
exit
}

trap "onINT" SIGINT
node app.js
echo Done
