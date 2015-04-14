'use strict';

module.exports = {
  //TODO make this a non-greedy regex
// GRAPH_DEPENDENT_SUBSTITUTE_REGEX: /^#{(.*)}(.*)$/ ,
  GRAPH_DEPENDENT_SUBSTITUTE_REGEX: /^#{([^\{\}]*)}(.*)$/ ,
  GRAPH_DEPENDENT_INFER_REGEX: /#\{[^\{\}]*\}/g ,
};
