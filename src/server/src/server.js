/*
 * Copyright © 2018 Matthias Mandelartz
 */
const { startup } = require('./startup/startup.js');
const userCache = require('./user-cache.js');
const accountCache = require('./account-cache.js');

// let updateCache = false;
startup();

global.onNet('ghmb:request-transactions', (accountId, limit, offset) => {
  const src = global.source;
  accountCache
    .findAccounts([accountId])[0]
    .getTransactions(limit, offset, (transactions) => {
      global.emitNet('ghmb:update-transactions', src, transactions);
    });
});

// Get accounts from cache
function getAccessibleAccountsForUser(src) {
  accountCache
    .sendAccountsToUser(src, userCache);
}

global.onNet('ghmb:request-account-data', (username) => {
  const src = global.source;
  getAccessibleAccountsForUser(src, username);
});

// sign in, migrate to use source
global.exports('signIn', (src, username) => {
  // needs to switch users, if src is already in cache
  userCache.add(username, src);
  global.emitNet('ghmb:set-owner', src, username);
});

global.on('playerDropped', () => {
  const src = global.source;
  userCache.remove(src);
});

global.onNet('ghmb:request-new-account', (accountname, bankname) => {
  const src = global.source;
  accountCache
    .createAccount(accountname, bankname, src, userCache);
});

global.onNet('ghmb:request-deposit', (payload) => {
  const src = global.source;
  accountCache
    .findAccounts([payload.account])[0]
    .deposit(payload.amount, payload.purpose, src, userCache);
});

global.onNet('ghmb:request-withdrawal', (payload) => {
  const src = global.source;
  accountCache
    .findAccounts([payload.account])[0]
    .withdraw(payload.amount, payload.purpose, src, userCache);
});

global.onNet('ghmb:request-autocomplete-data', () => {
  const src = global.source;
  const { id } = userCache.findUser(src);
  const allUsers = userCache.getAllUsers();
  const acUsers = allUsers.filter(usr => usr.id === id);
  global.emitNet('ghmb:update-autocomplete-access-data', src, acUsers);
  global.emitNet('ghmb:update-autocomplete-transfer-data', src,
    accountCache.getAutocompleteData());
});

global.exports('pay', (src, amount, callback, recipient, purpose) => {
  const accPay = new Promise((resolve) => {
    if (typeof recipient === 'string' && typeof purpose === 'string' && amount > 0) {
      const { accessibleBankAccounts } = userCache.findUser(src);

      let paid = false;
      const accounts = accountCache.findAccounts(accessibleBankAccounts);

      const reduce = accounts.reduce((p, _, i) => p.then(() => new Promise((res) => {
        if (!paid) {
          accounts[i].pay(amount, purpose, recipient, userCache, false, (success) => {
            paid = success;
            res(paid);
          });
        } else res(paid);
      })), Promise.resolve());

      reduce.then((wasPaid) => {
        resolve(wasPaid);
      });
      // else pass false
    } else resolve(false);
  });
  accPay.then((paid) => {
    if (!paid && amount > 0) {
      userCache.findUser(src).payCash(amount, (success) => {
        callback(success);
      });
    } else callback(paid);
  });
});

global.exports('fine', (src, amount, recipient, purpose, callback) => {
  const { id, cash } = userCache.findUser(src);
  const accounts = accountCache.findOwnedAccounts(id);
  // find account
  let maxIndex = 0;
  let maxValue = (accounts.length > 0) ? accounts[0].balance : 0;
  accounts.forEach((acc, idx) => {
    if (acc.balance > maxValue) {
      maxIndex = idx;
      maxValue = acc.balance;
    }
  });
  if (maxValue > 0) { // just fine account
    accounts[maxIndex].pay(amount, purpose, recipient, userCache, true);
    if (typeof callback === 'function') callback(0);
  } else { // remove cash first
    const remainingAmount = amount - cash;
    const payAmount = (cash - amount > 0) ? cash - amount : cash;
    userCache.findUser(src).payCash(payAmount);
    if (accounts.length > 0 && remainingAmount > 0) {
      accounts[maxIndex].pay(remainingAmount, purpose, recipient, userCache, true);
      if (typeof callback === 'function') callback(0);
    } else if (typeof callback === 'function') callback(remainingAmount);
  }
});

global.exports('reward', (src, amount, from, purpose) => {
  const accReward = new Promise((resolve) => {
    if (typeof from === 'string' && typeof purpose === 'string' && amount > 0) {
      const { id } = userCache.findUser(src);
      const accounts = accountCache.findOwnedAccounts(id);
      if (accounts.length > 0) {
        accounts[0].addBalance(amount, purpose, from, userCache, (res) => {
          resolve(res);
        });
      } else resolve(false);
    } else resolve(false);
  });
  accReward.then((rewarded) => {
    if (!rewarded && amount > 0) {
      userCache.findUser(src).addCash(amount);
    }
  });
});

global.onNet('ghmb:request-transfer', (payload) => {
  const src = global.source;
  const destination = (typeof payload.to === 'string') ? payload.to : payload.to.accountnumber;
  accountCache
    .findAccounts([payload.from])[0]
    .transfer(payload.amount, destination, payload.purpose, src, userCache, accountCache);
});

global.onNet('ghmb:change-account-name', (accId, accName) => {
  const src = global.source;
  const { id } = userCache.findUser(src);
  accountCache
    .findAccounts([accId])[0]
    .updateAccountName(accName, id, src, userCache, accountCache);
});

global.onNet('ghmb:change-access', (accId, addAccess, removeAccess) => {
  const src = global.source;
  accountCache
    .findAccounts([accId])[0]
    .changeAccess(addAccess, removeAccess, src, userCache, accountCache);
});

// only for testing purposes
/* global.RegisterCommand('signin', (src) => {
  global.exports.ghmattibanking.signIn(src, global.GetPlayerName(src));
}, false);

global.RegisterCommand('rewardCash', (src) => {
  global.exports.ghmattibanking.reward(src, 20000);
}, false);

global.RegisterCommand('rewardBank', (src) => {
  global.exports.ghmattibanking.reward(src, 20000, 'Ron Oil', 'Fuel Delivery');
}, false);

global.RegisterCommand('payTest', (src) => {
  global.exports.ghmattibanking.pay(src, 1500, (res) => {
    console.log(`Shopping successful: ${res}`);
  }, 'Ponsonbys', 'Shopping');
}, false);

global.RegisterCommand('fineTest', (src) => {
  global.exports.ghmattibanking.fine(src, 30000, 'LSPD', 'Traffic Ticket', (res) => {
    console.log(`Fine successful: ${res}`);
  });
}, false); /* */
