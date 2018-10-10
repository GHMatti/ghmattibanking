const _ = require('lodash');
const mysql = require('../mysql/mysql.js');
const { config } = require('../common/config.js');

function bankToNumber(string) {
  let result = '';
  for (let i = 0; i < 4; i += 1) {
    result += string.charCodeAt(i).toString().slice(-1);
  }
  return result;
}

const base = (new Date(2018, 0, 1)).getTime();
const eol = (new Date(2025, 0, 1)).getTime();
function generateAccountNo(bankname) {
  const n = (999999999999 * (Date.now() - base) / eol).toFixed(0).toString();
  const pad = '0'.repeat(12 - n.length); // pad start does not seem to work
  return `${bankToNumber(bankname)}${pad}${n}`;
}


class Account {
  constructor(id, name, number, bank, balance, owner, ownerid) {
    this.id = id;
    this.accountname = name;
    this.accountnumber = number;
    this.bank = bank;
    this.balance = balance;
    this.owner = owner;
    this.ownerid = ownerid;
    this.access = [];
    this.getAccess();
  }

  static Create(name, bank, userId, username, cb) {
    const number = generateAccountNo(bank);
    mysql.execute('select count(*) as count from ghmb_accounts where owner = ?', [userId], (res) => {
      // enforce account limit
      if (res[0].count < config.maxNumberOfAccounts) {
        mysql.execute('insert into ghmb_accounts (accountname, accountnumber, bank, owner) values (?, ?, ?, ?)',
          [name, number, bank, userId], (result) => {
            cb(new Account(result.insertId, name, number, bank, 0, username, userId));
          });
      }
    });
  }

  // need to include owner name
  static Load(idArray, cb) {
    mysql.execute(`select acc.*, usr.name as ownername from ghmb_accounts acc
      inner join ghmb_users usr on acc.owner = usr.id
      where acc.id in (${idArray.join()})`, [], (result) => {
      const accounts = [];
      result.forEach((acc) => {
        accounts.push(
          new Account(acc.id, acc.accountname, acc.accountnumber, acc.bank,
            acc.balance, acc.ownername, acc.owner),
        );
      });
      cb(accounts);
    });
  }

  getAccess(cb) {
    mysql.execute(`select usr.id, usr.name from ghmb_access axs
      inner join ghmb_users usr on axs.user = usr.id
      where axs.account = ?`, [this.id],
    (result) => {
      this.access = result;
      if (typeof cb === 'function') cb(result);
    });
  }

  getBalance(cb) {
    mysql.execute('select balance from ghmb_accounts where id = ?', [this.id], (result) => {
      this.balance = result[0].balance;
      if (typeof cb === 'function') cb(this.balance);
    });
  }

  changeAccess(add, remove, src, userCache, accountCache) {
    const { id } = userCache.findUser(src);
    if (this.ownerid === id) {
      const deletePromise = new Promise((resolve) => {
        if (remove.length > 0) {
          mysql.execute('delete from ghmb_access where account = ? and user in (?)',
            [this.id, remove.map(a => a.id).join()], () => {
              resolve();
            });
        } else resolve();
      });
      const addPromise = new Promise((resolve) => {
        if (add.length > 0) {
          const placeholder = ',(?,?)'.repeat(add.length).substring(1);
          mysql.execute(`insert into ghmb_access (account, user) values ${placeholder}`,
            ...add.map(a => [this.id, a.id]), () => { resolve(); });
        } else resolve();
      });
      Promise.all([addPromise, deletePromise])
        .then(() => {
          this.getAccess(() => {
            accountCache.sendAccountsToUser(src, userCache);
            const userIds = _.union(add.map(a => a.id), remove.map(a => a.id));
            userIds.forEach((uid) => {
              const user = userCache.getUserById(uid);
              if (user) user.updateAccessibleAccounts(accountCache);
            });
          }); // update this accounts access
        });
    }
  }

  updateAccountName(accName, ownerid, src, userCache, accountCache) {
    if (ownerid === this.ownerid) {
      mysql.execute(`update ghmb_accounts acc
        set accountname = ? where id = ?`,
      [accName, this.id], (result) => {
        if (result.changedRows === 1) {
          this.accountname = accName;
          accountCache.sendAccountsToUser(src, userCache);
        }
      });
    }
  }

  addBalance(amount, purpose, from, userCache, cb) {
    mysql.transaction([
      {
        query: `update ghmb_accounts set balance=balance+?
          where id = ?`,
        parameters: [amount, this.id],
      },
      {
        query: `insert into ghmb_transactions (amount, account, purpose, origin, origin_type)
        values (?, ?, ?, ?, ?)`,
        parameters: [amount, this.id, purpose, from, 'reward'],
      },
    ], (result) => {
      if (result) {
        this.getBalance(() => {
          userCache.updateBankAllUsers(this.id);
          if (typeof cb === 'function') cb(true);
        });
      } else if (typeof cb === 'function') cb(false);
    });
  }

