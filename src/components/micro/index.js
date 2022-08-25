import { registerMicroApps, start } from 'qiankun'
// import store from '@/store'
// import utils from '@/assets/js/utils'
import router from '@/router/index.js'

export const currentInfo = {
  mount: false
}
// debug address
const prefix = process.env.NODE_ENV === 'development' ? '//localhost:10000' : ''

export const microApps = [
  {
    name: 'plutusVendor',
    entry: `${prefix}/plutus-vendor/`,
    container: '#container',
    activeRule: ['/v1/plutus', '/v1/enterprise', '/v1/release'],
    props: {
      routerBase: '/v1',
      //   mainStore: store,
      //   user: utils.getStorage('user'),
      mainAppRouter: router,
      currentInfo
    }
  }
]

export const registerApps = () => {
  registerMicroApps(microApps, {
    beforeLoad: (app) => {
    //   store.commit('app/loadingMicro', true)
      console.log('before load app.name====>>>>>', app.name)
    },
    beforeMount: [
      (app) => {
        console.log('[LifeCycle] before mount %c%s', 'color: green;', app.name)
      }
    ],
    afterMount: [
      (app) => {
        // store.commit('app/loadingMicro', false)
        console.log('[LifeCycle] after mount %c%s', 'color: green;', app.name)
      }
    ],
    beforeUnmount: [
      (app) => {
        console.log('[LifeCycle] before unmount %c%s', 'color: green;', app.name)
      }
    ],
    afterUnmount: [
      (app) => {
        console.log('[LifeCycle] after unmount %c%s', 'color: green;', app.name)
      }
    ]
  })

  start({
    sandbox: {
      prefetch: 'all',
      // strictStyleIsolation: true // true,
      experimentalStyleIsolation: true // true
    }
  })
}
