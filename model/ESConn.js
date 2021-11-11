// https://github.com/elastic/elasticsearch-js

const cron = require('node-cron');
const promise = require('promise');
const elasticsearch = require('elasticsearch');


const conf = require('../utils/conf.js');
// const code = require('../utils/code.js');
const log = require('../utils/logger.js');

var dbConnected = false;


function connect() {
    const client = new elasticsearch.Client({
        host: conf.es_addr,
        requestTimeout: conf.es_request_timeout,
        log: [{
            type: 'stdio',
            levels: ['error', 'warning']
        }]
    });
    global.client = client;
    dbConnected = true;
}

function isConnected() {
    client.ping({
        // ping usually has a 3000ms timeout
        requestTimeout: conf.es_ping_timeout
    }, function (error) {
        if (error) {
            log.logError('ESConn', 'Not connected to ElasticSearch');
            return false;
        } else {
            return true;
        }
    });
}

function checkConnectionInterval() {
    cron.schedule('*/' + conf.es_check_conn_interval + ' * * * * *', function () {
        client.ping({
            // ping usually has a 3000ms timeout
            requestTimeout: conf.es_ping_timeout
        }, function (error) {
            if (error) {
                if (dbConnected) {
                    log.logError('ESConn', 'connection down...');
                    dbConnected = false;
                }
            } else {
                if (!dbConnected) {
                    log.log('ESConn', 'connection up...');
                    dbConnected = true;
                }
            }
        });
    });
}

// function indexExist(index) {
//     return new promise((resolve, reject) => {
//         client.indices.exists({
//             index: index,
//         }, function(error, result) {
//             if (error) {
//                 log.logError('indexExist', error);
//                 reject('error occur when querying database');
//             }
//             resolve(result);
//         }, function(err) {
//             log.logError('indexExist', err.message);
//             reject(err.message);
//         });
//     });
// }

/**
 *  search using Lucene syntax
 * 
 *  https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-scroll
 *  ElasticSearch have limit of default max size 10 when querying 
 *  no option to set for unlimited size 
 *  using "scroll" search to query more records
 *  *maximum size is 10000 (not confirmed)
 */
function search(index, type, query) {
    return new promise((resolve, reject) => {
        var records = [];
        client.search({
            index: index,
            type: type,
            body: query,
            scroll: '1m',
            size: 10000,
            ignoreUnavailable: true,
        }, function scrollSearch(error, result) {
            if (error) {
                // console.log(error);
                log.logError('search', JSON.stringify(error));
                reject(error.message);
            } else {
                result.hits.hits.forEach(function (hit) {
                    records.push(hit._source);
                });
                log.log('search scroll result current:' + result.hits.hits.length + ' accumulate:' + records.length + ' total:' + result.hits.total + ' scrollID:' + result._scroll_id);

                if (result.hits.total > records.length) {
                    client.scroll({
                        scroll: '1m',
                        scrollId: result._scroll_id,
                    }, scrollSearch);
                } else {
                    client.clearScroll(result._scroll_id, function (error, result) {
                        resolve(records);
                    })
                }
            }
        }, function (err) {
            // console.log(err.message);
            log.logError('search', err.message);
            reject(err.message);
        });
    });
}

function searchScroll(index, type, query, scroll_alive, scroll_size, scroll_callback, scroll_accumulate, tid, tag) {

   
    return new promise((resolve, reject) => {
        var accumulate = [];
        let accumulateLength = 0
        client.search({
            index: index,
            type: type,
            body: query,
            scroll: scroll_alive,
            size: scroll_size,
            ignoreUnavailable: true,
        }, async function scrollSearch(error, result) {
            if (error) {
                // console.log(error); 
                log.logError(tid, tag, 'scroll search error ' + error.stack || JSON.stringify(error));
                reject(error);
            } else {
                if(result && result.responses && result.responses[0] && result.responses[0] && result.responses[0].error) {
                    resolve(result)
                    return
                }

                if (scroll_callback && typeof scroll_callback === "function") {
                    await scroll_callback(result);
                }

                if(scroll_accumulate) {
                    result.hits.hits.forEach(function (hit) {
                        accumulate.push(hit._source);
                    });
                    accumulateLength = accumulate.length
                } else {
                    accumulateLength += result.hits.hits.length
                }
                log.log(tid, tag, 'scroll search current:' + result.hits.hits.length + ' accumulate:' + accumulateLength + ' total:' + result.hits.total.value + ' scrollID:' + result._scroll_id);

                if (accumulateLength < result.hits.total.value) {
                    client.scroll({
                        scroll: scroll_alive,
                        scrollId: result._scroll_id,
                    }, scrollSearch);
                } else {
                    client.clearScroll(result._scroll_id, function (error, result) {
                        resolve(accumulate);
                    })
                }
            }
        }, function (err) {
            // console.log(err.message);
            log.logError('search scroll', err.message);
            reject(err.message);
        });
    });
}