  pay(amount, purpose, recipient, userCache, cb) {
    if (this.balance > amount + config.overdrawLimit) {
      mysql.transaction([
        {
          query: `update ghmb_accounts set balance=balance-?
            where id = ?`,
          parameters: [amount, this.id],
        },
        {
          query: `insert into ghmb_transactions (amount, account, purpose, origin, origin_type)
          values (?, ?, ?, ?, ?)`,
          parameters: [-amount, this.id, purpose, recipient, 'reward'],
        },
      ], (result) => {
        if (result) {
          this.getBalance(() => {
            userCache.updateBankAllUsers(this.id);
            if (typeof cb === 'function') cb(true);
          });
        } else if (typeof cb === 'function') cb(false);
      });
    } else if (typeof cb === 'function') cb(false);
  }

  withdraw(amount, purpose, src, userCache) {
    const thisUser = userCache.findUser(src);
    const { license, steam, name } = thisUser;
    mysql.transaction([
      {
        query: 'update ghmb_users set cash=cash+? where name = ? and license = ? and steam = ?',
        parameters: [amount, name, license, steam],
      },
      { // join with ghmb_user_cache and ghmb_account_cache to check if the user has access
        query: 'update ghmb_accounts set balance=if(balance-? >= ?, balance-?, \'No\') where id = ?',
        parameters: [amount, config.overdrawLimit, amount, this.id],
      },
      {
        query: 'insert into ghmb_transactions (amount, account, purpose, origin, origin_type) values (?, ?, ?, ?, ?)',
        parameters: [-amount, this.id, purpose, name, 'user'],
      },
    ], (outcome) => {
      if (outcome) {
        this.getBalance(() => {
          userCache.updateBankAllUsers(this.id);
          thisUser.getCash();
        });
      }
    });
  }

  deposit(amount, purpose, src, userCache) {
    const thisUser = userCache.findUser(src);
    const { license, steam, name } = thisUser;
    mysql.transaction([
      {
        query: 'update ghmb_users set cash=cash-? where name = ? and license = ? and steam = ?',
        parameters: [amount, name, license, steam],
      },
      {
        query: 'update ghmb_accounts set balance=balance+? where id = ?',
        parameters: [amount, this.id],
      },
      {
        query: 'insert into ghmb_transactions (amount, account, purpose, origin, origin_type) values (?, ?, ?, ?, ?)',
        parameters: [amount, this.id, purpose, name, 'user'],
      },
    ], (outcome) => {
      if (outcome) {
        this.getBalance(() => {
          userCache.updateBankAllUsers(this.id);
          thisUser.getCash();
        });
      }
    });
  }

  transfer(amount, to, purpose, src, userCache, accountCache) {
    const thisUser = userCache.findUser(src);
    const { name } = thisUser;
    mysql.transaction([
      {
        query: 'update ghmb_accounts set balance=if(balance-? >= ?, balance-?, \'No\') where id = ?',
        parameters: [amount, config.overdrawLimit, amount, this.id],
      },
      {
        query: 'update ghmb_accounts set balance=balance+? where accountnumber = ?',
        parameters: [amount, to],
      },
      {
        query: `insert into ghmb_transactions (amount, account, purpose, origin, origin_type)
          select ? as amount, id as account, ? as purpose, ? as origin, ? as origin_type from ghmb_accounts
          where accountnumber = ? limit 1`,
        parameters: [amount, purpose, name, 'user', to],
      },
      { // add in here the name of the target instead of the user
        query: `insert into ghmb_transactions (amount, account, purpose, origin, origin_type)
          select ? as amount, ? as account, ? as purpose, usr.name as origin, ? as origin_type from ghmb_accounts acc
          inner join ghmb_users usr on usr.id = acc.owner
          where acc.accountnumber = ?`,
        parameters: [-amount, this.id, purpose, 'user', to],
      },
    ], (success) => {
      if (success) {
        this.getBalance(() => {
          userCache.updateBankAllUsers(this.id);
        });
        const targetAccount = accountCache.findFromNumber(to);
        targetAccount.getBalance(() => {
          userCache.updateBankAllUsers(targetAccount.id);
        });
      }
    });
  }

  getTransactions(limit, offset, cb) {
    mysql.execute(`select * from
    (select * from ghmb_transactions
      where account = ?
      order by id desc
      limit ? offset ?) trans
    order by id asc`,
    [this.id, limit, offset], (result) => {
      cb(result);
    });
  }
}

module.exports = Account;
