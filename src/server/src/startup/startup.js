const mysql = require('../mysql/mysql.js');
const tables = require('./setup-tables.js');

module.exports.startup = () => {
  mysql.execute('select VERSION() as ver', (result) => {
    if (/(\d{1,2}).(\d{1}).(\d{1,2})-MariaDB/g.test(result[0].ver)) {
      const matches = /(\d{1,2}).(\d{1}).(\d{1,2})-MariaDB/g.exec(result[0].ver);
      if (matches[1] < 10 || matches[2] < 3 || matches[3] < 1) throw new Error('ghmattibanking only runs under MariaDB 10.3.1 and higher');
    }

    mysql.execute(tables.userTable, () => {
      mysql.execute(tables.accountTable, () => {
        mysql.execute(tables.transactionTable);
        mysql.execute(tables.accessTable);
        console.log('[ghmattibanking] started');
      });
    });
  });
};
