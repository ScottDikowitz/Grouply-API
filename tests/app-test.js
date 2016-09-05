'use strict';

var chai = require('chai');
// var expect = chai.expect;
process.env.NODE_ENV = 'test';

var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../app').app;
var io = require('../app').io;
var should = chai.should();
var clientio = require("socket.io-client");
chai.use(chaiHttp);

describe('APP', () => {
    describe('GET /api/user', () => {
          it('it should not return a user', (done) => {
            chai.request(server)
                .get('/api/user')
                .end((err, res) => {
                    res.should.have.status(200);
                    res.body.should.be.a('object');
                    res.body.result.should.equal('not logged in.');
                  done();
                });
          });
    });

    describe('Socket.io', () => {
        it('successfully join a chat room', (done) => {
            var options = {
              transports: ['websocket'],
              reconnect: true,
              'force new connection': true
            };
            var cl = clientio.connect('http://localhost:8000', options);

            cl.on('connect', ()=> {
                cl.emit("subscribe", { room: 'global' });
            });

            cl.on('receive-users', (data) => {
                data.should.be.a('array');
                data.length.should.be.equal(1);
                done();
            })
        });
    });

});
