'use strict';

var Q = require('q');

var constants = require('./constants');

function qryqGraph(context) {
  if (typeof context !== 'object') {
    throw new Error('Expected context');
  }
  if (typeof context.api !== 'object') {
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

  function _saveCurrentQuery() {
    if (!!currentQuery) {
      validateQuery(currentQuery);
      fluent.queries.push(currentQuery);
    }
  }

  /**
   * query begins describing a new query.
   * subsequent calls to input, depends, and filterOutput will apply to this query
   *
   * @param id {string}
   * @return {Fluent}
   */
  function query(id) {
    _saveCurrentQuery();
    currentQuery = { id: id };
    return fluent;
  }

  /**
   * api specifies the name of the API the current query should invoke
   *
   * @param name {string}
   * @return {Fluent}
   */
  function api(name) {
    currentQuery.api = name;
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
    currentQuery.input = data;
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
    currentQuery.depends = dependIds;
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
    currentQuery.filterOutput = !!shouldFilter;
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
    fluent.queries = [];
    list.forEach(function(query) {
      currentQuery = query;
      _saveCurrentQuery();
      currentQuery = undefined;
    });
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
    _saveCurrentQuery();
    var deferred = Q.defer();
    //TODO validate graph - ensure that all depends exist, and that there are no cycles
    //TODO execute graph of queries using deferred and fluent.queries
    require('./graph-run')(deferred, context.api, fluent.queries);
    return deferred.promise;
  }

  return fluent;
}

module.exports = qryqGraph;

function inferDependsFromQueryInputs(query) {
  if (!!query.depends) {
    // Skip inferring depends if it already has been set
    return;
  }
  query.depends = [];
  var inputAsString = JSON.stringify(query.input);
  var found = inputAsString.match(constants.GRAPH_DEPENDENT_INFER_REGEX);
  if (found && found.length > 0) {
    for (var idx = 0; idx < found.length; ++idx) {
      var tok = found[idx];
      var match = tok.match(constants.GRAPH_DEPENDENT_SUBSTITUTE_REGEX);
      if (match && match.length > 1) {
        var tmp = match[1];
        var subKeys = tmp.split('.');
        query.depends.push(subKeys[0]);
      }
    }
  }
}

function validateQuery(query) {
  if (typeof query !== 'object') {
    throw new Error('Query is not defined');
  }
  if (typeof query.id !== 'string') {
    throw new Error('Query needs an ID');
  }
  if (typeof query.api !== 'string') {
    throw new Error('Query needs an API ID');
  }
  if (typeof query.input !== 'object') {
    throw new Error('Query needs an input object');
  }
  inferDependsFromQueryInputs(query);
}
