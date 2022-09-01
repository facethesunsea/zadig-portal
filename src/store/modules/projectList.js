import * as types from '../mutations'
import { getProjectsAPI } from '../../api'
import { orderBy } from 'lodash'
const state = {
  projectList: []
}

const getters = {
  projectList: (state) => {
    return state.projectList
  },
  projectDeployType: (state) => (projectName) => {
    const project = state.projectList.find(project => project.name === projectName)
    return project ? project.deployType : ''
  },
  projectAliasByName: (state) => (name) => {
    const project = state.projectList.find(project => project.name === name)
    return (project && project.alias) || name
  },
  getOnboardingTemplates: (state) => {
    return state.projectList
      .filter((temp) => {
        return temp.onboarding_status
      })
  }
}

const mutations = {
  [types.SET_PROJECT_LIST] (state, payload) {
    state.projectList = payload
  }
}

const actions = {
  async getProjectList ({ commit, state, rootGetters }) {
    return await getProjectsAPI().then(
      (res) => {
        const result = orderBy(res, 'name')
        commit(types.SET_PROJECT_LIST, result)
      }
    )
  }
}

export default {
  state,
  getters,
  actions,
  mutations
}
