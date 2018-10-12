<template>
  <table :class="bankName">
    <tr>
      <th class="date">{{ localize('date') }}</th>
      <th class="text">{{ localize('description') }}</th>
      <th class="amount">{{ localize('amount') }}</th>
    </tr>
    <tr v-for="(transaction, index) in caTransactions" :key="index">
      <td class="date">{{ formatDate(transaction.issued_at) }}</td>
      <td class="text"><b>{{ transaction.origin }}</b><br />{{ transaction.purpose }}</td>
      <td class="amount">{{ formatCurrency(transaction.amount) }}</td>
    </tr>
    <tr>
      <td>
        <div style="display: inline-flex;">
          <v-btn icon small class="table-chevron"
            :dark="bankName === 'maze-bank'"
            :light="bankName === 'maze-bank'"
            :disabled="caTransactions.length < 7 || debounce"
            @click="getTransactions(-1)">
            <v-icon>chevron_left</v-icon>
          </v-btn>
          <v-btn icon small class="table-chevron"
            :dark="bankName === 'maze-bank'"
            :light="bankName === 'maze-bank'"
            :disabled="offset === 0 || debounce"
            @click="getTransactions(1)">
            <v-icon>chevron_right</v-icon>
          </v-btn>
        </div>
      </td>
      <td class="text">{{ localize('currentbalance') }}</td>
      <td class="amount">{{ formatCurrency(caBalance) }}</td>
    </tr>
  </table>
</template>

<script>
import { mapState, mapActions } from 'vuex';

export default {
  name: 'account-transaction-table',
  computed: mapState(['caTransactions', 'accounts', 'currentAccount', 'caBalance', 'user', 'bankName', 'config', 'i18n']),
  data() {
    return {
      offset: 0,
      debounce: false,
    };
  },
  methods: {
    ...mapActions(['requestTransactions']),
    formatCurrency(d) {
      return d.toLocaleString(this.config.locale, {
        currency: this.config.currency,
        style: 'currency',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0,
      });
    },
    formatDate(d) {
      const date = new Date(d);
      return date.toLocaleDateString(this.config.locale);
    },
    localize(s) {
      return this.i18n[s];
    },
    getTransactions(m) {
      this.debounce = true;
      this.offset -= m*7;
      this.requestTransactions({
        id: this.accounts[this.currentAccount].id,
        limit: 7,
        offset: this.offset,
      });
      setTimeout(() => { this.debounce = false; }, 250);
    },
  },
  mounted() {
    this.offset = 0;
  },
};
</script>

<style scoped>
table {
  border-collapse: collapse;
  width: 100%;
  margin: auto;
}

th:first-child {
  width: 110px;
}

table.lombank th {
  color: #ffffff;
  background-color: #000000;
  font-weight: bold;
  padding: 12px 16px;
}
table.lombank td {
  padding: 2px 16px;
}
table.lombank td:first-child, table.lombank th:first-child {
  border-left: 1px solid #000000;
}
table.lombank td:last-child, table.lombank th:last-child {
  border-right: 1px solid #000000;
}
table.lombank tr:nth-child(odd) {
  background-color: rgba(0,0,0,0.1);
}
table.lombank tr:last-child td {
  border: none;
  border-top: 1px solid #000000;
  font-weight: bold;
}
table.lombank tr:last-child {
  background-color: transparent;
}

table.fleeca {
  box-shadow: 0px 2px 4px -1px rgba(0,0,0,0.2),
              0px 4px 5px 0px rgba(0,0,0,0.14),
              0px 1px 10px 0px rgba(0,0,0,0.12);
}
table.fleeca th {
  padding: 8px 16px 4px;
  border-bottom: 2px solid #268f3a;
}
table.fleeca th:first-child, table.fleeca td:first-child {
  text-align: center;
}
table.fleeca td {
  padding: 2px 16px;
  line-height: 1.2;
}
table.fleeca tr:nth-child(odd) {
  background-color: rgba(38, 143, 58, 0.1);
}
table.fleeca tr:first-child, table.fleeca tr:last-child {
  background-color: transparent;
}
table.fleeca tr:last-child td {
  border: none;
  padding-top: 4px;
  border-top: 2px solid #268f3a;
  font-weight: bold;
}

table.maze-bank {
  box-shadow: 0px 2px 4px -1px rgba(0,0,0,0.2),
              0px 4px 5px 0px rgba(0,0,0,0.14),
              0px 1px 10px 0px rgba(0,0,0,0.12);
}
table.maze-bank th {
  line-height: 1.2;
  font-weight: bold;
  padding: 14px 16px;
  color: #ffffff;
  background-color: #e10a0a;
}
table.maze-bank td {
  padding: 6px 16px;
  line-height: 1.2;
}
table.maze-bank tr:nth-child(even) {
  background-color: rgba(225,10,10,0.1);
}
table.maze-bank tr:last-child td {
  border: none;
  font-weight: bold;
  padding: 2px 16px!important;
}
table.maze-bank tr:last-child {
  background-color: #e10a0a;
  color: #ffffff;
}

.date, .text {
  text-align: left;
}
.amount {
  text-align: right;
}
</style>
