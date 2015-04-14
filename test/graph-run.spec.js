'use strict';

var qryq = require('../qryq');

describe('[graph]', function() {

  describe('[run]', function() {
    var myApi = {
      add: function(deferred, data) {
        if (typeof data.a !== 'number' || typeof data.b !== 'number') {
          deferred.reject('Must specify two numeric params, a and b. Params were: '+JSON.stringify(qry));
        }
        else {
          deferred.resolve(data.a + data.b);
        }
      },
      multiply: function(deferred, data) {
        if (typeof data.a !== 'number' || typeof data.b !== 'number') {
          deferred.reject('Must specify two numeric params, a and b. Params were: '+JSON.stringify(qry));
        }
        else {
          deferred.resolve(data.a * data.b);
        }
      },
      sampleObject: function(deferred, qry) {
        deferred.resolve({
            hello: 'world',
            foo: {
                bar: 5,
                baz: 6
            }
        });
      },
    };

    it('Should run queries', function(done) {
      var myQueries = qryq
        .graph({
          api: myApi,
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

      // Final query only gets appended upon run getting called.
      var promise;

      expect(function() {
        promise = myQueries.run();
      }).not.toThrow();

      expect(myQueries.queries).toEqual([
        { id: 'A', api: 'add', depends: [], input: { a:3, b:4 } },
        { id: 'B', api: 'multiply', depends: ['A'], input: { a:'#{A}', b:3 } },
        { id: 'C', api: 'multiply', depends: ['A'], input: { a:7, b: '#{A}' } },
        { id: 'D', api: 'add', depends: ['C', 'B'], input: { a:'#{C}', b:'#{B}' } }
      ]);

      promise
        .then(function success(result) {
          expect('promise.then').toEqual('promise.then');
          expect(result).toEqual({
            A: 7,  // let A be 3 + 4 = 7
            B: 21, // let B be A * 3 = 7 * 3   = 21
            C: 49, // let C be 7 * A = 7 * 7   = 49
            D: 70, // let D be C + B = 49 + 21 = 70
          });
          done();
        }, function failure(err) {
          expect('promise.then').not.toEqual(err);
          done();
        });
    });

    it('Should filter run queries', function(done) {
      var myQueries = qryq
        .graph({
          api: myApi,
        })
        .query('A')
          .api('add')
          .input({ a: 3, b: 4 })
          .filterOutput(true)
        .query('B')
          .api('multiply')
          .input({ a: '#{A}', b: 3 })
          .filterOutput(true)
        .query('C')
          .api('multiply')
          .input({ a: 7, b: '#{A}' })
          .filterOutput(true)
        .query('D')
          .api('add')
          .input({ a: '#{C}', b: '#{B}' });

      var promise;

      expect(function() {
        promise = myQueries.run();
      }).not.toThrow();

      expect(myQueries.queries).toEqual([
        { id: 'A', api: 'add', depends: [], filterOutput: true, input: { a:3, b:4 } },
        { id: 'B', api: 'multiply', depends: ['A'], filterOutput: true, input: { a:'#{A}', b:3 } },
        { id: 'C', api: 'multiply', depends: ['A'], filterOutput: true, input: { a:7, b: '#{A}' } },
        { id: 'D', api: 'add', depends: ['C', 'B'], input: { a:'#{C}', b:'#{B}' } }
      ]);

      promise
        .then(function success(result) {
          expect('promise.then').toEqual('promise.then');
          expect(result).toEqual({
            D: 70,
          });
          done();
        }, function failure(err) {
          expect('promise.then').not.toEqual(err);
          done();
        });
    });

    it('Should run no depends queries', function(done) {
      var myQueries = qryq
        .graph({
          api: myApi,
        })
        .allQueries([
          {id: "q1", depends:[], api: "add", input: { a:1, b:9 } },
          {id: "q2", depends:[], api: "multiply", input: { a:7, b:6 } }
        ]);

      var promise;

      expect(function() {
        promise = myQueries.run();
      }).not.toThrow();

      promise
        .then(function success(result) {
          expect(result).toEqual({
            q1: 10,
            q2: 42,
          });
          done();
        }, function failure(err) {
          expect('promise.then').toEqual(err);
          done();
        });
    });

    it('Should run basic depends queries', function(done) {
      var myQueries = qryq
        .graph({
          api: myApi,
        })
        .allQueries([
          {id: "q1", depends:[], api: "add", input: {a:1, b:9}},
          {id: "q2", depends:[], api: "add", input: {a:99, b:1}},
          {id: "q3", depends:['q1', 'q2'], api: "multiply", input: {a: "#{q1}", b: "#{q2}"}},
          {id: "q4", depends:['q3'], api: "multiply", input: {a: "#{q3}", b:5}}
        ]);

      var promise;

      expect(function() {
        promise = myQueries.run();
      }).not.toThrow();

      promise
        .then(function success(result) {
          expect(result).toEqual({
            q1: 10,
            q2: 100,
            q3: 1000,
            q4: 5000,
          });
          done();
        }, function failure(err) {
          expect('promise.then').toEqual(err);
          done();
        });
    });

    it('Should run diamond depends queries', function(done) {
      var myQueries = qryq
        .graph({
          api: myApi,
        })
        .allQueries([
          {id: "A", depends:[], api: "add", input: {a:3, b:4}},
          {id: "B", depends:['A'], api: "multiply", input: {a:"#{A}", b:3}},
          {id: "C", depends:['A'], api: "multiply", input: {a:7, b: "#{A}"}},
          {id: "D", depends:['B', 'C'], api: "add", input: {a:"#{C}", b:"#{B}"}}
        ]);

      var promise;

      expect(function() {
        promise = myQueries.run();
      }).not.toThrow();

      promise
        .then(function success(result) {
          expect(result).toEqual({
            A: 7,
            B: 21,
            C: 49,
            D: 70,
          });
          done();
        }, function failure(err) {
          expect('promise.then').toEqual(err);
          done();
        });
    });

    it('Should run expression drilldown depends queries', function(done) {
      var myQueries = qryq
        .graph({
          api: myApi,
        })
        .allQueries([
          {id: "x", depends:[], api: "sampleObject", input: {}},
          {id: "y", depends:['x'], api: "multiply", input: {a:"#{x}.foo.bar", b:"#{x}.foo.baz"}}
        ]);

      var promise;

      expect(function() {
        promise = myQueries.run();
      }).not.toThrow();

      promise
        .then(function success(result) {
          expect(result).toEqual({
            x: {
              hello: 'world',
              foo: {
                bar: 5,
                baz: 6
              }
            },
            y: 30,
          });
          done();
        }, function failure(err) {
          expect('promise.then').toEqual(err);
          done();
        });
    });

    it('Should run infer depends queries', function(done) {
      var myQueries = qryq
        .graph({
          api: myApi,
        })
        .allQueries([
          {id: "q1", api: "add", input: {a:1, b:9}},
          {id: "q2", api: "add", input: {a:99, b:1}},
          {id: "q3", api: "multiply", input: {a: "#{q1}", b: "#{q2}"}},
          {id: "q4", api: "multiply", input: {a: "#{q3}", b:5}}
        ]);

      var promise;

      expect(function() {
        promise = myQueries.run();
      }).not.toThrow();

      promise
        .then(function success(result) {
          expect(result).toEqual({
            q1: 10,
            q2: 100,
            q3: 1000,
            q4: 5000,
          });
          done();
        }, function failure(err) {
          expect('promise.then').toEqual(err);
          done();
        });
    });

    it('Should run infer depends diamond depends queries', function(done) {
      var myQueries = qryq
        .graph({
          api: myApi,
        })
        .allQueries([
          {id: "A", api: "add", input: {a:3, b:4}},
          {id: "B", api: "multiply", input: {a:"#{A}", b:3}},
          {id: "C", api: "multiply", input: {a:7, b: "#{A}"}},
          {id: "D", api: "add", input: {a:"#{C}", b:"#{B}"}}
        ]);

      var promise;

      expect(function() {
        promise = myQueries.run();
      }).not.toThrow();

      promise
        .then(function success(result) {
          expect(result).toEqual({
            A: 7,
            B: 21,
            C: 49,
            D: 70,
          });
          done();
        }, function failure(err) {
          expect('promise.then').toEqual(err);
          done();
        });
    });

    it('Should run expression drilldown depends queries', function(done) {
      var myQueries = qryq
        .graph({
          api: myApi,
        })
        .allQueries([
          {id: "x", api: "sampleObject", input: {}},
          {id: "y", api: "multiply", input: {a:"#{x}.foo.bar", b:"#{x}.foo.baz"}}
        ]);

      var promise;

      expect(function() {
        promise = myQueries.run();
      }).not.toThrow();

      promise
        .then(function success(result) {
          expect(result).toEqual({
            x: {
              hello: 'world',
              foo: {
                bar: 5,
                baz: 6
              }
            },
            y: 30,
          });
          done();
        }, function failure(err) {
          expect('promise.then').toEqual(err);
          done();
        });
    });
  });
});
