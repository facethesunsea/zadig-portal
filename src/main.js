import 'normalize.css'
import 'loaders.css'
import './assets/css/theme/index.css'
import 'vant/lib/index.css'
import Vue from 'vue'
import Element from 'element-ui'
import router from './router/index.js'
import store from './store'
import sse from './common/vue_sse'
import VueClipboard from 'vue-clipboard2'
import utils from '@utils/utilities'
import translate from '@utils/wordTranslate'

// Mixin
import goBackMixin from '@/mixin/goBackMixin'
import onboardingStatusMixin from '@/mixin/onboardingStatusMixin'
import permissionMixin from '@/mixin/permissionMixin'

import '@utils/traversal'
import directive from '@/directive'

import App from './App.vue'
import { analyticsRequestAPI } from '@api'
import encrypt from './utilities/encrypt'
import { NativeEventSource, EventSourcePolyfill } from 'event-source-polyfill'

global.EventSource = EventSourcePolyfill || NativeEventSource

Vue.prototype.$utils = utils
Vue.prototype.$translate = translate
Vue.use(sse)

Vue.config.debug = true
Vue.use(VueClipboard)
Vue.use(Element)
Vue.use(directive)
Vue.mixin(goBackMixin)
Vue.mixin(onboardingStatusMixin)
Vue.mixin(permissionMixin)
Vue.mixin({
  beforeDestroy () {
    const arr = window.__spockEventSources[this._uid]
    if (arr) {
      arr.forEach((src) => {
        src.userCount--
        if (src.userCount === 0) {
          src.close()
        }
      })
    }
  }
})

const isSuperAdmin = () => {
  return utils.roleCheck('admin')
}
const userName = () => {
  return utils.getUserName()
}
const analyticsRequest = (to, from) => {
  const hostname = window.location.hostname
  if (to.path !== from.path && !utils.isPrivateIP(hostname)) {
    const payload = encrypt({
      domain: hostname,
      username: userName(),
      url: to.path,
      createdAt: Math.floor(Date.now() / 1000)
    })

    analyticsRequestAPI(payload)
      .then()
      .catch((err) => {
        console.log(err)
      })
  }
}

router.beforeEach(async (to, from, next) => {
  if (to.params.project_name) {
    const projectName = to.params.project_name
    await store.dispatch('checkingPermission', projectName)
  }
  if (to.meta.title) {
    document.title = to.meta.title
  } else {
    document.title = 'Zadig'
  }

  if (userName() && !store.state.checkPlutus.plutusChecked) {
    await store.dispatch('checkPlutusStatus', { isAdmin: isSuperAdmin() })
    next(to)
  }

  if (to.meta.requiresSuperAdmin) {
    if (!isSuperAdmin()) {
      Element.Notification({
        title: '非超级管理员',
        message: '无权访问',
        type: 'error'
      })
      next({
        path: from.fullPath
      })
    } else {
      next()
    }
  } else {
    analyticsRequest(to, from)
    next()
  }
})

function mountApp () {
  new Vue({
    router,
    store,
    components: { App },
    render: (h) => h(App)
  }).$mount('#app')
}
mountApp()
