'use strict';

var qryq = require('../qryq');

describe('[graph]', function() {
  describe('[basic]', function() {
    it('Should reject a query graph when no API object is present', function(done) {
      expect(function() {
        qryq
          .graph({});
      }).toThrowError('Expected an API object');
      expect(function() {
        qryq
          .graph();
      }).toThrowError('Expected context');
      done();
    });

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
        { id: 'A', api: 'add', depends: [], input: { a:3, b:4 } },
        { id: 'B', api: 'multiply', depends: ['A'], input: { a:'#{A}', b:3 } },
        { id: 'C', api: 'multiply', depends: ['A'], input: { a:7, b: '#{A}' } }
      ]);

      // Final query only gets appended upon run getting called.
      var promise = myQueries.run();
      // Timeout is just to ensure a clean up occurs
      promise.timeout(1, 'Do not care');

      expect(myQueries.queries).toEqual([
        { id: 'A', api: 'add', depends: [], input: { a:3, b:4 } },
        { id: 'B', api: 'multiply', depends: ['A'], input: { a:'#{A}', b:3 } },
        { id: 'C', api: 'multiply', depends: ['A'], input: { a:7, b: '#{A}' } },
        { id: 'D', api: 'add', depends: ['C', 'B'], input: { a:'#{C}', b:'#{B}' } }
      ]);

      done();
    })
  });

  describe('[advanced]', function() {
    it('Should specify dependents', function(done) {
      var myQueries = qryq
        .graph({
          api: {},
        })
        .query('A')
          .api('add')
          .depends([])
          .input({ a: 3, b: 4 })
        .query('B')
          .api('multiply')
          .depends(['A'])
          .input({ a: '#{A}', b: 3 });

      // Final query only gets appended upon run getting called.
      var promise = myQueries.run();
      // Timeout is just to ensure a clean up occurs
      promise.timeout(1, 'Do not care');

      expect(myQueries.queries).toEqual([
        { id: 'A', api: 'add', depends: [], input: { a:3, b:4 } },
        { id: 'B', api: 'multiply', depends: ['A'], input: { a:'#{A}', b:3 } }
      ]);

      done();
    });
    it('Should specify filter output', function(done) {
      var myQueries = qryq
        .graph({
          api: {},
        })
        .query('A')
          .api('add')
          .input({ a: 3, b: 4 })
          .filterOutput(true)
        .query('B')
          .api('multiply')
          .input({ a: '#{A}', b: 3 })
          .filterOutput(false);

      // Final query only gets appended upon run getting called.
      var promise = myQueries.run();
      // Timeout is just to ensure a clean up occurs
      promise.timeout(1, 'Do not care');

      expect(myQueries.queries).toEqual([
        { id: 'A', api: 'add', filterOutput: true, depends: [], input: { a:3, b:4 } },
        { id: 'B', api: 'multiply', filterOutput: false, depends: ['A'], input: { a:'#{A}', b:3 } },
      ]);

      done();
    });
    it('Should allow expression drilldowns', function(done) {
      //TODO cannot be tested yet - not yet implemented
      done();
    });
    it('Should specify all queries ', function(done) {
      var myQueries = qryq
        .graph({
          api: {},
        })
        .allQueries([
          { id: 'A', api: 'add', input: { a:3, b:4 } },
          { id: 'B', api: 'multiply', input: { a:'#{A}', b:3 } }
        ]);

      expect(myQueries.queries).toEqual([
        { id: 'A', api: 'add', input: { a:3, b:4 } },
        { id: 'B', api: 'multiply', input: { a:'#{A}', b:3 } }
      ]);
      done();
    });
  });
});
