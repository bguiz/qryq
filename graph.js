'use strict';

var Q = require('q');

function qryqGraph(context) {
  var api = context.api;
  if (typeof api !== 'object') {
    throw new Error('Expected an API object');
  }

  var fluent = {
    queries: [],
    query: query,
    api: api,
    input: input,
    depends: depends,
    filterOutput: filterOutput,
    allQueries: allQueries,
    run: run,
  };
  var currentQuery;

  /**
   * query begins describing a new query.
   * subsequent calls to input, depends, and filterOutput will apply to this query
   *
   * @param id {string}
   * @return {Fluent}
   */
  function query(id) {
    //TODO
    return fluent;
  }

  /**
   * api specifies the name of the API the current query should invoke
   *
   * @param name {string}
   * @return {Fluent}
   */
  function api(name) {
    //TODO
    return fluent;
  }

  /**
   * input specifies what the input to pass to the identified API function.
   *
   * Input fields may be specified as strings such as `'#{ANOTHER_QUERYS_NAME}'`
   * or `'#{ANOTHER_QUERYS_NAME}.foo.bar'`.
   * qryq will then identify these other queries as the current query's dependents,
   * and wait for them to complete execution before beginning this one.
   * It will also substitute the correct values from the return value of the
   * dependent queries.
   *
   * @param data {Object}
   * @return {Fluent}
   */
  function input(data) {
    //TODO
    return fluent;
  }

  /**
   * depends specifies which other queries need to complete
   * execution  prior to beginning executing the current one.
   *
   * This is **optional**, as if this is not specified,
   * qryq will parse the input object for expressions.
   *
   * @param dependIds {Array<string>}
   * @return {Fluent}
   */
  function depends(dependIds) {
    //TODO
    return fluent;
  }

  /**
   * filterOutput, when called with `true`, specifies that the output of the
   * current query should be **excluded** from the final result returned.
   *
   * This is **optional**, as is this is not specified,
   * qryq simply inlcudes the results in the output by default.
   *
   * @param shouldFilter {boolean}
   * @return {Fluent}
   */
  function filterOutput(shouldFilter) {
    //TODO
    return fluent;
  }

  /**
   * allQueries specifies the entire list of queries.
   *
   * This should only be called once,
   * and other queries should not be manually specified if this is used.
   *
   * @param  {Array<GraphQuery>}
   * @return {Fluent}
   */
  function allQueries(list) {
    //TODO
    return fluent;
  }

  /**
   * run finalises the list of queries and then executes them.
   * The promise it returns will resolve the final results of the
   * dependent set of queries.
   *
   * @return {Promise}
   */
  function run() {
    var deferred = Q.defer();
    //TODO execute graph of queries using deferred and fluent.queries
    return deferred.promise;
  }

  return fluent;
}

module.exports = qryqGraph;
