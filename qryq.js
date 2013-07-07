var Q = require('q');
var _ = require('underscore');

var async = function(fn, qry) {
  var deferred = Q.defer();
  fn(deferred, qry);
  return deferred.promise;
};

var validateQueue = function(qry, options) {
  var needsDepends = options && !!(options.needsDepends);
  var errs = [];
  if (!(qry && _.isArray(qry) && qry.length > 0)) {
    errs.push('Query should be an array with at least one element');
  }
  else {
    _.each(qry, function(line, idx) {
      if (!(line && _.isObject(line))) {
        errs.push('Line #'+idx+' should be an object');
      }
      else {
        if (!(line.id && line.api && line.qry)) {
          errs.push('Line #'+idx+' should have an id, an api, and a qry');
        }
        if (needsDepends) {
          if (!(line.depends && _.isArray(line.depends))) {
            errs.push('Line #'+idx+' should have an a depends that is an array (may be empty).');
          }
        }
      }
    });
  }
  return errs;
}

exports.parallel = function(deferred, qry, api) {
  var validateErrs = validateQueue(qry);
  if (validateErrs.length > 0) {
    deferred.reject({
      msg: 'Invalid qryq parallel query',
      errors: validateErrs
    });
    return;
  }
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
};

//TODO make this a non-greedy regex
var dependentSubstituteRe = /^#{(.*)}(.*)$/ ;
var dependentLineResults = function(obj, dependsResults) {
  if (_.isArray(obj) || _.isObject(obj)) {
    _.each(obj, function(child, idx) {
      if (_.isString(child)) {
        var found = child.match(dependentSubstituteRe);
        if (found && found.length > 1) {
          var key = found[1]; //first regex match is always the entire string
          if (key && key.length > 0) {
            var dependResult = dependsResults[key];
            if (!dependResult && key === 'previous') {
              dependResult = dependsResults[dependsResults.length];
            }
            var subKeys = [];
            if (found.length > 1) {
              var subKey = found[2];
              subKeys = subKey.split('.');
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
                _.each(subKeys, function(subKey, subKeyIdx) {
                  if (subKeyIdx > 0) {
                    //skip the first one
                    var useSubKey = parseInt(subKey, 10);
                    if (_.isNaN(useSubKey)) {
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
                      //obj[idx] = null;
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
        dependentLineResults(child, dependsResults);
      }
    });
  }
};

var sequentialLine = function(deferred, qry, api, idx, out, dependsResults) {
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
    function(result) {
      var decoratedResult = {
        status: 'fulfilled',
        value: result
      };
      out.push(decoratedResult);
      dependsResults[line.id] = decoratedResult;
      if (idx < numApiCalls - 1) {
        dependentLineResults(line.qry, dependsResultsHash);
        sequentialLine(deferred, qry, api, idx + 1, out, dependsResults);
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
};

exports.sequential = function(deferred, qry, api) {
  var validateErrs = validateQueue(qry);
  if (validateErrs.length > 0) {
    deferred.reject({
      msg: 'Invalid qryq sequential query',
      errors: validateErrs
    });
    return;
  }
  var numApiCalls = qry.length;
  //TODO find a more efficient way than to keep two parallel data structures
  var out = [];
  var dependsResults = {};
  sequentialLine(deferred, qry, api, 0, out, dependsResults);
};

var dependentLine = function(line, apiFunc, linePromisesHash) {
  var lineDeferred = Q.defer();
  var dependsPromises = [];
  var depIds = line.depends;
  _.each(depIds, function(depId) {
    var dependPromise = linePromisesHash[depId];
    dependsPromises.push(dependPromise);
  });
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
    dependentLineResults(line.qry, dependsResultsHash);
    apiFunc(lineDeferred, line.qry);
  });
  return lineDeferred.promise;
};

exports.dependent = function(deferred, qry, api) {
  var validateErrs = validateQueue(qry, {needsDepends: true});
  if (validateErrs.length > 0) {
    deferred.reject({
      msg: 'Invalid qryq dependent query',
      errors: validateErrs
    });
    return;
  }
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
};
