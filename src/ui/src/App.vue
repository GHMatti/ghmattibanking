<template>
  <v-app v-if="showInterface">
    <v-content>
      <v-container fluid fill-height>
        <v-layout align-center justify-center>
          <v-flex xs9>
            <v-card class="elevation-12 bank-wrapper">
              <bank-header></bank-header>
              <transition name="content-fade" mode="out-in">
                <component :is="display"></component>
              </transition>
            </v-card>
          </v-flex>
        </v-layout>
      </v-container>
    </v-content>
  </v-app>
</template>

<script>
import { mapState, mapMutations, mapActions } from 'vuex';
import AccountMainmenu from './views/AccountMainmenu.vue';
import AccountSelect from './views/AccountSelect.vue';
import BankHeader from './components/BankHeader.vue';

export default {
  name: 'app',
  components: {
    AccountMainmenu,
    AccountSelect,
    BankHeader,
  },
  computed: mapState(['bankName', 'display']),
  data() {
    return {
      showInterface: false,
    };
  },
  destroyed() {
    window.removeEventListener('message', this.listener);
  },
  methods: {
    toggleShow() {
      this.showInterface = !this.showInterface;
    },
    ...mapMutations([
      'setDate', 'setLocation', 'setBankState', 'setUser',
      'setAutocompleteAccessData', 'setAutocompleteTransferData',
      'setConfig',
    ]),
    ...mapActions(['updateAccountData', 'updateTransactionData']),
  },
  mounted() {
    this.listener = window.addEventListener('message', (event) => {
      const item = event.data || event.detail;
      if (this[item.type]) this[item.type](item);
    });
  },
};
</script>

<style>
/* lato-regular - latin */
@font-face {
  font-family: 'Lato';
  font-style: normal;
  font-weight: 400;
  src: local('Lato Regular'), local('Lato-Regular'),
       url('./assets/fonts/lato-v14-latin-regular.woff2') format('woff2'),
       url('./assets/fonts/lato-v14-latin-regular.woff') format('woff');
}
/* lato-italic - latin */
@font-face {
  font-family: 'Lato';
  font-style: italic;
  font-weight: 400;
  src: local('Lato Italic'), local('Lato-Italic'),
       url('./assets/fonts/lato-v14-latin-italic.woff2') format('woff2'),
       url('./assets/fonts/lato-v14-latin-italic.woff') format('woff');
}
/* lato-700 - latin */
@font-face {
  font-family: 'Lato';
  font-style: normal;
  font-weight: 700;
  src: local('Lato Bold'), local('Lato-Bold'),
       url('./assets/fonts/lato-v14-latin-700.woff2') format('woff2'),
       url('./assets/fonts/lato-v14-latin-700.woff') format('woff');
}
/* muli-regular - latin */
@font-face {
  font-family: 'Muli';
  font-style: normal;
  font-weight: 400;
  src: local('Muli Regular'), local('Muli-Regular'),
       url('./assets/fonts/muli-v11-latin-regular.woff2') format('woff2'),
       url('./assets/fonts/muli-v11-latin-regular.woff') format('woff');
}
/* muli-italic - latin */
@font-face {
  font-family: 'Muli';
  font-style: italic;
  font-weight: 400;
  src: local('Muli Italic'), local('Muli-Italic'),
       url('./assets/fonts/muli-v11-latin-italic.woff2') format('woff2'),
       url('./assets/fonts/muli-v11-latin-italic.woff') format('woff');
}
/* muli-700 - latin */
@font-face {
  font-family: 'Muli';
  font-style: normal;
  font-weight: 700;
  src: local('Muli Bold'), local('Muli-Bold'),
       url('./assets/fonts/muli-v11-latin-700.woff2') format('woff2'),
       url('./assets/fonts/muli-v11-latin-700.woff') format('woff');
}
/* pt-sans-regular - latin */
@font-face {
  font-family: 'PT Sans';
  font-style: normal;
  font-weight: 400;
  src: local('PT Sans'), local('PTSans-Regular'),
       url('./assets/fonts/pt-sans-v9-latin-regular.woff2') format('woff2'),
       url('./assets/fonts/pt-sans-v9-latin-regular.woff') format('woff');
}
/* pt-sans-italic - latin */
@font-face {
  font-family: 'PT Sans';
  font-style: italic;
  font-weight: 400;
  src: local('PT Sans Italic'), local('PTSans-Italic'),
       url('./assets/fonts/pt-sans-v9-latin-italic.woff2') format('woff2'),
       url('./assets/fonts/pt-sans-v9-latin-italic.woff') format('woff');
}
/* pt-sans-700 - latin */
@font-face {
  font-family: 'PT Sans';
  font-style: normal;
  font-weight: 700;
  src: local('PT Sans Bold'), local('PTSans-Bold'),
       url('./assets/fonts/pt-sans-v9-latin-700.woff2') format('woff2'),
       url('./assets/fonts/pt-sans-v9-latin-700.woff') format('woff');
}

::-webkit-scrollbar {
  width: 0;
  display: inline !important;
}

.app-background {
  background-color: rgba(0,0,0,0.5);
}

.fleeca {
  color: #000000!important;
  font-family: PT Sans, sans-serif;
  letter-spacing: 0.02em;
}
.maze-bank {
  color: #000000!important;
  font-family: Muli, sans-serif;
}
.lombank {
  color: #000000!important;
  font-family: Lato, sans-serif;
}

.theme--light.application {
  background: rgb(0, 0, 0, 0.5);
}

.bank-wrapper {
  height: 700px;
}

.content-fade-enter-active, .content-fade-leave-active {
  transition: opacity .3s ease-in-out;
}
.content-fade-enter, .content-fade-leave-to {
  opacity: 0;
}
</style>
