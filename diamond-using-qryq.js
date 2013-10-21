	var qryq = require('./qryq');
	var _ = require('underscore');
	var Q = require('q');

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
		}
	};

	var queryQueue = [
	  {id: "A", api: "add", qry:{a:3, b:4}},
	  {id: "B", api: "multiply", qry:{a:"#{A}", b:3}},
	  {id: "C", api: "multiply", qry:{a:7, b: "#{A}"}},
	  {id: "D", api: "add", qry:{a:"#{C}", b:"#{B}"}}
	];
	var deferred = Q.defer();
	qryq.dependent(deferred, queryQueue, api);
	deferred.promise.then(function(diamondResult) {
		console.log('diamondResult:', JSON.stringify(diamondResult));
		var qryDsResult = _.findWhere(diamondResult, {id: 'D'});
		console.log('qryDsResult:', qryDsResult && qryDsResult.response && qryDsResult.response.value);	
	});

	/*

	- no need to think about how to wire up functions together
		- fully declarative
		- infers order of execution
		- infers which query depends upon the other
	- return value differs in philosophy
		- rather than return only the final result (like async#waterfall), returns all of them (like async#parallel)
		- execution does not stop when an error is encountered at some point in the chain
	- errors are verbose, and inline with each query
		- heaps easier to find out where a compound query has gone wrong
	- requires an additional dependency: Q for promises

	*/
