# qryq

### Brendan Graetz

![Brendan Graetz](https://si0.twimg.com/profile_images/2697395233/8dec79da8f5963a4cad4da0ebd6a532d.png "Brendan Graetz on Twitter") [@bguiz](http://bguiz.com "Brendan Graetz on Twitter")

[bguiz.com](http://bguiz.com "Brendan Graetz")

----

## In one sentence

Code that manages, using promises, a series of API queries, which may be executed in parallel, in sequence, or in an order required by specified dependency of one API query upon the results of zero or more other API queries in the same series where these dependencies form a directed acyclic graph

----

## Implementation

Frameworks
- [node.js](http://nodejs.org)
- [express.js](expressjs.com)

Dependencies
- [Q](https://github.com/kriskowal/q)
- [underscore.js](http://underscorejs.org)

----

## Inspiration

- Neil Jenkin's talk Tips, Tricks and Hacks in the Pursuit of Speed
  - [REST is slow](http://nmjenkins.com/presentations/network-speed.html#/14)
  - [Concatenate requests](http://nmjenkins.com/presentations/network-speed.html#/15)
  - [Concatenate responses](http://nmjenkins.com/presentations/network-speed.html#/16)

- [Play framework](http://playframework.com)'s
  - [Linkedin talk by Yevgeniy Brikman](http://www.slideshare.net/brikis98/the-play-framework-at-linkedin)
  - See slides 85 through 88

----

## Itch scratch

- NodeJs callback spaghetti
- Fix this using promises
- While better, if the code is sufficiently complex, you can still end up with promise spaghetti

---

- `Q` spaghetti

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

## Light bulb

- [Q - executing a series of promises and defining dependencies between them in a DAG](http://stackoverflow.com/questions/17342401/q-executing-a-series-of-promises-and-defining-dependencies-between-them-in-a-d)
  - Queries plus their results are the nodes
  - Deferred promises are the edges
  - Form a directed acyclic graph
- Yay for [graph theory](en.wikipedia.org/wiki/Graph_theory)

----

## Alpha

- Currently implemented in [walkre](https://github.com/bguiz/walkre)
  - Not suitable for any real use yet, watch this space

----

## Horizon

- Load testing/ stress testing
  - Start including high latency ops, e.g. disk I/O
  - Put Neil Jenkin's hypothesis to the test
- Create a front end for this server
  - Full stack end to end load testing/ stress testing
- Separate `qryq` into its own library
  - Presently exists within `walkre`
- Feature to reference results of dependent queries inline in query data

----

## Fin
