const EventEmitter = require('events');
const _ = require('lodash');
const mysql = require('../mysql/mysql.js');

class User extends EventEmitter {
  constructor(id, name, license, steam, src) {
    super();
    this.id = id;
    this.name = name;
    this.license = license;
    this.steam = steam;
    this.src = src;
    this.cash = 0; // cash has to be 0, we need to select it again
    this.bank = 0;
    this.accessibleBankAccounts = [];
  }

  static Create(name, license, steam, src, cb) {
    mysql.execute('insert into ghmb_users (name, license, steam) values (?, ?, ?)',
      [name, license, steam], (result) => {
        cb(new User(result.insertId, name, license, steam, src));
      });
  }

  static Load(name, license, steam, src, cb) {
    mysql.execute('select id from ghmb_users where name = ? and license = ? and steam = ?',
      [name, license, steam], (result) => {
        if (result.length > 0) {
          cb(new User(result[0].id, name, license, steam, src));
        } else this.Create(name, license, steam, src, cb);
      });
  }

  updateAccessibleAccounts(accountCache) {
    mysql.execute('select id from ghmb_accounts where owner = ?', [this.id], (result) => {
      mysql.execute('select account from ghmb_access where user = ?', [this.id], (res) => {
        const accessibleBankAccounts = result.map(acc => acc.id);
        accessibleBankAccounts.push(0);
        res.forEach((acc) => {
          accessibleBankAccounts.push(acc.account);
        });
        if (!_.isEqual(this.accessibleBankAccounts, accessibleBankAccounts)) {
          this.accessibleBankAccounts = accessibleBankAccounts;
          this.emit('accessChanged', this.src);
          this.updateBank(accountCache);
          accountCache.sendTheseAccountsToUser(accessibleBankAccounts, this.src);
        }
      });
    });
  }

  updateBank(accountCache) {
    const balance = accountCache.getTotalBalance(this.accessibleBankAccounts);
    if (this.bank !== balance) this.emit('bankChange', this.src, balance);
    this.bank = balance;
  }

  getCash() {
    mysql.execute('select cash from ghmb_users where id = ?', [this.id], (result) => {
      if (this.cash !== result[0].cash) this.emit('cashChange', this.src, result[0].cash);
      this.cash = result[0].cash;
    });
  }

  addCash(amount, cb) {
    mysql.execute('update ghmb_users set cash=cash+? where id = ?', [amount, this.id], (result) => {
      if (result.changedRows === 1) {
        this.cash += amount;
        this.emit('cashChange', this.src, this.cash);
        if (typeof cb === 'function') cb();
      }
    });
  }

  payCash(amount, cb) {
    if (this.cash > amount) {
      mysql.execute('update ghmb_users set cash=cash-? where id = ?', [amount, this.id], (result) => {
        if (result.changedRows === 1) {
          this.cash -= amount;
          this.emit('cashChange', this.src, this.cash);
          if (typeof cb === 'function') cb(true);
        }
      });
    } else if (typeof cb === 'function') cb(false);
  }
}

module.exports = User;
