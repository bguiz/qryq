# qryq

## stop RESTing, start using query queues

<sup>
  /ˈkwərik/
</sup>

### Brendan Graetz

![Brendan Graetz](https://si0.twimg.com/profile_images/2697395233/8dec79da8f5963a4cad4da0ebd6a532d.png "Brendan Graetz on Twitter")

[@bguiz](http://bguiz.com "Brendan Graetz on Twitter")

[bguiz.com](http://bguiz.com "Brendan Graetz")

## In one sentence

`qryq` is a NodeJs library that allows one to express a series of API queries and define dependencies between them either in parallel, in sequence, or in a directed acyclic graph.

----

## The Query Queue

<pre>
  <code>
[
  {id: "q1", api: "add",
    qry:{a:1, b:9}},
  {id: "q2", api: "add",
    qry:{a:99, b:1}},
  {id: "q3", api: "multiply",
    qry:{a: "#{q1}", b: "#{q2}"}},
  {id: "q4", api: "multiply",
    qry:{a: "#{q3}", b:5}}
]
  </code>
</pre>

<pre>
  <code>
`q2`                          --> add(99, 1)          --> 100
`q1`                          --> add(1, 9)           --> 10
`q3` --> multiply(`q1`, `q2`) --> multiply(10, 100)   --> 1000
`q4` --> multiply(`q3`, 5)    --> multiply(1000, 5)   --> 5000
  </code>
</pre>

- Note that `q1` and `q2` may execute in any order,
- `q3` may only execute when both of them finish,
- and `q4` executes last.

The wiring is done automatically by `qryq`

---

What about `async`?

- You can accomplish the same thing using `async`
  - Sequential: On par
  - Parallel: On par
  - Dependent: Made a lot easier
- Focus on dev productivity

----

## Real World Query Queue

<pre>
  <code>
[
  {"id":"qGeocodeOrigin","depends":[],"api":"gmapsGeoLookup","qry":{"address":"36 Meadow Wood Walk, Narre Warren VIC 3805"}},
  {"id":"qGeocodeDestination","depends":[],"api":"gmapsGeoLookup","qry":{"address":"19 Bourke Street, Melbourne, VIC 3000"}},
  {"id":"qScore","depends":["qGeocodeOrigin","qGeocodeDestination"],"api":"score","qry":{
      "origin":{"address":"36 Meadow Wood Walk, Narre Warren VIC 3805","lat":"#{qGeocodeOrigin}.lat","lon":"#{qGeocodeOrigin}.lon"},
      "journeyPlanner":"melbtrans",
      "destinations":[
        {
          "fixed":true,"class":"work","weight":0.8,
          "location":{"address":"19 Bourke Street, Melbourne, VIC 3000","lat":"#{qGeocodeDestination}.lat","lon":"#{qGeocodeDestination}.lon"},
          "modes":[{"form":"transit","max":{"time":2400}}]
        }
      ]
    }
  }
]
  </code>
</pre>

From [`walkre`](https://github.com/bguiz/walkre "walkre")

----

## Benefits

- Developer productivity
- Bandwidth & latency savings

---

### Benefits - Dev Productivity

- Less need to write dedicated APIs
  - Unix philosophy
- readable && composable
  - declarative query from client
  - rather than imperative impl. on server
  - avoids callback spaghetti && promise spaghetti

---

### Benefits - Dev Productivity


- Less duplication of biz logic required
  - Client/ server
- Groups several queries together as an atomic unit
  - [Asynchronous UIs](http://blog.alexmaccaw.com/asynchronous-ui)

---

### Benefits - 'Net Traffic

- Concatenation
  - Multiple requests
  - Multiple responses
- [Protocol overhead](http://sd.wareonearth.com/~phil/net/overhead/) minimised

----

## Limitations

- non-RESTful
- Testability?
- Expression engine

---

### Limitations - REST

- Do you need REST when you are *not* doing CRUD?
- What if you typically chain more than one CRUD operation together?

---

### Limitations - Testing

- Testing is made harder because clients may compose APIs in novel ways
- Forces one to write more resilient/ robust code

---

### Limitations - Expressions

- Expressions are limited
- One `qry` references the result of another `qry` in the same `qryq`
- Can only "drill down" through properties

`#{previousQry}.flights.length`

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

## The Itch

- NodeJs callback spaghetti
- Fix this using promises
- While better, if the code is sufficiently complex, you can still end up with:
- Promise spaghetti

----

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

- `Q` spaghetti
- Code demonstrating how *not* to use promises
- Code demonstrating how to do the same thing, using query queues

---

- Request made by the client
- Before - 3 separate queries:

```
to gmapsGeoLookup:
{"address":"36 Meadow Wood Walk, Narre Warren VIC 3805"}
{"address":"19 Bourke Street, Melbourne, VIC 3000"}
```

```
to score:
{
  "origin":{"address":"36 Meadow Wood Walk, Narre Warren VIC 3805","lat":"123.999","lon":"456.999"},
  "journeyPlanner":"melbtrans",
  "destinations":[
    {
      "fixed":true,"class":"work","weight":0.8,"location":{"address":"19 Bourke Street, Melbourne, VIC 3000","lat":"789.111","lon":"123.111"},
      "modes":[{"form":"transit","max":{"time":2400}}]
    }
  ]
}
```

---

- Request made by the client
- After - a single query:

```
[
  {"id":"qGeocodeOrigin","depends":[],"api":"gmapsGeoLookup","qry":{"address":"36 Meadow Wood Walk, Narre Warren VIC 3805"}},
  {"id":"qGeocodeDestination","depends":[],"api":"gmapsGeoLookup","qry":{"address":"19 Bourke Street, Melbourne, VIC 3000"}},
  {"id":"qScore","depends":["qGeocodeOrigin","qGeocodeDestination"],"api":"score","qry":{
      "origin":{"address":"36 Meadow Wood Walk, Narre Warren VIC 3805","lat":"#{qGeocodeOrigin}.lat","lon":"#{qGeocodeOrigin}.lon"},
      "journeyPlanner":"melbtrans",
      "destinations":[
        {
          "fixed":true,"class":"work","weight":0.8,
          "location":{"address":"19 Bourke Street, Melbourne, VIC 3000","lat":"#{qGeocodeDestination}.lat","lon":"#{qGeocodeDestination}.lon"},
          "modes":[{"form":"transit","max":{"time":2400}}]
        }
      ]
    }
  }
]
```

---

- ... however, this means that the code on the server can focus on just one thing
- similar in concept to the UNIX command line philosophy
  - make sure you do just one thing well, and
  - chain well with others

---

- Server `score` API before:

```javascript
exports.score = function(deferred, qry) {
  var validateErrs = validateScore(qry);
  if (validateErrs.length > 0) {
    deferred.reject({
      msg: 'Score could not be computed',
      errors: validateErrs
    });
    return;
  }
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

      //some business logic
      var out = {
        /* ... */
      };
      deferred.resolve(out);
    });
  });
};
```

---

- Server `score` API after:
- ~Half the numebr of lines of code required

```javascript
exports.score = function(deferred, qry) {
  var validateErrs = validateScore(qry);
  if (!validateErrs || validateErrs.length > 0) {
    deferred.reject({
      msg: 'Score could not be computed',
      errors: validateErrs
    });
    return;
  }
  qry.journeyPlanner = qry.journeyPlanner || 'gmaps';

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
  });

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

      //some business logic
      var out = {
        /* ... */
      };
      deferred.resolve(out);
  });
};
```

----

## Horizon

- [x] Rewrite the `Q` spaghetti in [walkre](https://github.com/bguiz/walkre)
  - Demonstrate how declaratively defining dependent queries can make code more comprehensible
- [x] Feature to reference results of dependent queries *inline* in query data
  - Kinda [like this](http://nmjenkins.com/presentations/network-speed.html#/17)
- [ ] Separate [qryq](https://github.com/bguiz/qryq) into its own library
  - Presently exists only within [walkre](https://github.com/bguiz/walkre)
- [ ] Write unit tests
- [ ] Pick a licence for this library
- [ ] Benchmarking for performance

---

### Farther Horizon

- [ ] Cyclic graph detection in dependent query queue validation
- [ ] Load testing/ stress testing
  - Start including high latency ops, e.g. disk I/O
- [ ] Create a front end for this server
  - For full stack end to end load testing/ stress testing
- [ ] Create a NodeJs/ ExpressJs server wrapper for `qryq`
- [ ] Allow configurable parallelism

----

## Fin

- Recommendations for load testing a nodejs server?
- What other libraries are there out that that perform this function? In other languages?
- Submit some patches!

----

## Thank you

[bguiz.com](http://bguiz.com)

[@bguiz](http://twitter.com/bguiz)

[bit.ly/qryq](http://bguiz.com/post/54620002947/qryq "qryq intro")

[github.com/bguiz/qryq](https://github.com/bguiz/qryq "qryq source")

[/doco/present/markdown/present.md](https://github.com/bguiz/qryq/blob/master/doco/present/markdown/present.md "this presentation")

[github.com/bguiz/walkre](https://github.com/bguiz/walkre "walkre source")

----

## The Code

----

## Parallel

[github.com/bguiz/qryq](http://github.com/bguiz/qryq)

<pre>
  <code class="js">
var numApiCalls = qry.length;
var apiPromises = [];
_.each(qry, function(line) {
var apiQry = line.qry;
var apiName = line.api;
var apiFunc = api[apiName];
if (!apiFunc) {
  apiFunc = api.noSuchApi;
  apiQry = apiName;
}
apiPromises.push(async(apiFunc, apiQry));
});
  </code>
</pre>

---

### Parallel

[github.com/bguiz/qryq](http://github.com/bguiz/qryq)

<pre>
  <code class="js">
Q.allSettled(apiPromises).then(function(apiResults) {
var out = [];
_.each(apiResults, function(apiResult, idx) {
  var result = _.extend({
    id: qry[idx].id,
    api: qry[idx].api},
    apiResult);
  out.push(result);
});
deferred.resolve(out);
});
  </code>
</pre>

----

## Sequential

[github.com/bguiz/qryq](http://github.com/bguiz/qryq)

<pre>
  <code class="js">
var numApiCalls = qry.length;
var out = [];
function sequentialLine(idx) {
var line = qry[idx];
var apiQry = line.qry;
var apiName = line.api;
var apiFunc = api[apiName];
if (!apiFunc) {
  apiFunc = api.noSuchApi;
  apiQry = apiName;
}
var promise = async(apiFunc, apiQry);
promise.then(
  /* ... */
);
}
sequentialLine(0);
  </code>
</pre>

---

### Sequential

[github.com/bguiz/qryq](http://github.com/bguiz/qryq)

```javascript
promise.then(
  function(result) {
    out.push(result);
    if (idx < numApiCalls - 1) {
      sequentialLine(idx + 1);
    }
    else {
      deferred.resolve(out);
    }
  },
  function(err) {
    deferred.reject({
      error: 'Cannot process query '+apiQry.id,
      detail: err,
      incompleteResults: out
    });
  }
);
```

----

## Dependent

[github.com/bguiz/qryq](http://github.com/bguiz/qryq)

<pre>
  <code class="js">
var linePromisesHash = {};
var linePromises = [];
_.each(qry, function(line) {
var apiQry = line.qry;
var apiName = line.api;
var apiFunc = api[apiName];
if (!apiFunc) {
  apiFunc = api.noSuchApi;
  apiQry = apiName;
}
var linePromise = dependentLine(line, apiFunc, linePromisesHash);
linePromises.push(linePromise);
linePromisesHash[line.id] = linePromise;
});
  </code>
</pre>

---

### Dependent

[github.com/bguiz/qryq](http://github.com/bguiz/qryq)

<pre>
  <code class="js">
var dependentLine = function(line, apiFunc, linePromisesHash) {
  var lineDeferred = Q.defer();
  var dependsPromises = [];
  var depIds = line.depends;
  _.each(depIds, function(depId) {
    var dependPromise = linePromisesHash[depId];
    dependsPromises.push(dependPromise);
  });
  Q.allSettled(dependsPromises).then(function(dependsResults) {
    /* ... */
  });
  return lineDeferred.promise;
};
  </code>
</pre>

---

### Dependent

[github.com/bguiz/qryq](http://github.com/bguiz/qryq)

<pre>
  <code class="js">
Q.allSettled(dependsPromises).then(function(dependsResults) {
var dependsResultsHash = {};
_.each(dependsResults, function(depResult, idx) {
  var depId = depIds[idx];
  if (depResult.state === 'fulfilled') {
    dependsResultsHash[depId] = depResult;
  }
  else {
    dependsResultsHash[depId] = null;
  }
});
var lineQryWithDepends = {};
_.extend(
  lineQryWithDepends,
  line.qry,
  {dependsResults: dependsResultsHash}
);
apiFunc(lineDeferred, lineQryWithDepends);
});
  </code>
</pre>

---

### Dependent

[github.com/bguiz/qryq](http://github.com/bguiz/qryq)

<pre>
  <code class="js">
Q.allSettled(linePromises).then(function(lineResults) {
var out = [];
_.each(lineResults, function(lineResult, idx) {
  var lineId = qry[idx].id;
  out.push({
    id: lineId,
    response: lineResult
  });
});
deferred.resolve(out);
});
  </code>
</pre>
