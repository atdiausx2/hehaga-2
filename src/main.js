import { createApp } from 'vue';
import App from './App.vue'


import 'vuetify/styles';
import { createVuetify } from 'vuetify';
import * as components from 'vuetify/components';
import * as directives from 'vuetify/directives';


const vuetify = createVuetify({ components, directives });

// Vue.config.productionTip = false

// new Vue({
//   render: h => h(App),
// }).$mount('#app')

const app = createApp(App);
app.use(vuetify);
app.mount('#app');
