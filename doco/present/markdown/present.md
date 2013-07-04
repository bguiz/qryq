# qryq

<sup>
	/ˈkwərik/
</sup>

### Brendan Graetz

![Brendan Graetz](https://si0.twimg.com/profile_images/2697395233/8dec79da8f5963a4cad4da0ebd6a532d.png "Brendan Graetz on Twitter")

[@bguiz](http://bguiz.com "Brendan Graetz on Twitter")

[bguiz.com](http://bguiz.com "Brendan Graetz")

----

## In one sentence

Manages, using promises, a list of API queries, which may be executed in parallel, in sequence, or in an order required by specified dependency of one API query upon the results of zero or more other API queries in the same list where these dependencies form a directed acyclic graph.

(a long sentence)

---

### The Query Queue

<pre>
	<code>
[
	{"id":"a1","depends":[],"data":{"some":"data a1"}},
	{"id":"b1","depends":["a1"],"data":{"some":"data b1"}},
	{"id":"b2","depends":["a1"],"data":{"some":"data b2"}},
	{"id":"c1","depends":["b1","b2"],"data":{"some":"data c1"}},
	{"id":"x1","depends":[],"data":{"some":"data x1"}},
]
	</code>
</pre>

----

## Implementation

Frameworks
- [node.js](http://nodejs.org)
- [express.js](expressjs.com)

Dependencies
- [Q](https://github.com/kriskowal/q)
- [underscore.js](http://underscorejs.org)

---

- First time writing a nodejs application
- First time using express
- First time using promises
- Made quite a few n00b mistakes along the way

---

- Trying to force express to parse all calls as JSON, no matter what

				server.post('/api/v1', [middleware.readRequestDataAsString, middleware.acceptOnlyJson], function(req, resp) {
					/* ... */
				});


				exports.readRequestDataAsString = function(req, resp, next) {
					req.content = '';
					var contentLength = 0;
					req.on('data', function(data) {
						req.content += data;
						contentLength += data.length;
						if (contentLength > maxContentLength) {
							/* ... */


				exports.acceptOnlyJson = function(req, resp, next) {
					try {
						req.json = JSON.parse(req.content);
						/* ... */

----

## Inspiration

- Neil Jenkin's talk Tips, Tricks and Hacks in the Pursuit of Speed
  - [REST is slow](http://nmjenkins.com/presentations/network-speed.html#/14)
  - [Concatenate requests](http://nmjenkins.com/presentations/network-speed.html#/15)
  - [Concatenate responses](http://nmjenkins.com/presentations/network-speed.html#/16)

---

<pre>
	<code class="js">
POST /api/

[
    [ 'deleteMessages', {
        idList: [ 'msg1' ]
    }],
    [ 'getMailboxMessageList', {
        mailboxName: 'Inbox',
        position: 0,
        limit: 30,
        sort: 'date descending'
    }]
]
	</code>
</pre>

---

## Inspiration

- [Play framework](http://playframework.com)'s
  - [Linkedin talk by Yevgeniy Brikman](http://www.slideshare.net/brikis98/the-play-framework-at-linkedin)
  - See slides 85 through 88

---

<div>
	<iframe src="http://www.slideshare.net/slideshow/embed_code/22423382?rel=0&startSlide=85" width="512" height="421" frameborder="0" marginwidth="0" marginheight="0" scrolling="no" style="border:1px solid #CCC;border-width:1px 1px 0;margin-bottom:5px" allowfullscreen webkitallowfullscreen mozallowfullscreen>
	</iframe>
	<div style="margin-bottom:5px">
		<strong> <a href="http://www.slideshare.net/brikis98/the-play-framework-at-linkedin" title="The Play Framework at LinkedIn" target="_blank">The Play Framework at LinkedIn</a></strong> from <strong><a href="http://www.slideshare.net/brikis98" target="_blank">Yevgeniy Brikman</a></strong>
	</div>
</div>

----

## Itch scratch

- NodeJs callback spaghetti
- Fix this using promises
- While better, if the code is sufficiently complex, you can still end up with:
- Promise spaghetti

---

- `Q` spaghetti
- Sample code of how *not* to use promises

				qry.journeyPlanner = qry.journeyPlanner || 'gmaps';
				var needGeo =
				  (qry.journeyPlanner === 'melbtrans')
				  || _.some(qry.destinations, function(destination) {
				    destination.hasOwnProperty('fixed') && (destination.fixed === true);
				  });
				var originPromises = [];
				var destinationPromises = [];
				if (needGeo) {
				  //get geolocations for all locations present
				  if (!qry.origin.lat || !qry.origin.lon) {
				    var originGeoDeferred = Q.defer();
				    exports.gmapsGeoLookup(originGeoDeferred, qry.origin);
				    originPromises.push(originGeoDeferred.promise);
				  }
				  _.each(qry.destinations, function(destination) {
				    var destGeoDeferred = Q.defer();
				    exports.gmapsGeoLookup(destGeoDeferred, destination.location);
				    destinationPromises.push(destGeoDeferred.promise);
				  }, this);
				}
				var originPromisesDeferred = Q.defer();
				Q.allSettled(originPromises).then(function(results) {
				  _.each(results, function(result) {
				    if (result.state === 'fulfilled') {
				      var val = result.value;
				      qry.origin.lat = val.lat;
				      qry.origin.lon = val.lon;
				    }
				    else {
				      console.log('originPromises allSettled:', result.error);
				    }
				  }, this);
				  originPromisesDeferred.resolve(qry.origin);
				});
				var destinationsPromisesDeferred = Q.defer();
				Q.allSettled(destinationPromises).then(function(results) {
				  _.each(results, function(result, idx) {
				    if (result.state === 'fulfilled') {
				      var val = result.value;
				      qry.destinations[idx].location.lat = val.lat;
				      qry.destinations[idx].location.lon = val.lon;
				    }
				    else {
				      console.log('destinationPromises allSettled:', result.error);
				    }
				  }, this);
				  destinationsPromisesDeferred.resolve(qry.destinations);
				});
				Q.allSettled([originPromisesDeferred.promise, destinationsPromisesDeferred.promise]).then(function(results) {
				  //we don't care about the results returned, because they were modified in place in the qry object
				  //more importantly, we are now assured that all addresses have a lat and lon, if needGeo is true
				  var scorePromises = [];

				  //get the transport information from the origin to each destination using each transport mode
				  var origin = qry.origin;
				  _.each(qry.destinations, function(destination) {
				    //TODO check that weights add up for destinations
				    _.each(destination.modes, function(mode) {
				      //we have origin, destination, and mode
				      //TODO check that weights add up for modes
				      //now work out the transport information between this origin and this destination using this mode
				      var scoreDeferred = Q.defer();
				      scorePromises.push(scoreDeferred.promise);
				      exports.scoreOne(scoreDeferred, {
				        origin: origin,
				        destination: destination.location,
				        mode: mode,
				        journeyPlanner: qry.journeyPlanner
				      });
				    });
				  }, this);

				  Q.allSettled(scorePromises).then(function(scoreResults) {
				    var orig_dest_mode = {};
				    _.each(scoreResults, function(result) {
				      if (result.state === 'fulfilled') {
				        var score = result.value;
				        orig_dest_mode[score.origin.address] =
				          orig_dest_mode[score.origin.address] ||
				          {};
				        orig_dest_mode[score.origin.address][score.destination.address] =
				          orig_dest_mode[score.origin.address][score.destination.address] ||
				          {};
				        orig_dest_mode[score.origin.address][score.destination.address][score.mode.form] =
				          orig_dest_mode[score.origin.address][score.destination.address][score.mode.form] ||
				          {
				            origin: score.origin,
				            destination: score.destination,
				            mode: score.mode,
				            score: score.score
				          };
				      }
				      else {
				        console.log('scorePromises allSettled:', result.error);
				      }
				    });

				    // parse weights to calculate aggregate score, iterate over original qry rather than score results,
				    //in case some results are rejections
				    var origin = qry.origin;
				    var destinationWeightSum = 0;
				    var destinationScoreSum = 0;
				    var calcErrors = [];
				    _.each(qry.destinations, function(destination) {
				      var destinationWeight = destination.weight || 1.0;
				      destinationWeightSum += destinationWeight;
				      var modeWeightSum = 0;
				      var modeScoreSum = 0;
				      _.each(destination.modes, function(mode) {
				        var modeWeight = mode.weight || 1.0;
				        modeWeightSum += modeWeight;
				        var modeScore = 0;
				        if (
				          orig_dest_mode[origin.address] &&
				          orig_dest_mode[origin.address][destination.location.address] &&
				          orig_dest_mode[origin.address][destination.location.address][mode.form]) {
				          modeScore = orig_dest_mode[origin.address][destination.location.address][mode.form].score;
				        }
				        else {
				          calcErrors.push('No data available for journey from '+origin.address+
				            ' to '+destination.address+
				            ' by '+mode.form);
				        }
				        modeScoreSum += (modeScore * modeWeight);
				      });
				      destinationScoreSum += (modeScoreSum / modeWeightSum * destinationWeight);
				    });
				    destinationScoreSum = destinationScoreSum / destinationWeightSum;
				    //divide by weight sums to scale to 0 to 1 range

				    var out = {
				      score: (destinationScoreSum * 0.5),
				      errors: calcErrors,
				      raw: scoreResults
				    };
				    deferred.resolve(out);
				  });
				});

----

## Light Bulb

- Asked a question on S/O
	- [Q - executing a series of promises and defining dependencies between them in a DAG](http://stackoverflow.com/questions/17342401/q-executing-a-series-of-promises-and-defining-dependencies-between-them-in-a-d)
- In summary
  - Queries plus their results are the nodes
  - Deferred promises are the edges
  - Form a directed acyclic graph
- Yay for [graph theory](en.wikipedia.org/wiki/Graph_theory)
  - `Q` allows me to use the data structure without having to write the algorithm

---

### Light Bulb

I would like to process a series of data, where the output of each may be used as inputs into the others.

For example:

<pre>
	<code class="js">
var batch = [
	{"id":"a1","depends":[],"data":{"some":"data a1"}},
	{"id":"b1","depends":["a1"],"data":{"some":"data b1"}},
	{"id":"b2","depends":["a1"],"data":{"some":"data b2"}},
	{"id":"c1","depends":["b1","b2"],"data":{"some":"data c1"}},
	{"id":"x1","depends":[],"data":{"some":"data x1"}},
];
	</code>
</pre>

This means that once `a1` is complete, its output will be sent to both `b1` and `b2`;
and when these complete, both of their output will be sent to `c1` (only upon both of their completion.
`x1` may execute in parallel with all of `a1`, `b1`, `b2`, and `c1`;
and `b1` may execute in parallel with `b2`, as no `depends` between them are defined.

---

### Light Bulb

Upon completion of `c1` and `x1`, and therefore the completion of all 5 of them, the output of all five should be returned.

We will assume that no circular dependencies are defined, and thus is a directed acyclic graph (DAG)

I would like to know how to implement this using [Q](https://github.com/kriskowal/q/wiki/API-Reference), because:

- All the processing of the data will be asynchronous, and thus I will need to use either callbacks, or deferreds and promises;
and I prefer the latter
- Promises can double up as a convenient way to define the edges in the graph

----

## Alpha Quality

- Currently implemented in [walkre](https://github.com/bguiz/walkre)
  - Not suitable for any real use yet, watch this space

----

## Horizon

- Rewrite the `Q` spaghetti in [walkre](https://github.com/bguiz/walkre)
	- Demonstrate how declaratively defining dependent queries can make code more comprehensible
- Cyclic graph detection in dependent query queue validation
- Feature to reference results of dependent queries *inline* in query data
	- Kinda [like this](http://nmjenkins.com/presentations/network-speed.html#/17)

---

<pre>
	<code class="js">
[
    [ 'setMailboxes', {
        create: {
            '123': {
                name: 'Important'
            }
        }
    }],
    [ 'setPopLinks', {
        create: {
            '124': {
                server: 'pop.live.com',
                port: 110,
                username: 'testuser@live.com'
                password: 'letmein'
                folder: '#123'
            }
        }
    }]
]
	</code>
</pre>

---

### Farther Horizon

- Load testing/ stress testing
  - Start including high latency ops, e.g. disk I/O
  - Put Neil Jenkin's hypothesis to the test
- Create a front end for this server
  - Full stack end to end load testing/ stress testing
- Separate [qryq](https://github.com/bguiz/qryq) into its own library
  - Presently exists only within [walkre](https://github.com/bguiz/walkre)

----

## Fin

- Recommendation for load testing a nodejs server?
- What other libraries are there out that that perform this function? In other languages?
- Submit some patches!

----

## Thank you

[bguiz.com](http://bguiz.com)

[@bguiz](http://twitter.com/bguiz)

[qryq](https://github.com/bguiz/qryq)

[walkre](https://github.com/bguiz/walkre)

[this preso](https://github.com/bguiz/qryq/blob/present/doco/present.md)
