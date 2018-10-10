const _ = require('lodash');
const accountCache = require('./account-cache.js');
const { getPlayerIdentifiers } = require('./common/cfx-common.js');
const User = require('./models/user.js');

class UserCache {
  constructor() {
    this.Users = [];
  }

  add(username, src) {
    const idents = getPlayerIdentifiers(src);
    User.Load(username, idents.license, idents.steam, src, (user) => {
      user.on('cashChange', (s, cash) => {
        global.emitNet('ghmb:set-cash', s, cash);
      });
      user.on('bankChange', (s, bank) => {
        global.emitNet('ghmb:set-bank', s, bank);
      });
      user.on('accessChanged', () => {
        accountCache.refreshAccounts(this);
      });
      user.updateAccessibleAccounts(accountCache);
      user.getCash();
      this.Users.push(user);
    });
  }

  remove(src) {
    this.Users = this.Users.filter(user => user.src !== src);
  }

  findUser(src) {
    return this.Users.find(user => user.src === src);
  }

  getAllAccounts() {
    return _.union(...this.Users.map(user => user.accessibleBankAccounts));
  }

  getSources(accountIdArray) {
    const users = this.Users.filter(
      user => _.intersection(accountIdArray, user.accessibleBankAccounts).length > 0,
    );
    return users.map(user => user.src);
  }

  updateBankAllUsers(accountId) {
    this.Users.forEach((user) => {
      if (user.accessibleBankAccounts.includes(accountId)) user.updateBank(accountCache);
    });
  }

  getAllUsers() {
    return this.Users.map((user) => {
      const usr = { id: user.id, name: user.name };
      return usr;
    });
  }

  getUserById(id) {
    return this.Users.find(user => user.id === id);
  }
}

const userCache = new UserCache();

module.exports = userCache;
