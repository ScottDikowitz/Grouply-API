#!/bin/bash

onINT() {
exit
}

trap "onINT" SIGINT
NODE_ENV=production SERVER=http://grouplyui.herokuapp.com node app.js
echo Done