/**
 *  search using ElasticSearch DSL
 * 
 *  https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-scroll
 *  ElasticSearch have limit of default max size 10 when querying 
 *  no option to set for unlimited size 
 *  using "scroll" search to query more records
 *  *maximum size is 10000 (not confirmed)
 */
function searchQuery(index, type, query) {
    return new promise((resolve, reject) => {
        var records = [];
        client.search({
            index: index,
            body: query,
            scroll: '5m',
            size: 10000,
            ignoreUnavailable: true,
        }, function scrollSearch(error, result) {
            if (error) {
                console.log(error);
                log.logError('searchQuery', JSON.stringify(error));
                reject(error);
            } else {
                var overLimit = false; // check if records queried is more than limit set at configuration
                if (result.hits.total > conf.es_records_limit) {
                    overLimit = true;
                }
                result.hits.hits.forEach(function (hit) {
                    records.push(hit._source);
                });
                if (result.hits.total > records.length) {
                    client.scroll({
                        scroll: '5m',
                        scrollId: result._scroll_id,
                    }, scrollSearch);
                } else {
                    client.clearScroll(result._scroll_id, function (error, result) {
                        resolve({
                            records: records,
                            overLimit: overLimit,
                        });
                    })
                }
            }
        }, function (err) {
            console.log(err);
            log.logError('searchQuery', err.message);
            reject(err.message);
        });
    });
}

/**
 *  maximum From + Size must not exceed 10000
 *  if selecting more that 10000 records, use Scroll
 *  https://www.elastic.co/guide/en/elasticsearch/reference/current/search-request-from-size.html
 */
function searchQueryLimit(index, type, query) {
    return new promise((resolve, reject) => {
        var records = [];
        client.search({
            index: index,
            body: query,
            scroll: '1m',
            from: 0,
            size: conf.es_records_limit,
            ignoreUnavailable: true,
        }, function scrollSearch(error, result) {
            if (error) {
                console.log(error);
                log.logError('searchQueryLimit', JSON.stringify(error));
                reject(error);
            } else {
                var overLimit = false; // check if records queried is more than limit set at configuration
                if (result.hits.total > conf.es_records_limit) {
                    overLimit = true;
                }
                result.hits.hits.forEach(function (hit) {
                    records.push(hit._source);
                });
                resolve({
                    records: records,
                    overLimit: overLimit,
                });
            }
        }, function (err) {
            console.log(err);
            log.logError('searchQueryLimit', err.message);
            reject(err.message);
        });
    });
}

/**
 *  return full JSON as queried from ElasticSearch
 * 
 *  https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-scroll
 *  ElasticSearch have limit of default max size 10 when querying 
 *  no option to set for unlimited size 
 *  using "scroll" search to query more records
 *  *maximum size is 10000 (not confirmed)
 */
function searchQueryFull(index, type, query) {
    return new promise((resolve, reject) => {
        var records = [];
        client.search({
            index: index,
            body: query,
            scroll: '1m',
            size: 10000,
            ignoreUnavailable: true,
        }, function scrollSearch(error, result) {
            if (error) {
                console.log(error);
                log.logError('searchQueryFull', JSON.stringify(error));
                reject(error);
            } else {
                var overLimit = false; // check if records queried is more than limit set at configuration
                if (result.hits.total > conf.es_records_limit) {
                    overLimit = true;
                }
                result.hits.hits.forEach(function (hit) {
                    records.push(hit);
                });
                if (result.hits.total > records.length) {
                    client.scroll({
                        scroll: '1m',
                        scrollId: result._scroll_id,
                    }, scrollSearch);
                } else {
                    client.clearScroll(result._scroll_id, function (error, result) {
                        resolve({
                            records: records,
                            overLimit: overLimit,
                        });
                    })
                }
            }
        }, function (err) {
            console.log(err);
            log.logError('searchQueryFull', err.message);
            reject(err.message);
        });
    });
}

