/* global window */

/*
 * Copyright © 2018 Matthias Mandelartz
 */
const { NuiMessage, NuiCallback } = require('./common/cfx-common.js');
const Player = require('./common/player.js');
const { headingDifference, distance } = require('./common/common.js');
const banks = require('./data/banks.js');

const global = window;
const config = JSON.parse(global.LoadResourceFile('ghmattibanking', 'config.client.json'));
let isAllowed = false;
let myUserName = '';
let bankChanged = true;

const locale = JSON.parse(global.LoadResourceFile('ghmattibanking', `locale/${config.locale}.json`));
global.on('onClientResourceStart', (name) => {
  if (name === 'ghmattibanking') {
    NuiMessage({ type: 'setConfig', locale, config });
  }
});

// Default display drivers, outsource at some point
global.on('ghmb:setDisplayCash', (cash, bank) => {
  global.StatSetInt('MP0_WALLET_BALANCE', cash, true);
  global.StatSetInt('BANK_BALANCE', bank, true);
});

global.on('ghmb:toggleShowCash', (show) => {
  if (show) {
    global.N_0xc2d15bef167e27bc();
    global.SetMultiplayerBankCash();
    global.ShowHudComponentThisFrame(3);
    global.ShowHudComponentThisFrame(4);
  } else {
    global.N_0x95cf81bd06ee1887();
    global.RemoveMultiplayerHudCash();
    global.HideHudComponentThisFrame(3);
    global.HideHudComponentThisFrame(4);
  }
});

const showCashPersist = config.displayDriverCallPersistantShow;
const setDisplayCash = config.displayDriverCallFeed;

// lazily update player ped id and player id
let player = new Player();

function getPositionString() {
  const pos = player.getLocation();
  const streetHash = global.GetStreetNameAtCoord(...pos)[0];
  const streetName = global.GetStreetNameFromHashKey(streetHash);
  const areaName = global.GetLabelText(global.GetNameOfZone(...pos));
  return `${streetName} - ${areaName}`;
}

// caching server information
let [displayCash, displayBank] = [0, 0];
global.onNet('ghmb:set-cash', (cash) => {
  displayCash = cash;
  global.emit(setDisplayCash, displayCash, displayBank);
});

global.onNet('ghmb:set-bank', (bank) => {
  displayBank = bank;
  bankChanged = true;
  global.emit(setDisplayCash, displayCash, displayBank);
});

// Toggle function to open the Ui
let nui = false;
function openBankUi(bankName, isAtm) {
  nui = true;
  NuiMessage({ type: 'setLocation', string: getPositionString() });
  NuiMessage({ type: 'setBankState', bankName, isAtm });
  global.SetNuiFocus(nui, nui);
  NuiMessage({ type: 'toggleShow' });
  if (config.displayCashInBankingUI) global.emit(showCashPersist, true);
}

NuiCallback('close', () => {
  nui = false;
  global.SetNuiFocus(nui, nui);
  NuiMessage({ type: 'toggleShow' });
  if (config.displayCashInBankingUI) global.emit(showCashPersist, false);
});

// Handle Setting of Time on the Ui, if it is open.
setInterval(() => {
  if (nui) {
    const date = new Date();
    date.setDate(date.getDate() + global.GetClockDayOfWeek() - date.getDay());
    date.setHours(global.GetClockHours());
    date.setMinutes(global.GetClockMinutes());
    date.setSeconds(global.GetClockSeconds());
    NuiMessage({
      type: 'setDate',
      string: date.toISOString(),
    });
  }
}, 250);

// Set the Owner
global.onNet('ghmb:set-owner', (user) => {
  if (user) {
    NuiMessage({ type: 'setUser', user });
    isAllowed = true;
    myUserName = user;
  } else isAllowed = false;
});

// Set the account data, in fact update duplicate accounts
global.onNet('ghmb:update-transactions', (transactions) => {
  NuiMessage({ type: 'updateTransactionData', transactions });
});

// Add transactions to the accounts
global.onNet('ghmb:update-accounts', (accounts) => {
  NuiMessage({ type: 'updateAccountData', accounts });
});

// Remove account from list
global.onNet('ghmb:remove-account', (id) => {
  NuiMessage({ type: 'removeAccount', id });
});

// Request account data not too often
let hasRequestedAccountDataRecently = false;
function requestAccountData() {
  if (!hasRequestedAccountDataRecently) {
    hasRequestedAccountDataRecently = true;
    bankChanged = false;
    global.emitNet('ghmb:request-account-data', myUserName);
    setTimeout(() => { hasRequestedAccountDataRecently = false; }, 5000);
  }
}

let hasRequestedAccountAutocompleteDataRecently = false;
function requestAutocompleteData() {
  if (!hasRequestedAccountAutocompleteDataRecently) {
    hasRequestedAccountAutocompleteDataRecently = true;
    global.emitNet('ghmb:request-autocomplete-data');
    setTimeout(() => { hasRequestedAccountAutocompleteDataRecently = false; }, 300000);
  }
}

