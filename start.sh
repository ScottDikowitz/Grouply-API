#!/bin/bash

onINT() {
exit
}

trap "onINT" SIGINT
NODE_ENV=production UI_SERVER=http://grouplyui.herokuapp.com API_SERVER=http://grouplyapi.herokuapp.com node app.js
echo Done
