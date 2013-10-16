#qryq

qryq is a NodeJs library that allows one to express a series of queries and define dependencies between them either in parallel, in sequence, or in a directed acyclic graph.

(BTW, it's pronounced `/ˈkwərik/`)

## Adding to your project

The easiest way to add qryq to your node project is to use `npm`:

`npm install qryq --save`

To use it within your project:

`var qryq = require('qryq');`

## Sample usage

The best documentation for the usage are the [unit tests](https://github.com/bguiz/qryq/blob/master/test.js).

In summary:

- Create an `api` object
	- This is an object where each attribute is a function like this: `function(deferred, qry)`
	- It should process the `qry` object to obtain a result
	- Finally, it should call either `deferred.resolve` with the result, or `deferred.reject` with the error

- Create a query queue object, e.g.:

            var queryQueue = [
              {id: "A", api: "add", qry:{a:3, b:4}},
              {id: "B", api: "multiply", qry:{a:"#{A}", b:3}},
              {id: "C", api: "multiply", qry:{a:7, b: "#{A}"}},
              {id: "D", api: "add", qry:{a:"#{C}", b:"#{B}"}}
            ];

- Create a promise deferred object
	- e.g. `var deferred = Q.defer();`

- Call the desired `qryq` method with the promise deferred, query queue, and api objects.
	- e.g. `qryq.dependent(deferred, queryQueue, api);`