// use these atms to check if the player is near
const atms = [
  { name: 'fleeca', hash: global.GetHashKey('prop_fleeca_atm') },
  { name: 'fleeca', hash: global.GetHashKey('prop_atm_01') },
  { name: 'lombank', hash: global.GetHashKey('prop_atm_02') },
  { name: 'maze-bank', hash: global.GetHashKey('prop_atm_03') },
];
// Lazily check position
let nearestBankName = 'fleeca';
let nearestBankIsAtm = false;
let listenForContextPress = false;
setInterval(() => {
  // lazily update the player variable
  player = new Player();
  // actual nui stuff
  listenForContextPress = false;
  if (isAllowed && !nui) {
    const pos = player.getLocation();
    atms.forEach((atm) => {
      const obj = global.GetClosestObjectOfType(...pos, 0.75, atm.hash, false);
      if (obj !== 0) {
        nearestBankName = atm.name;
        nearestBankIsAtm = !config.atmsAsBanks;
        if (Math.abs(headingDifference(global.GetEntityHeading(obj), player.getHeading())) < 60) {
          listenForContextPress = true;
        }
      }
    });
    // might be better to switch this up?
    // seems to have 0 performance impact, maybe 0.01ms so leave it
    banks.fleeca.forEach((posBank) => {
      if (distance(pos, posBank) < 4.0) {
        nearestBankName = 'fleeca';
        nearestBankIsAtm = false;
        listenForContextPress = true;
      }
    });
    banks.lombank.forEach((posBank) => {
      if (distance(pos, posBank) < 4.0) {
        nearestBankName = 'lombank';
        nearestBankIsAtm = false;
        listenForContextPress = true;
      }
    });
    banks.mazebank.forEach((posBank) => {
      if (distance(pos, posBank) < 4.0) {
        nearestBankName = 'maze-bank';
        nearestBankIsAtm = false;
        listenForContextPress = true;
      }
    });
  }
}, 200);

global.setTick(() => {
  if (listenForContextPress) {
    global.BeginTextCommandDisplayHelp('STRING');
    global.AddTextComponentSubstringPlayerName('Press ~INPUT_CONTEXT~ to open the banking menu');
    global.EndTextCommandDisplayHelp(0, 0, 0, -1);
    if (global.IsControlJustReleased(0, 51)) openBankUi(nearestBankName, nearestBankIsAtm);
  }
});

global.setInterval(() => {
  if ((listenForContextPress || nui)) {
    requestAutocompleteData();
    if (bankChanged) requestAccountData();
  }
}, 300);

NuiCallback('new-account', (accountName) => {
  global.emitNet('ghmb:request-new-account', accountName, nearestBankName);
});

NuiCallback('deposit-on-account', (data) => {
  const payload = data;
  payload.purpose = `Deposited on ${getPositionString()}`;
  global.emitNet('ghmb:request-deposit', payload);
});

NuiCallback('withdraw-from-account', (data) => {
  const payload = data;
  payload.purpose = `Withdrawn on ${getPositionString()}`;
  global.emitNet('ghmb:request-withdrawal', payload);
});

NuiCallback('request-transactions', (data) => {
  global.emitNet('ghmb:request-transactions', data.id, data.limit, data.offset);
});

global.onNet('ghmb:update-autocomplete-access-data', (acAccess) => {
  const autocompleteAccessData = [];
  acAccess.forEach((el) => {
    autocompleteAccessData.push({ name: el.name, id: el.id });
  });
  NuiMessage({ type: 'setAutocompleteAccessData', data: autocompleteAccessData });
});

global.onNet('ghmb:update-autocomplete-transfer-data', (acTransfer) => {
  NuiMessage({ type: 'setAutocompleteTransferData', data: acTransfer });
});

NuiCallback('transfer-from-account', (data) => {
  global.emitNet('ghmb:request-transfer', data);
});

NuiCallback('edit-account', (data) => {
  if (data.nameIs !== data.nameRequest) {
    global.emitNet('ghmb:change-account-name', data.accountId, data.nameRequest);
  }
  data.accessRequest.forEach((el, index) => {
    if (typeof el === 'string') data.accessRequest.splice(index, 1);
  });
  const add = [];
  const remove = [];
  data.accessRequest.forEach((el) => {
    if (data.accessIs.findIndex(usr => usr.id === el.id) === -1) add.push(el);
  });
  data.accessIs.forEach((el) => {
    if (data.accessRequest.findIndex(usr => usr.id === el.id) === -1) remove.push(el);
  });
  if (add.length > 0 || remove.length > 0) {
    global.emitNet('ghmb:change-access', data.accountId, add, remove);
    setTimeout(() => {
      global.emitNet('ghmb:request-autocomplete-data');
    }, 500);
  }
});
