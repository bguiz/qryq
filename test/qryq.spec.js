'use strict';


describe('[main]', function() {
  it('Should get a qryq instance', function(done) {
    var qryq;
    expect(function() {
      qryq = require('../qryq');
    }).not.toThrow();
    expect(typeof qryq.graph).toEqual('function');
    done();
  })
});
