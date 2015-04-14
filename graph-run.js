'use strict';

var Q = require('q');

var constants = require('./constants');

function qryqGraphRun(deferred, api, queries) {
  try {
    validateQueries(queries);
  }
  catch (ex) {
    return deferred.reject(ex.message);
  }

  //queries are valid, so start running them
  var queryPromisesHash = {};
  var queryPromisesList = [];
  queries.forEach(function promiseForQuery(query) {
    var apiName = query.api;
    var apiFunc = api[apiName];

    if (typeof apiFunc !== 'function') {
      return deferred.reject({
        message: 'Failed to API function named: '+apiName,
      });
    }

    var queryPromise = qryqGraphQueryRun(query, apiFunc, queryPromisesHash);
    queryPromisesList.push(queryPromise);
    queryPromisesHash[query.id] = queryPromise;
  });

  // console.log('queryPromisesList.length', queryPromisesList.length);

  Q.allSettled(queryPromisesList).then(function onAllQueriesSettled(queryResults) {
    var out = {};
    // console.log('onAllQueriesSettled', 'queryResults', queryResults);
    queryResults.forEach(function(queryResult, idx) {
      // var filterOutput = queries[idx].filterOutput;
      // filterOutput =
      if (!queries[idx].filterOutput) {
        var queryId = queries[idx].id;
        if (queryResult.state === 'fulfilled') {
          out[queryId] = queryResult.value;
        }
        else {
          out[queryId] = queryResult;
        }
      }
    });
    return deferred.resolve(out);
  },
  function onAllQueriesError(err) {
    // console.log('onAllQueriesError');
    return deferred.reject(err);
  });
}

module.exports = qryqGraphRun;

function qryqGraphQueryRun(query, apiFunc, queryPromisesHash) {
  var queryDeferred = Q.defer();
  var dependsPromises = [];
  var depIds = query.depends;
  depIds.forEach(function promiseForDependentQuery(depId) {
    var dependPromise = queryPromisesHash[depId];
    dependsPromises.push(dependPromise);
  });

  // console.log('dependsPromises.length', query.id, dependsPromises.length);

  Q.allSettled(dependsPromises).then(function onAllDependentQueriesSettled(dependsResults) {
    var dependsResultsHash = {};
    dependsResults.forEach(function(depResult, idx) {
      var depId = depIds[idx];
      if (depResult.state === 'fulfilled') {
        dependsResultsHash[depId] = depResult;
      }
      else {
        dependsResultsHash[depId] = null;
      }
    });
    processGraphQueryResults(query.input, dependsResultsHash);
    apiFunc(queryDeferred, query.input);
  });

  return queryDeferred.promise;
}

function processGraphQueryResults(obj, dependsResults) {
  if (typeof obj === 'object') {
    eachArrayOrObject(obj, function(child, idx) {
      if (typeof child === 'string') {
        var found = child.match(constants.GRAPH_DEPENDENT_SUBSTITUTE_REGEX);
        if (found && found.length > 1) {
          var key = found[1]; //first regex match is always the entire string
          if (key && key.length > 0) {
            var dependResult = dependsResults[key];
            var subKeys;
            if (found.length > 1 && found[2].length > 0) {
              var subKey = found[2];
              subKeys = subKey.split('.');
            }
            else {
              subKeys = [];
            }
            var numSubKeys = subKeys.length;

            if (numSubKeys < 1) {
              if (dependResult && dependResult.value) {
                obj[idx] = dependResult.value;
              }
            }
            else {
              if (dependResult) {
                var dependSubResult = dependResult.value;
                subKeys.forEach(function(subKey, subKeyIdx) {
                  if (subKeyIdx > 0) {
                    //skip the first one
                    var useSubKey = parseInt(subKey, 10);
                    if (isNaN(useSubKey)) {
                      useSubKey = subKey;
                    }
                    dependSubResult = dependSubResult[useSubKey];
                    if (dependSubResult) {
                      if (subKeyIdx === (numSubKeys - 1)) {
                        obj[idx] = dependSubResult;
                        return;
                      }
                    }
                    else {
                      //leave as unsubstituted, and shortcut to safety
                      return;
                    }
                  }
                });
              }
            }
          }
        }
      }
      else {
        processGraphQueryResults(child, dependsResults);
      }
    });
  }
}

/**
 * Validates the set of queries as a whole,
 * assuming that individual queries are themselves already valid
 * @param queries {Array<Query>}
 * @return {undefined}
 */
function validateQueries(queries) {
  if (!queries || queries.length < 1) {
    throw new Error('Must have at least one query');
  }

  var queryIds = {};
  queries.forEach(function(query) {
    queryIds[query.id] = true;
  });

  //validate that all depends do exist
  queries.forEach(function(query) {
    query.depends.forEach(function(dependId) {
      if (!queryIds[dependId]) {
        throw new Error('Query "'+query.id+
          '" specifies a dependency on query "'+dependId+'", but that does not exist');
      }
    });
  });

  //TODO validate that there are no cycles in the dependency graph -
  // qryq only works on directed acyclic graphs
}

function eachArrayOrObject(arrOrObj, callback) {
  if (Array.isArray(arrOrObj)) {
    return arrOrObj.forEach(callback);
  }
  else if (typeof arrOrObj === 'object') {
    for (var key in arrOrObj) {
      if (arrOrObj.hasOwnProperty(key)) {
        // console.log(arrOrObj[key], key, arrOrObj);
        callback(arrOrObj[key], key, arrOrObj);
      }
    }
  }
  else {
    throw new Error('Can only iterate over arrays and objects');
  }
}
