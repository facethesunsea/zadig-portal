import * as types from '../mutations'
import { checkPlutusAPI, getSignatureFeaturesAPI } from '@api'
import router from '@/router/index.js'
import { plutusRoute } from '@/router/micro.js'

const state = {
  hasPlutus: false,
  features: {}, // ["release_center","delivery"] -> { release_center: true }
  plutusChecked: false
}

const mutations = {
  [types.SET_HAS_PLUTUS] (state, payload) {
    state.hasPlutus = payload
  },
  [types.SET_PLUTUS_CHECKED] (state, payload) {
    state.plutusChecked = payload
  },
  [types.SET_SIGNATURE_FEATURE] (state, payload) {
    state.features = payload
  }
}

const actions = {
  async checkPlutusStatus ({ commit, dispatch }, payload) {
    const res = await checkPlutusAPI().catch(err => { console.log(err) })
    if (res && payload.isAdmin) {
      const res = await dispatch('getSignatureFeatures')
      router.addRoutes(plutusRoute(res))
    }
    commit(types.SET_HAS_PLUTUS, !!res)
    commit(types.SET_PLUTUS_CHECKED, true)
  },

  async getSignatureFeatures ({ commit }) {
    const res = await getSignatureFeaturesAPI().catch(err => { console.log(err) })
    const resObj = {}
    if (res) {
      res.features.forEach(feat => { resObj[feat] = true })
      commit(types.SET_SIGNATURE_FEATURE, resObj)
    }
    return resObj
  }
}

export default {
  state,
  mutations,
  actions
}
