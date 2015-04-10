'use strict';

var qryq = require('../qryq');

describe('[graph]', function() {
  describe('[fluent-basic]', function() {
    it('Should construct a query graph using a fluent interface', function(done) {
      var myQueries = qryq
        .graph({
          api: {},
        })
        .query('A')
          .api('add')
          .input({ a: 3, b: 4 })
        .query('B')
          .api('multiply')
          .input({ a: '#{A}', b: 3 })
        .query('C')
          .api('multiply')
          .input({ a: 7, b: '#{A}' })
        .query('D')
          .api('add')
          .input({ a: '#{C}', b: '#{B}' });
      expect(myQueries.queries).toEqual([
        { id: 'A', api: 'add', input: { a:3, b:4 } },
        { id: 'B', api: 'multiply', input: { a:'#{A}', b:3 } },
        { id: 'C', api: 'multiply', input: { a:7, b: '#{A}' } }
      ]);

      var promise = myQueries.run(); //final query only gets appended upon run getting called.
      expect(myQueries.queries).toEqual([
        { id: 'A', api: 'add', input: { a:3, b:4 } },
        { id: 'B', api: 'multiply', input: { a:'#{A}', b:3 } },
        { id: 'C', api: 'multiply', input: { a:7, b: '#{A}' } },
        { id: 'D', api: 'add', input: { a:'#{C}', b:'#{B}' } }
      ]);
      promise.timeout(1, 'Do not care'); //Timeout is just to ensure a clean up occurs
      done();
    })
  });
});
