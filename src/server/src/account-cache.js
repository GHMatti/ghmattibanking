const _ = require('lodash');
const Account = require('./models/account.js');

class AccountCache {
  constructor() {
    this.Accounts = [];
  }

  refreshAccounts(userCache) {
    const accounts = userCache.getAllAccounts();
    Account.Load(_.difference(accounts, this.Accounts.map(a => a.id)), (newAccounts) => {
      this.Accounts = this.Accounts.concat(newAccounts);
      const sourceArray = userCache.getSources(newAccounts.map(a => a.id));
      sourceArray.forEach((src) => {
        userCache.findUser(src).updateBank(this);
      });
    });
  }

  createAccount(accountname, bank, src, userCache) {
    const { id, name } = userCache.findUser(src);
    Account.Create(accountname, bank, id, name, (account) => {
      this.Accounts.push(account);
      userCache.findUser(src).updateAccessibleAccounts(this, () => {
        this.sendAccountsToUser(src);
      });
    });
  }

  findAccounts(idArray) {
    return this.Accounts.filter(acc => idArray.includes(acc.id));
  }

  findOwnedAccounts(id) {
    return this.Accounts.filter(acc => acc.ownerid === id);
  }

  findFromNumber(accountno) {
    return this.Accounts.find(acc => acc.accountnumber === accountno);
  }

  sendAccountsToUser(src, userCache) {
    const accountIds = userCache.findUser(src).accessibleBankAccounts;
    this.sendTheseAccountsToUser(accountIds, src);
  }

  sendTheseAccountsToUser(idArray, src) {
    const accounts = this.findAccounts(idArray);
    global.emitNet('ghmb:update-accounts', src, accounts);
  }

  getTotalBalance(idArray) {
    return this.findAccounts(idArray).map(acc => acc.balance).reduce((pv, cv) => pv + cv, 0);
  }

  getAutocompleteData() {
    return this.Accounts.map((acc) => {
      const account = {
        id: acc.id,
        accountnumber: acc.accountnumber,
        name: acc.owner,
      };
      return account;
    });
  }
}

const accountCache = new AccountCache();

module.exports = accountCache;
