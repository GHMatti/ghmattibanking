<template>
<v-card-text>
  <v-layout row wrap>
  <v-flex xs6 pa-2>
    <v-card class="elevation-4 nav-mainmenu-buttons" :class="bankName">
      <v-layout row wrap>
        <v-flex xs6 text-xs-center py-3>
          <v-btn :class="bankName" @click="withdrawDialog = true">{{ localize('withdraw') }}</v-btn>
        </v-flex>
        <v-flex xs6 text-xs-center py-3>
          <v-btn :class="bankName" @click="depositDialog = true">{{ localize('deposit') }}</v-btn>
        </v-flex>
        <v-flex xs6 text-xs-center py-3>
          <v-btn :class="bankName" @click="transferDialog = true">{{ localize('transfer') }}</v-btn>
        </v-flex>
        <v-flex xs6 text-xs-center py-3>
          <v-btn :class="bankName" @click="setDisplay('account-select')">{{ localize('back') }}</v-btn>
        </v-flex>
      </v-layout>
    </v-card>
  </v-flex>
  <v-flex xs6 pa-2>
    <bank-information></bank-information>
  </v-flex>
  <v-flex xs12 pa-2>
    <bank-transactions></bank-transactions>
  </v-flex>
  </v-layout>

  <v-dialog v-model="depositDialog" persistent max-width="600">
    <v-card class="elevation-12">
      <v-card-title :class="bankName">{{ localize('deposit') }}</v-card-title>
      <v-card-text class="px-5 py-4"><v-form v-model="validDeposit">
        <v-text-field :class="bankName" :rules="depositRules" v-model="depositAmount"
        :label="localize('depositamount')" type="Number">
        </v-text-field>
      </v-form></v-card-text>
      <v-card-actions class="px-5 py-3">
        <v-spacer></v-spacer>
        <v-btn :class="bankName" @click="deposit" :disabled="!validDeposit">{{ localize('deposit') }}</v-btn>
        <v-btn :class="bankName" @click="depositDialog = false">{{ localize('cancel') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="withdrawDialog" persistent max-width="600">
    <v-card class="elevation-12">
      <v-card-title :class="bankName">{{ localize('withdraw') }}</v-card-title>
      <v-card-text class="px-5 py-4"><v-form v-model="validWithdraw">
        <v-text-field :class="bankName" :rules="withdrawRules" v-model="withdrawAmount"
        :label="localize('withdrawamount')" type="Number">
        </v-text-field>
      </v-form></v-card-text>
      <v-card-actions class="px-5 py-3">
        <v-spacer></v-spacer>
        <v-btn :class="bankName" @click="withdraw" :disabled="!validWithdraw">{{ localize('withdraw') }}</v-btn>
        <v-btn :class="bankName" @click="withdrawDialog = false">{{ localize('cancel') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

  <v-dialog v-model="transferDialog" persistent max-width="600">
    <v-card class="elevation-12">
      <v-card-title :class="bankName">{{ localize('transfer') }}</v-card-title>
      <v-card-text class="px-5 py-4"><v-form v-model="validTransfer">
        <v-combobox :class="bankName" :label="localize('transfertarget')"
          v-model="transferTarget" :items="autocompleteTransfer"
          item-text="accountnumber" item-value="accountnumber">
            <template slot="item" slot-scope="data">
              <template>
                <v-list-tile-content>
                  <v-list-tile-title :class="bankName">
                    {{ data.item.accountnumber }}
                  </v-list-tile-title>
                  <v-list-tile-sub-title :class="bankName">
                    {{ data.item.name }}
                  </v-list-tile-sub-title>
                </v-list-tile-content>
              </template>
            </template>
          </v-combobox>
        <v-text-field :class="bankName" :rules="transferAmountRules" v-model="transferAmount"
        :label="localize('transferamount')" type="Number">
        </v-text-field>
        <v-text-field :class="bankName" :rules="transferPurposeRules" v-model="transferPurpose"
        :label="localize('purpose')"></v-text-field>
      </v-form></v-card-text>
      <v-card-actions class="px-5 py-3">
        <v-spacer></v-spacer>
        <v-btn :class="bankName" @click="transfer" :disabled="!validTransfer">{{ localize('transfer') }}</v-btn>
        <v-btn :class="bankName" @click="transferDialog = false">{{ localize('cancel') }}</v-btn>
      </v-card-actions>
    </v-card>
  </v-dialog>

</v-card-text>
</template>

<script>
import { mapState, mapMutations, mapActions } from 'vuex';
import BankInformation from '../components/BankInformation.vue';
import BankTransactions from '../components/BankTransactions.vue';

export default {
  name: 'bank-header',
  components: {
    BankInformation,
    BankTransactions,
  },
  computed: mapState(['accounts', 'currentAccount', 'user', 'bankName', 'config', 'i18n', 'autocompleteTransfer']),
  data() {
    return {
      depositDialog: false,
      depositAmount: null,
      validDeposit: false,
      depositRules: [
        v => !!v || 'Amount is required',
        v => v > 0 || 'You can only deposit positive amounts of cash',
      ],
      withdrawDialog: false,
      withdrawAmount: null,
      validWithdraw: false,
      withdrawRules: [
        v => !!v || 'Amount is required',
        v => v > 0 || 'You can only withdraw positive amounts of cash',
      ],
      transferDialog: false,
      transferAmount: null,
      transferTarget: '',
      transferPurpose: '',
      validTransfer: false,
      transferAmountRules: [
        v => !!v || 'Amount is required',
        v => v > 0 || 'You can only transfer positive amounts of cash',
      ],
      transferPurposeRules: [
        v => !!v || 'Purpose is required',
        v => v.length < 250 || 'Purpose cannot be longer than 250 characters',
      ],
    };
  },
  methods: {
    ...mapMutations(['setDisplay']),
    ...mapActions(['requestTransactions']),
    deposit() {
      if (this.validDeposit) {
        this.depositDialog = false;
        fetch('http://ghmattibanking/deposit-on-account', {
          method: 'post',
          body: JSON.stringify({
            amount: Number(this.depositAmount).toFixed(0),
            account: this.accounts[this.currentAccount].id,
          }),
        });
        this.depositAmount = null;
        this.delayedRequestTransactions();
      }
    },
    withdraw() {
      if (this.validWithdraw) {
        this.withdrawDialog = false;
        fetch('http://ghmattibanking/withdraw-from-account', {
          method: 'post',
          body: JSON.stringify({
            amount: Number(this.withdrawAmount).toFixed(0),
            account: this.accounts[this.currentAccount].id,
          }),
        });
        this.withdrawAmount = null;
        this.delayedRequestTransactions();
      }
    },
    transfer() {
      if (this.validTransfer) {
        this.transferDialog = false;
        fetch('http://ghmattibanking/transfer-from-account', {
          method: 'post',
          body: JSON.stringify({
            amount: Number(this.transferAmount).toFixed(0),
            from: this.accounts[this.currentAccount].id,
            to: this.transferTarget,
            purpose: this.transferPurpose,
          }),
        });
        this.transferAmount = '0';
        this.delayedRequestTransactions();
      }
    },
    localize(s) {
      return this.i18n[s];
    },
    delayedRequestTransactions() {
      setTimeout(() => {
          this.requestTransactions(
            {
              id: this.accounts[this.currentAccount].id,
              limit: 7,
              offset: 0,
            }
          );
        }, 100);
    },
  },
  mounted() {
    this.requestTransactions(
      {
        id: this.accounts[this.currentAccount].id,
        limit: 7,
        offset: 0,
      }
    );
  }
};
</script>

<style>
.v-card.fleeca.nav-mainmenu-buttons {
  height: 201px;
  justify-content: center;
  align-items: center;
  align-content: center;
  display: flex;
}
.v-card.maze-bank.nav-mainmenu-buttons {
  height: 183px;
  justify-content: center;
  align-items: center;
  align-content: center;
  display: flex;
}
.v-card.lombank.nav-mainmenu-buttons {
  height: 181px;
  justify-content: center;
  align-items: center;
  align-content: center;
  display: flex;
}
</style>
