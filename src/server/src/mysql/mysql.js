/*
 * Copyright © 2018 Matthias Mandelartz
 * Adapted from ghmattimysql
 */
const mysql = require('mysql');
const { config } = require('../common/config.js');

const mysqlCfg = {
  user: config.mysqlUser,
  password: config.mysqlPassword,
  host: config.mysqlServer,
  port: config.mysqlPort,
  database: config.mysqlDatabase,
  dateStrings: true,
};

const pool = mysql.createPool(mysqlCfg);

function sanitizeInput(query, parameters, callback) {
  let params = parameters;
  let cb = callback;

  if (typeof parameters === 'function') {
    cb = parameters;
  }
  if (!Array.isArray(params)) {
    params = [];
  }
  return [query, params, cb];
}

function safeInvoke(callback, args) {
  if (typeof callback === 'function') {
    setImmediate(() => {
      callback(args);
    });
  }
}

function execute(sql, params, connection) {
  const orm = connection || pool;
  return new Promise((resolve, reject) => {
    // orm[(params.length) ? 'execute' : 'query'](sql, params, (error, result) => {
    orm.query(sql, params, (error, result) => {
      if (error) reject(error);
      resolve(result);
    });
  });
}

module.exports.execute = (query, parameters, callback) => {
  let sql = query;
  let params = parameters;
  let cb = callback;
  [sql, params, cb] = sanitizeInput(sql, params, cb);

  execute(sql, params).then((result) => {
    safeInvoke(cb, result);
  });
};

function onTransactionError(error, connection, callback) {
  connection.rollback(() => {
    console.error(error);
    safeInvoke(callback, false);
  });
}

module.exports.transaction = (querys, parameters, callback) => {
  let sqls = [];
  let params = parameters;
  let cb = callback;
  // start by type-checking and sorting the data
  if (!querys.every(element => typeof element === 'string')) {
    sqls = querys;
    if (typeof parameters === 'function') cb = parameters;
  } else {
    if (typeof parameters === 'function') {
      cb = parameters;
      params = [];
    }
    querys.forEach((element) => {
      sqls.push({ query: element, parameters: params });
    });
  }
  // build the actual queries
  sqls.forEach((element, index) => {
    const [stmt, stmtParams] = [element.query, element.parameters];
    sqls[index] = {
      query: stmt,
      parameters: (Array.isArray(stmtParams)) ? stmtParams : [],
    };
  });
  // the real transaction can begin
  pool.getConnection((connectionError, connection) => {
    if (connectionError) {
      console.error(connectionError);
      safeInvoke(cb, false);
      return;
    }
    connection.beginTransaction((transactionError) => {
      if (transactionError) {
        onTransactionError(transactionError, connection, callback);
        return;
      }
      const promises = [];
      // execute each query on the connection
      sqls.forEach((element) => {
        promises.push(execute(element.query, element.parameters, connection));
      });
      // If all have resolved, then commit
      Promise.all(promises).then(() => {
        connection.commit((commitError) => {
          if (commitError) {
            onTransactionError(commitError, connection, callback);
          } else safeInvoke(cb, true);
        });
        // Otherwise catch the error from the execution
      }).catch((executeError) => {
        onTransactionError(executeError, connection, callback);
      });
    });
  });
};
