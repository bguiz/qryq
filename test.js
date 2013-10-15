var qryq = require('./qryq');
var _ = require('underscore');
var Q = require('q');

exports.qryqBasic = {
    setUp: function(callback) {
        // console.log('setUp called');
        callback();
    },
    tearDown: function(callback) {
        // console.log('tearDown called');
        callback();
    },
    testFunctionExposed: {
        exist: function(test) {
            var functionNames = [
                'parallel',
                'sequential',
                'dependent'
            ];
            _.each(functionNames, function(functionName) {
                test.ok(_.isFunction(qryq[functionName]), 
                    'qryq should have a method named '+functionName+' publicly exposed');
            });
            test.done();
        },
        doNotExist: function(test) {
            var functionNames = [
                'async',
                'validateQueue'
            ];
            _.each(functionNames, function(functionName) {
                test.ok(! _.isFunction(qryq[functionName]), 
                    'qryq should have a method named '+functionName+' publicly exposed');
            });
            test.done();
        }
    }
};

var api = {
  add: function(deferred, qry) {
    if (!qry || ! _.isNumber(qry.a) || ! _.isNumber(qry.b)) {
      deferred.reject('Must specify two numeric params, a and b. Params were: '+JSON.stringify(qry));
    }
    else {
      deferred.resolve(qry.a + qry.b);
    }
  },
  multiply: function(deferred, qry) {
    if (!qry || ! _.isNumber(qry.a) || ! _.isNumber(qry.b)) {
      deferred.reject('Must specify two numeric params, a and b. Params were: '+JSON.stringify(qry));
    }
    else {
      deferred.resolve(qry.a * qry.b);
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
  }
};

var testAQueryQueue = function(test, api, queryQueue, expectedResults) {
    var deferred = Q.defer();
    qryq.dependent(deferred, queryQueue, api);
    deferred.promise.then(function(result) {
        test.ok(true, 'qryq resolved');
        console.log(JSON.stringify(result));
        test.ok(_.isArray(result), 'Returned and array');
        test.equals(result.length, expectedResults.length, 'Returned expected number of results');

        _.each(result, function(qryResult, idx) {
            test.ok(! _.isUndefined(qryResult.id));
            var response = qryResult.response;
            test.ok(_.isObject(response), 'Qry id='+qryResult.id+' has a response object');
            test.equal(qryResult.id, expectedResults[idx].id, 'Qry id='+qryResult.id+' has expected id');
            if (!! response) {
                test.equals(response.state, 'fulfilled', 'Qry id='+qryResult.id+' has expected state');
                test.same(response.value, expectedResults[idx].value, 'Qry id='+qryResult.id+' has expected result');
            }
        }, this);
        test.done();
    }, function(reason) {
        test.ok(false, 'qryq rejected, reason:'+JSON.stringify(reason));
        test.done();
    });
};

exports.qryqApi = {
    setUp: function(callback) {
        // console.log('setUp called');
        callback();
    },
    tearDown: function(callback) {
        // console.log('tearDown called');
        callback();
    },
    testDepends: {
        noDependencies: function(test) {
            var aQueryQueue = [
              {id: "q1", depends:[], api: "add", qry:{a:1, b:9}},
              {id: "q2", depends:[], api: "multiply", qry:{a:7, b:6}}
            ];
            var expectedResults = [
                { id: 'q1', value: 10 }, 
                { id: 'q2', value: 42 }
            ];
            testAQueryQueue(test, api, aQueryQueue, expectedResults);
        },
        basic: function(test) {
            //TODO enable inferring depends array
            // var aQueryQueue = [
            //   {id: "q1", api: "add", qry:{a:1, b:9}},
            //   {id: "q2", api: "add", qry:{a:99, b:1}},
            //   {id: "q3", api: "multiply", qry:{a: "#{q1}", b: "#{q2}"}},
            //   {id: "q4", api: "multiply", qry:{a: "#{q3}", b:5}}
            // ];
            var aQueryQueue = [
              {id: "q1", depends:[], api: "add", qry:{a:1, b:9}},
              {id: "q2", depends:[], api: "add", qry:{a:99, b:1}},
              {id: "q3", depends:['q1', 'q2'], api: "multiply", qry:{a: "#{q1}", b: "#{q2}"}},
              {id: "q4", depends:['q3'], api: "multiply", qry:{a: "#{q3}", b:5}}
            ];
            var expectedResults = [
                { id: 'q1', value: 10 }, 
                { id: 'q2', value: 100 }, 
                { id: 'q3', value: 1000 }, 
                { id: 'q4', value: 5000 }
            ];
            testAQueryQueue(test, api, aQueryQueue, expectedResults);
        },
        diamond: function(test) {
            var aQueryQueue = [
              {id: "A", depends:[], api: "add", qry:{a:3, b:4}},
              {id: "B", depends:['A'], api: "multiply", qry:{a:"#{A}", b:3}},
              {id: "C", depends:['A'], api: "multiply", qry:{a:7, b: "#{A}"}},
              {id: "D", depends:['B', 'C'], api: "add", qry:{a:"#{C}", b:"#{B}"}}
            ];
            var expectedResults = [
                { id: 'A', value: 7 }, 
                { id: 'B', value: 21 }, 
                { id: 'C', value: 49 }, 
                { id: 'D', value: 70 }
            ];
            testAQueryQueue(test, api, aQueryQueue, expectedResults);
        },
        expressionDrilldown: function(test) {
            var aQueryQueue = [
              {id: "x", depends:[], api: "sampleObject", qry:{}},
              {id: "y", depends:['x'], api: "multiply", qry:{a:"#{x}.foo.bar", b:"#{x}.foo.baz"}}
            ];
            var expectedResults = [
                { id: 'x', value: {
                        hello: 'world',
                        foo: {
                            bar: 5,
                            baz: 6
                        }
                    } }, 
                { id: 'y', value: 30 }
            ];
            testAQueryQueue(test, api, aQueryQueue, expectedResults);
        },
        basicInferDepends: function(test) {
            var aQueryQueue = [
              {id: "q1", api: "add", qry:{a:1, b:9}},
              {id: "q2", api: "add", qry:{a:99, b:1}},
              {id: "q3", api: "multiply", qry:{a: "#{q1}", b: "#{q2}"}},
              {id: "q4", api: "multiply", qry:{a: "#{q3}", b:5}}
            ];
            var expectedResults = [
                { id: 'q1', value: 10 },
                { id: 'q2', value: 100 },
                { id: 'q3', value: 1000 },
                { id: 'q4', value: 5000 }
            ];
            testAQueryQueue(test, api, aQueryQueue, expectedResults);
        },
        diamondInferDepends: function(test) {
            var aQueryQueue = [
              {id: "A", api: "add", qry:{a:3, b:4}},
              {id: "B", api: "multiply", qry:{a:"#{A}", b:3}},
              {id: "C", api: "multiply", qry:{a:7, b: "#{A}"}},
              {id: "D", api: "add", qry:{a:"#{C}", b:"#{B}"}}
            ];
            var expectedResults = [
                { id: 'A', value: 7 },
                { id: 'B', value: 21 },
                { id: 'C', value: 49 },
                { id: 'D', value: 70 }
            ];
            testAQueryQueue(test, api, aQueryQueue, expectedResults);
        }
    },
    testApi: {
        inferDepends: function(test) {
            var line = {
                qry: "abc#{ksadhf}sdsd#{jfjf}sdjhnfj"
            };
            qryq._internal.inferDepends(line);
            test.ok(_.isArray(line.depends));
            test.equal(line.depends.length, 2);
            test.same(line.depends, ["ksadhf", "jfjf"]);

            var line2 = {id: "q3", api: "multiply", qry:{a: "#{q1}", b: "#{q2.xyz.123}"}};
            qryq._internal.inferDepends(line2);
            test.ok(_.isArray(line2.depends));
            test.equal(line2.depends.length, 2);
            test.same(line2.depends, ["q1", "q2"]);

            var line3 = {id: "q3", api: "multiply", qry:{a: 1, b: 2}};
            qryq._internal.inferDepends(line3);
            test.ok(_.isArray(line3.depends));
            test.equal(line3.depends.length, 0);
            test.same(line3.depends, []);

            var line4 = {id: "q4", api: "multiply", qry:{a: "#{q3}", b:5}};
            qryq._internal.inferDepends(line4);
            test.ok(_.isArray(line4.depends));
            test.equal(line4.depends.length, 1);
            test.same(line4.depends, ["q3"]);

            test.done();
        }
    }
};
