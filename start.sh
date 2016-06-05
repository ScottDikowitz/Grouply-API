#!/bin/bash

onINT() {
exit
}

trap "onINT" SIGINT
NODE_ENV=development SERVER=http://grouplyui.herokuapp.com node app.js
echo Done