/**
 *  return only selected fields
 * 
 *  https://www.elastic.co/guide/en/elasticsearch/client/javascript-api/current/api-reference.html#api-scroll
 *  ElasticSearch have limit of default max size 10 when querying 
 *  no option to set for unlimited size 
 *  using "scroll" search to query more records
 *  *maximum size is 10000 (not confirmed)
 */
function searchQueryFields(index, type, query, fields) {
    return new promise((resolve, reject) => {
        var records = [];
        client.search({
            index: index,
            body: query,
            _source: fields,
            scroll: '5m',
            size: 10000,
            ignoreUnavailable: true,
        }, function scrollSearch(error, result) {
            if (error) {
                console.log(error);
                log.logError('searchQueryFields', JSON.stringify(error));
                reject(error);
            } else {
                var overLimit = false; // check if records queried is more than limit set at configuration
                if (result.hits.total > conf.es_records_limit) {
                    overLimit = true;
                }
                result.hits.hits.forEach(function (hit) {
                    records.push(hit._source);
                });
                if (result.hits.total > records.length) {
                    client.scroll({
                        scroll: '5m',
                        scrollId: result._scroll_id,
                    }, scrollSearch);
                } else {
                    client.clearScroll(result._scroll_id, function (error, result) {
                        resolve({
                            records: records,
                            overLimit: overLimit,
                        });
                    })
                }
            }
        }, function (err) {
            console.log(err);
            log.logError('searchQueryFields', err.message);
            reject(err.message);
        });
    });
}

/**
 *  search without documents returned (size: 0)
 */
function searchWithoutHits(index, query) {
    return new promise((resolve, reject) => {
        var records = [];
        client.search({
            index: index,
            body: query,
            size: 0,
            ignoreUnavailable: true,
        }, function (error, result) {
            if (error) {
                console.log(error);
                log.logError('searchWithoutHits', JSON.stringify(error));
                reject(error);
            } else {
                resolve(result);
            }
        }, function (err) {
            console.log(err);
            log.logError('searchWithoutHits', err.message);
            reject(err.message);
        });
    });
}

function msearch(body) {
    return new promise((resolve, reject) => {
        client.msearch({
            body: body,
        }, function (error, result) {
            if (error) {
                log.logError('count', error);
                reject('error occur when querying database');
            }
            resolve(result);
        }, function (err) {
            log.logError('msearch', err.message);
            reject(err.message);
        });
    });
}

// function count(index) {
//     return new promise((resolve, reject) => {
//         client.count({
//             index: index,
//             ignoreUnavailable: true,
//         }, function(error, result) {
//             if (error) {
//                 log.logError('count', error);
//                 reject('error occur when querying database');
//             }
//             resolve(result);
//         }, function(err) {
//             log.logError('count', err.message);
//             reject(err.message);
//         });
//     });
// }

/**
 *  count using Lucene syntax 
 */
// function countLucene(index, query) {
//     return new promise((resolve, reject) => {
//         client.count({
//             index: index,
//             q: query,
//             ignoreUnavailable: true,
//         }, function(error, result) {
//             if (error) {
//                 log.logError('countLucene', error);
//                 reject('error occur when querying database');
//             }
//             resolve(result);
//         }, function(err) {
//             log.logError('countLucene', err.message);
//             reject(err.message);
//         });
//     });
// }

/**
 *  count using ElasticSearch DSL
 */
// function countDSL(index, query) {
//     return new promise((resolve, reject) => {
//         client.count({
//             index: index,
//             body: query,
//             ignoreUnavailable: true,
//         }, function(error, result) {
//             if (error) {
//                 log.logError('countDSL', error);
//                 reject('error occur when querying database');
//             }
//             resolve(result);
//         }, function(err) {
//             log.logError('countDSL', err.message);
//             reject(err.message);
//         });
//     });
// }

// function topCalledCalling(index, type, query) {
//     return new promise((resolve, reject) => {
//         client.search({
//             index: index,
//             type: type,
//             body: query,
//             ignoreUnavailable: true,
//         }, function(error, result) {
//             if (error) {
//                 log.logError('distinct', error);
//                 reject('error occur when querying database');
//             }
//             resolve(result);
//         }, function(err) {
//             log.logError('distinct', err.message);
//             reject(err.message);
//         });
//     });
// }

module.exports = {
    connect,
    isConnected,
    checkConnectionInterval,
    // indexExist,
    search,
    searchScroll,
    searchQuery,
    searchQueryLimit,
    searchQueryFull,
    searchQueryFields,
    searchWithoutHits,
    msearch,
    // count,
    // countLucene,
    // countDSL,
    // topCalledCalling,
}