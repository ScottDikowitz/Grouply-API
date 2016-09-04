'use strict';

var chai = require('chai');
// var expect = chai.expect;
process.env.NODE_ENV = 'test';

var chai = require('chai');
var chaiHttp = require('chai-http');
var server = require('../app');
var should = chai.should();

chai.use(chaiHttp);

describe('GET /api/user', () => {
      it('it should not return a user', (done) => {
        chai.request(server)
            .get('/api/user')
            .end((err, res) => {
                res.should.have.status(200);
                res.body.should.be.a('object');
                res.body.result.should.equal('not logged in.');
                console.log(res.body);
              done();
            });
      });
  });
