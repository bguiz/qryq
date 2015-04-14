var async = require('async');
var _  = require('underscore');

var api = {
  add: function(qry, callback) {
    if (!qry || ! _.isNumber(qry.a) || ! _.isNumber(qry.b)) {
      callback('Must specify two numeric params, a and b. Params were: '+JSON.stringify(qry), null);
    }
    else {
      callback(null, qry.a + qry.b);
    }
  },
  multiply: function(qry, callback) {
    if (!qry || ! _.isNumber(qry.a) || ! _.isNumber(qry.b)) {
      callback('Must specify two numeric params, a and b. Params were: '+JSON.stringify(qry), null);
    }
    else {
      callback(null, qry.a * qry.b);
    }
  }
};

async.waterfall([
	function(callback) {
		callback(null, {a: 3, b: 4});
	},
	api.add, //A
	function(result1, callback) {
		async.parallel([
			function(cb) { //B
				api.multiply({a: result1, b: 3}, cb);
			},
			function(cb) { //C
				api.multiply({a: 7, b: result1}, cb);
			}
		],
		function(err, parallelResult) {
			callback(null, {a: parallelResult[1], b: parallelResult[0]});
		});
	},
	api.add //D
],
function(err, diamondResult) {
	console.log('diamondResult:', diamondResult);
});

/*

Notes:

- with async there is a need to use wrapper function whenever parsing is necessary
	- also to pass in the initial value
- with async, the syntax is a lot more verbose
	- still need to think of how to "wire up" the function together by knowing their implementation
	- not fully declarative

*/

