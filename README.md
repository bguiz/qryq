# `qryq`

[![NPM](https://nodei.co/npm/qryq.png)](https://github.com/bguiz/qryq/)

[![Build Status](https://travis-ci.org/bguiz/qryq.svg?branch=master)](https://travis-ci.org/bguiz/qryq)
[![Coverage Status](https://coveralls.io/repos/bguiz/qryq/badge.svg?branch=master)](https://coveralls.io/r/bguiz/qryq?branch=master)

`qryq` is a NodeJs library that allows one to express and run
arbitrary sets of dependent queries as directed acyclic graphs.

Its name derives from "query queue".

## Adding to your project

`npm install qryq --save`

To use it within your project:

`var qryq = require('qryq');`

## Usage

Create an API object.
`qryq` will look up API methods by keys on this object.
The values are expected to be functions which conform to the signature:
`function(deferred, data)`
where deferred is a `Q` deferred promise,
and data is an object expected to contain the required inputs for this API.

```javascript
var myApi = {
  add: function(deferred, data) {
    if (typeof data.num1 !== 'number' || typeof data.num2 !== 'number') {
      deferred.reject('Invalid data');
    }
    else {
      deferred.resolve(data.num1 + data.num2);
    }
  },
  multiply: function(deferred, data) {
    if (typeof data.num1 !== 'number' || typeof data.num2 !== 'number') {
      deferred.reject('Invalid data');
    }
    else {
      deferred.resolve(data.num1 * data.num2);
    }
  },
};
```

Tell `qryq` to construct a graph of dependent queries.
Initially call the `graph()` method, and pass in the API object created previously.
Next, for each query, name the API method it should invoke using `.api()`,
and what input data it should receive using `.input()`.

Note that the dependencies are inferred automatically from the input data object.
If any values are a string that looks like `'#{ANOTHER_QUERYS_NAME}'`,
the output value of the other query named will be substituted in its place.
This means that this other query is identified as a prerequisite,
and thus must complete successfully **before** the prior query begins.
`qryq` will automatically identify that this is the case,
and wire up the promises as required.

```javascript
var myQueries = qryq
  .graph({ api: myApi })
  .query('A')
    .api('add')
    .input({ num1: 3, num2: 4 })
  .query('B')
    .api('multiply')
    .input({ num1: '#{A}', num2: 3 })
  .query('C')
    .api('multiply')
    .input({ num1: 7, num2: '#{A}' })
  .query('D')
    .api('add')
    .input({ num1: '#{C}', num2: '#{B}' });
```

After constructing the graph of dependent queries,
we kick off their execution using the `run()` method.
This returns a promise.

```javascript
var myPromise = myQueries.run();

myPromise.then(function(result) {
  // Do something with result
});
```

In the above example, we expect result to be:

```javascript
{
  A: 7,
  B: 21,
  C: 49,
  D: 70,
}
````

## Advanced usage

### Manually Specifying Dependents

Use `depends()` to specify an array of names of queries that this query depends on.
This saves `qryq` from having to analyse the input object,
thereby acting as a possible performance optimisation.

```javascript
  .query('D')
    .api('add')
    .depends(['C', 'D'])
    .input({ num1: '#{C}', num2: '#{B}' })
```

This does not result in any difference in the expected output.
However, if the dependent queries are specified incorrectly,
behaviour is not defined and incorrect results may be returned.

The `depends` are computed upon setting input if not already present,
so call it **before** calling `input()`.

### Filtering Results

Call `filterOutput()` to filter the output of this query
from the final result.

```javascript
  .query('A')
    .api('add')
    .input({ num1: 3, num2: 4 })
    .filterOutput(true)
```

This would produce an output like this instead:

```javascript
{
  B: 21,
  C: 49,
  D: 70,
}
````

### Expression Drilldown

`qryq` also supports drilling down into keys of objects
that have been returned by dependent queries.

```javascript
var myQueries = qryq
  .graph({ api: myApi })
  .query('A')
    .api('foobar')
    .input({})
  .query('B')
    .api('baz')
    .input({ value: '#{A}.foo.bar' });
```

In the example above, we assume that the `foobar` API returns this object:
`{ foo: { bar: 123 } }`.
After this, the `baz` API is called with this input object: `{ value: 123 }`.

### Non-fluent Interface

Instead of using a fluent interface as above,
call `allQueries()` and pass in an array of query objects.

```javascript
var myQueries = qryq
  .graph({ api: myApi })
  .allQueries([
    { id: 'A', api: 'add', input: { num1: 3, num2: 4 } },
    { id: 'B', api: 'multiply', input: { num1: '#{A}', num2: 3 } },
    { id: 'C', api: 'multiply', input: { num1: 7, num2:  '#{A}' } },
    { id: 'D', api: 'add', input: { num1: '#{C}', num2: '#{B}' } }
  ]);
```

This approach is made available for two reasons:

- easy migration from `qryq@0`
  - note that what is now named `input` was previously named `qry`
- when there is a need to construct the list of queries without `qryq`,
  - for example if `qryq` is on a server,
    and the client makes a request to the server with this list of queries.

## Pronunciation

`qryq` is pronounced as `/ˈkwərik/`.

## Contributing

This repository uses the
[**git flow** ](http://nvie.com/posts/a-successful-git-branching-model/)
branching strategy.
If you wish to contribute, please branch from the **develop** branch -
pull requests will only be requested if they request merging into the develop branch.

## Licence

GPLv3

## Author

[Brendan Graetz](http://bguiz.com)
