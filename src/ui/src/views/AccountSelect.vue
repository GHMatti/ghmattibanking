<template>
<v-card-text>
  <v-layout row wrap>
  <v-flex xs6 pa-2>
    <v-card class="elevation-4">
      <v-flex xs12 text-xs-center py-3>
        <v-btn :class="bankName" @click="setDisplay('account-mainmenu')"
          :disabled="accounts.length < 1">{{ localize('selectaccount') }}</v-btn>
      </v-flex>
      <v-flex xs12 text-xs-center py-3>
        <v-menu offset-y>
          <v-btn :class="bankName" slot="activator"
            :disabled="accounts.length < 2">{{ localize('changeaccount') }}</v-btn>
          <v-list dense>
          <v-list-tile v-for="(account, index) in accounts" :key="index"
            @click="changeAccount(index)" :class="bankName">
            <v-list-tile-content :class="bankName">{{ account.accountname }}</v-list-tile-content>
          </v-list-tile>
        </v-list>
        </v-menu>
      </v-flex>
      <v-flex xs12 text-xs-center py-3>
        <v-btn :class="bankName" @click="openEditAccount"
          :disabled="isAtm || bankName != caBank || accounts.length < 1 || user != caOwner">{{ localize('editaccount') }}</v-btn>
      </v-flex>
      <v-flex xs12 text-xs-center py-3>
        <v-btn :class="bankName" @click="newAccountDialog = true"
          :disabled="isAtm || ownedAccounts >= config.maxNumberOfAccounts">{{ localize('newaccount') }}</v-btn>
      </v-flex>
      <v-flex xs12 text-xs-center py-3>
        <v-btn :class="bankName" @click="closeApp">{{ localize('exitapp') }}</v-btn>
      </v-flex>
    </v-card>
  </v-flex>
  <v-flex xs6 pa-2>
    <bank-information></bank-information>
  </v-flex>
  </v-layout>

  <v-dialog v-model="newAccountDialog" persistent max-width="600">
    <v-card class="elevation-12">
      <v-card-title :class="bankName">{{ localize('newaccount') }}</v-card-title>
      <v-card-text class="px-5 py-4"><v-form v-model="validNewAccount">
        <v-text-field :class="bankName" :rules="newAccountRules" v-model="newAccountName"
          :label="localize('accountname')">
        </v-text-field>
      </v-form></v-card-text>
      <v-card-actions class="px-5 py-3">
        <v-spacer></v-spacer>
        <v-btn :class="bankName" @click="newAccount"
          :disabled="!validNewAccount">{{ localize('newaccount') }}</v-btn>
        <v-btn :class="bankName" @click="newAccountDialog = false">{{ localize('cancel') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="editAccountDialog" persistent max-width="600">
    <v-card class="elevation-12">
      <v-card-title :class="bankName">{{ localize('editaccount') }}</v-card-title>
      <v-card-text class="px-5 py-4"><v-form v-model="validEditAccount">
        <v-text-field :class="bankName" :rules="newAccountRules" v-model="editAccountName"
          :label="localize('accountname')">
        </v-text-field>
        <v-combobox :class="bankName" :label="localize('access')" multiple chips deletable-chips
          item-text="name" item-value="id" :items="autocompleteAccess"
          v-model="editAccountAccess">
        </v-combobox>
      </v-form></v-card-text>
      <v-card-actions class="px-5 py-3">
        <v-spacer></v-spacer>
        <v-btn :class="bankName" @click="editAccount"
          :disabled="!validEditAccount">{{ localize('savechanges') }}</v-btn>
        <v-btn :class="bankName" @click="editAccountDialog = false">{{ localize('cancel') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

</v-card-text>
</template>

<script>
import { mapState, mapMutations, mapActions } from 'vuex';
import BankInformation from '../components/BankInformation.vue';

export default {
  name: 'bank-header',
  components: {
    BankInformation,
  },
  computed: {
    ...mapState([
      'bankName', 'accounts', 'currentAccount','caName',
      'caBank', 'caOwner', 'autocompleteAccess', 'isAtm',
      'i18n', 'user', 'config',
    ]),
    ownedAccounts() {
      let ownedAccounts = 0;
      this.accounts.forEach((acc) => {
        if (acc.owner == this.user) ownedAccounts += 1;
      });
      return ownedAccounts;
    }
  },
  data() {
    return {
      newAccountDialog: false,
      newAccountName: '',
      validNewAccount: false,
      newAccountRules: [
        v => !!v || 'Account Name is required',
        v => v.length > 2 || 'The Account Name must be longer than two characters',
        v => v.length < 60 || 'The Account Name must be shorter than sixty characters',
      ],
      editAccountDialog: false,
      validEditAccount: false,
      editAccountName: '',
      editAccountAccess: [],
    };
  },
  methods: {
    ...mapMutations(['setDisplay']),
    ...mapActions(['changeAccount']),
    newAccount() {
      this.newAccountDialog = false;
      fetch('http://ghmattibanking/new-account', {
        method: 'post',
        body: JSON.stringify(this.newAccountName),
      });
    },
    closeApp() {
      fetch('http://ghmattibanking/close', {
        method: 'post',
        body: '{}',
      });
    },
    editAccount() {
      this.editAccountDialog = false;
      fetch('http://ghmattibanking/edit-account', {
        method: 'post',
        body: JSON.stringify({
          nameRequest: this.editAccountName,
          nameIs: this.caName,
          accessRequest: this.editAccountAccess,
          accessIs: this.accounts[this.currentAccount].access,
          accountId: this.accounts[this.currentAccount].id,
        }),
      });
    },
    openEditAccount() {
      this.editAccountName = this.caName;
      this.editAccountAccess = this.accounts[this.currentAccount].access;
      this.editAccountDialog = true;
    },
    localize(s) {
      return this.i18n[s];
    },
  },
};
</script>

<style>
button {
  min-width: 165px!important;
}

button.table-chevron {
  min-width: 0px!important;
}

button.fleeca {
  color: #ffffff!important;
  background-color: #268f3a!important;
  border: 1px solid #268f3a!important;
  border-radius: 0;
  text-transform: capitalize;
}
button.fleeca:hover {
  color: #268f3a!important;
  background-color: #ffffff!important;
}
.v-btn--disabled.fleeca {
  border: 1px solid rgba(0,0,0,0.12) !important;
}

button.lombank {
  color: #ffffff!important;
  background-color: #283468!important;
  border-radius: 28px;
}
button.lombank:hover {
  background-color: #c81318!important;
}

button.maze-bank {
  color: #ffffff!important;
  background-color: #e10a0a!important;
}
.v-menu__content .fleeca .v-list__tile--link:hover {
  background: rgba(38, 143, 58, 0.3);
}
.v-menu__content .maze-bank .v-list__tile--link:hover {
  background: rgba(225, 10, 10, 0.3);
}
.v-menu__content .lombank .v-list__tile--link:hover {
  background: rgba(40, 52, 104, 0.3);
}

.primary--text.fleeca, .fleeca .primary--text, a.fleeca {
  color: #268f3a !important;
  caret-color: #268f3a !important;
}
.primary--text.maze-bank, .maze-bank .primary--text, a.maze-bank {
  color: #e10a0a !important;
  caret-color: #e10a0a !important;
}
.primary--text.lombank, .lombank .primary--text, a.lombank {
  color: #283468 !important;
  caret-color: #283468 !important;
}
</style>

