<template>
  <div class="code-content">
    <Multipane class="custom-resizer" layout="vertical">
      <div class="left">
        <div class="title">
          <el-row style="width: 100%;">
            <el-col :span="10">
              <div class="source-dropdown">
                <el-radio-group v-model="mode" size="mini">
                  <el-tooltip effect="dark" content="服务管理" placement="top">
                    <el-radio-button label="edit">
                      <i class="iconfont iconiconlog"></i>
                    </el-radio-button>
                  </el-tooltip>
                  <el-tooltip effect="dark" content="服务编排" placement="top">
                    <el-radio-button v-hasPermi="{projectName: projectName, action: 'edit_service'}" label="arrange">
                      <i class="iconfont iconvery-sort"></i>
                    </el-radio-button>
                  </el-tooltip>
                </el-radio-group>
              </div>
            </el-col>
            <el-col :span="14" class="text-right">
              <div style="line-height: 32px;">
                <el-tooltip effect="dark" content="从代码库同步" placement="top">
                  <el-button v-hasPermi="{type:'project', projectName: projectName, action: 'create_service',isBtn:true}" size="mini" icon="iconfont icon icongit" @click="openRepoModal('git')" plain circle></el-button>
                </el-tooltip>
                <el-tooltip effect="dark" content="从 Chart 仓库同步" placement="top">
                  <el-button v-hasPermi="{type:'project', projectName: projectName, action: 'create_service',isBtn:true}" @click="openRepoModal('chart')" size="mini" icon="iconfont icon iconhelmrepo" plain circle></el-button>
                </el-tooltip>
                <el-tooltip effect="dark" content="使用模板新建" placement="top">
                  <el-button v-hasPermi="{type:'project', projectName: projectName, action: 'create_service',isBtn:true}" @click="openRepoModal('chartTemplate')" size="mini" icon="iconfont icon iconvery-template" plain circle></el-button>
                </el-tooltip>
              </div>
            </el-col>
          </el-row>
        </div>
        <div class="left-tree" v-show="mode === 'edit'">
          <Folder
            ref="folder"
            class="folder"
            :changeModalStatus="changeModalStatus"
            :loadData="loadData"
            :saveFileName="saveFileName"
            :saveNewFile="saveNewFile"
            :saveNewFolder="saveNewFolder"
            :nodeData="filteredNodeData"
            :expandKey="expandKey"
            :changeExpandFileList="changeExpandFileList"
            :deleteServer="deleteServer"
            :openRepoModal="openRepoModal"
            :autoShowValuesYaml="autoShowValuesYaml"
          />
          <div class="bottom">
            <el-input v-model="searchService" placeholder="搜索服务" suffix-icon="el-icon-search" size="small"></el-input>
          </div>
        </div>
        <order class="left-tree" v-show="mode === 'arrange'"></order>
      </div>
      <MultipaneResizer class="multipane-resizer" />
      <div class="center">
        <div class="header">
          <PageNav
            ref="pageNav"
            :expandFileList="page.expandFileList"
            :changeExpandFileList="changeExpandFileList"
            :closePageNoSave="closePageNoSave"
            :setData="setData"
            :saveFile="saveFile"
          />
        </div>

        <div class="code" v-if="page.expandFileList.length">
          <div class="breadcrumb-nav">
            <span v-if="currentCode.service_name">
              <i class="iconfont iconhelmrepo"></i>
              {{currentCode.service_name}}
            </span>
            <template v-if="currentCode.parent">
              <span v-for="(path,index) in currentCode.parent.split('/')" :key="index">
              <template v-if="path">
                <span>></span>
                  <i class="el-icon-folder"></i>
                  {{path}}
              </template>
              </span>
            </template>
            <template v-if="currentCode.name">
              <span>></span>
              <span>{{currentCode.name}}</span>
            </template>
          </div>
          <component
            v-if="currentCode.type==='components'"
            :followUpFn="followUpFn"
            v-bind="currentCode"
            v-bind:is="currentCode.componentsName"
            canSelectBuildName
            fromServicePage
            class="code-content"
            mini
          ></component>
          <CodeMirror
            v-if="currentCode.type==='file'"
            :saveFile="saveFile"
            :changeCodeTxtCache="changeCodeTxtCache"
            :currentCode="currentCode"
            class="service-editor-content"
          />
          <div class="modal-block" v-if="currentCode && currentCode.type==='file' && (currentCode.source==='chartTemplate'|| currentCode.source==='customEdit') && showModal">
            <el-button v-if="currentCode.name === 'values.yaml' && !currentCode.autoSync" type="primary" size="small" @click="showModal = false">预览/编辑</el-button>
            <el-button v-else type="primary" size="small" @click="showModal = false">预览</el-button>
          </div>
        </div>
        <div class="footer" v-if="!isCreate">
          <el-button v-if="currentCode && currentCode.name === 'values.yaml' && currentCode.type==='file' && (currentCode.source==='chartTemplate'||currentCode.source==='customEdit') && !currentCode.autoSync" size="small" type="primary" :disabled="!contentChanged" @click="commit">保存</el-button>
          <el-button v-hasPermi="{projectName: projectName, action:'manage_environment',isBtn:true}" size="small" type="primary" :disabled="!updateEnv.length || !envNameList.length" @click="update()">加入环境</el-button>
        </div>
      </div>
      <MultipaneResizer class="multipane-resizer" v-if="service && service.length" />

      <div :style="{ flexGrow: 1, minWidth: '372px' }" class="right">
        <ServiceAside :changeExpandFileList="changeExpandFileList" ref="aside" slot="aside" :isCreate="isCreate" :isGuide="isGuide"/>
      </div>
    </Multipane>
    <UpdateHelmEnv v-model="updateHelmEnvDialogVisible" :chartInfo="chartInfo" />
    <el-dialog
      :title="currentService ? '更新服务' : '新建服务'"
      :visible="dialogVisible"
      center
      @close="closeSelectRepo"
      custom-class="dialog-source"
    >
      <Repo ref="repo" @triggleAction="changeExpandFileList('clear');clearCommitCache()" />
      <!-- 代码库弹窗 -->
    </el-dialog>
  </div>
</template>
<script>
import Folder from './components/editor/folder'
import Order from './components/editor/order'
import PageNav from './components/editor/pageNav'
import CodeMirror from './components/editor/codeMirror'
import Repo from './components/common/repo'
import ServiceAside from './components/helm/aside'
import { cloneDeep } from 'lodash'
import { Multipane, MultipaneResizer } from 'vue-multipane'
import UpdateHelmEnv from './components/common/updateHelmEnv'
import CommonBuild from '@/components/projects/build/commonBuild.vue'
import { deleteServiceTemplateAPI } from '@api'
import { mapState, mapGetters } from 'vuex'

const actionList = {
  file: ['delete'],
  folder: [],
  service: ['deleteServer']
}
const newFileNode = {
  label: null,
  add: true,
  txt: '',
  type: 'file'
}
const newFolderNode = {
  label: null,
  add: true,
  children: [],
  type: 'folder'
}
export default {
  name: 'service_helm',
  props: {
    isCreate: {
      default: false,
      type: Boolean
    },
    isGuide: {
      default: false,
      type: Boolean
    }
  },
  components: {
    Folder,
    Order,
    PageNav,
    CodeMirror,
    Multipane,
    MultipaneResizer,
    UpdateHelmEnv,
    CommonBuild,
    Repo,
    ServiceAside
  },
  data () {
    return {
      actionList: actionList,
      updateHelmEnvDialogVisible: false,
      commitCache: [],
      currentCode: null,
      page: {
        expandFileList: []
      },
      expandKey: [0],
      currentData: {
        children: null
      },
      nodeData: [],
      zindex: 0,
      modalvalue: false,
      position: {
        left: 0,
        top: 0
      },
      searchService: '',
      mode: 'edit',
      showModal: true,
      chartInfo: {
        chartNames: [],
        actionServiceName: '',
        type: ''
      }
    }
  },
  methods: {
    followUpFn () {
      this.changeExpandFileList('del', this.currentCode)
      this.$store.dispatch('queryServiceModule', {
        projectName: this.projectName,
        serviceName: this.$route.query.service_name
      })
    },
    closeSelectRepo () {
      this.$store.commit('SERVICE_DIALOG_VISIBLE', false)
      this.$refs.repo.closeSelectRepo()
    },
    loadData (data) {
      let path = ''
      if (typeof data.parent !== 'undefined') {
        path = data.parent + '/' + data.label
      } else {
        path = ''
      }
      this.expandKey = []
      const params = {
        payload: {
          serviceName: data.service_name,
          path: path,
          projectName: this.projectName
        },
        source: data.source
      }
      this.$store.dispatch('queryFilePath', params).then(res => {
        this.expandKey.push(data.id)
        data.children = res
        if (typeof data.parent === 'undefined') {
          this.autoShowValuesYaml(data)
        }
      })
    },
    setData (obj, data) {
      this[obj] = data
    },
    updateData (obj, key, value) {
      if (Object.prototype.hasOwnProperty.call(this[obj], key)) {
        this[obj][key] = value
      } else {
        this.$set(this[obj], key, value)
      }
    },
    changeCodeTxtCache (code) {
      this.updateData('currentCode', 'isUpdate', true)
      this.updateData('currentCode', 'updated', false)
      this.updateData('currentCode', 'cacheTxt', code)
    },
    closePageNoSave () {
      this.updateData('currentCode', 'isUpdate', false)
      this.updateData('currentCode', 'cacheTxt', '')
    },
    changeExpandFileList (method, item, index) {
      if (method === 'clear') {
        this.page.expandFileList = []
      } else {
        const resIndex = this.page.expandFileList.findIndex(
          i => i.id === item.id
        )
        const length = this.page.expandFileList.length
        if (method === 'add') {
          if (resIndex === -1) {
            this.page.expandFileList.push(item)
            this.$refs.pageNav.changePage(length, item)
          } else {
            this.$refs.pageNav.changePage(resIndex, item)
          }
        } else if (method === 'del') {
          if (length > 0) {
            this.page.expandFileList.splice(resIndex, 1)
            this.$refs.pageNav.changePage(0, this.page.expandFileList[0])
          }
        }
      }
    },
    deleteFile () {
      this.$refs.folder.remove(this.currentData)
      const resIndex = this.page.expandFileList.findIndex(
        i => i.id === this.currentData.id
      )
      if (resIndex >= 0) {
        this.changeExpandFileList('del', null, resIndex)
      }
    },
    async deleteServer (currentData) {
      const deleteText = `确定要删除 ${currentData.service_name} 这个服务吗？`
      this.$confirm(`${deleteText}`, '确认', {
        confirmButtonText: '确定',
        cancelButtonText: '取消',
        type: 'warning'
      }).then(() => {
        this.page.expandFileList = []
        this.$store.commit('CHART_NAMES', [
          { serviceName: currentData.service_name, type: 'delete' }
        ])
        deleteServiceTemplateAPI(
          currentData.service_name,
          'helm',
          this.projectName,
          'private'
        )
          .then(res => {
            if (res) {
              this.update('delete', currentData.service_name)
              this.$store.dispatch('queryService', {
                projectName: this.projectName
              })
            }
          })
          .catch(error => console.log(error))
      })
    },
    newFile (type) {
      if (this.currentData && this.currentData.type === 'file') {
        return
      }
      const id = Date.now()
      let newNode = null
      if (type === 'file') {
        newNode = cloneDeep(newFileNode)
        newNode = { id: id, ...newNode }
      } else {
        newNode = cloneDeep(newFolderNode)
        newNode = { id: id, ...newNode }
      }
      if (this.currentData) {
        if (this.currentData.children) {
          this.currentData.children.push(newNode)
        } else {
          this.currentData.children = [newNode]
        }
        this.expandKey.push(id)
      } else {
        this.nodeData.push(newNode)
      }
      this.currentData = newNode
      setTimeout(() => {
        this.$refs.folder.onFocus()
      })
    },
    updateFileName () {
      this.updateData('currentData', 'updateFileName', true)
      this.$nextTick(() => {
        this.$refs.folder.onFocus()
      })
    },
    saveNewFile (value) {
      if (value) {
        this.updateData('currentData', 'label', value)
        this.updateData('currentData', 'add', false)
        this.changeExpandFileList('add', this.currentData)
      } else {
        this.deleteFile()
      }
    },
    saveNewFolder (value) {
      if (value) {
        this.updateData('currentData', 'label', value)
        this.updateData('currentData', 'add', false)
      } else {
        this.deleteFile()
      }
    },
    saveFile () {
      const newCode = this.currentCode.cacheTxt
      if (this.currentCode.isUpdate) {
        this.updateData('currentCode', 'isUpdate', false)
        this.updateData('currentCode', 'txt', newCode)
        this.updateData('currentCode', 'cacheTxt', '')
        this.updateData('currentCode', 'updated', true)
        this.commitCache.push(cloneDeep(this.currentCode))
      }
    },
    clearCommitCache () {
      this.commitCache = []
    },
    commit () {
      const params = {
        projectName: this.projectName,
        commitCache: this.commitCache
      }
      this.$store.dispatch('updateHelmChart', params).then(res => {
        this.$store.commit(
          'CHART_NAMES',
          this.commitCache.map(cache => {
            return {
              serviceName: cache.service_name,
              type: 'create'
            }
          })
        )
        this.clearCommitCache()
      })
    },
    saveFileName (value) {
      if (value) {
        this.updateData('currentData', 'label', value)
        this.updateData('currentData', 'updateFileName', false)
      } else {
        this.updateData('currentData', 'updateFileName', false)
      }
    },
    changeModalStatus (position, status, currentData, isClose) {
      if (position) {
        this.position = position
      }
      if (status) {
        this.zindex = 998
      } else {
        this.zindex = 0
      }
      if (!isClose) {
        this.setData('currentData', currentData)
      }
      this.modalvalue = status
    },
    openRepoModal (source, currentService = null) {
      this.$store.commit('SERVICE_SOURCE', source)
      this.$store.commit(
        'CURRENT_SERVICE',
        currentService ? cloneDeep(currentService) : null
      )
      this.$store.commit('SERVICE_DIALOG_VISIBLE', true)
    },
    update (type, serviceName) {
      if (type === 'delete') {
        this.chartInfo = {
          chartNames: this.$store.state.serviceManage.chartNames.filter(
            chart => chart.serviceName === serviceName
          ),
          actionServiceName: serviceName,
          type: 'delete'
        }
      } else {
        this.chartInfo = {
          chartNames: this.updateEnv.length
            ? this.updateEnv
            : [
              {
                serviceName: this.$route.query.service_name,
                type: 'update'
              }
            ],
          actionServiceName: this.$route.query.service_name,
          type: ''
        }
      }
      if (this.chartInfo.chartNames.length) {
        this.updateHelmEnvDialogVisible = true
      }
    },
    autoShowValuesYaml (node) {
      const data =
        node.children.filter(node => node.label === 'values.yaml')[0] ||
        node.children[0]
      this.$refs.folder.addExpandFileList(data)
    }
  },
  watch: {
    service (value) {
      this.nodeData = cloneDeep(value)
      if (value.length === 0) {
        // const item = {
        //   id: '导入项目',
        //   type: 'components',
        //   componentsName: 'Repo',
        //   label: '导入项目',
        //   name: '导入项目',
        // }
        // this.changeExpandFileList('add', item)
      } else {
        const serviceName = this.$route.query.service_name
        const node = this.nodeData.find(node => node.label === serviceName)
        if (node) {
          this.loadData(node)
        } else {
          this.autoShowValuesYaml(this.nodeData[0])
        }
      }
    }
  },
  computed: {
    ...mapGetters(['projectList']),
    projectName () {
      return this.$route.params.project_name
    },
    envNameList () {
      const envNameList = []
      this.projectList.forEach(element => {
        if (element.name === this.projectName) {
          element.envs.forEach(envName => {
            envNameList.push({
              envName
            })
          })
        }
      })
      return envNameList
    },
    ...mapState({
      service: state => state.serviceManage.serviceList,
      serviceSource: state => state.serviceManage.serviceSource,
      dialogVisible: state => state.serviceManage.serviceDialogVisible,
      currentService: state => state.serviceManage.currentService,
      chartNames: state => state.serviceManage.chartNames
    }),
    filteredNodeData () {
      return this.nodeData.filter(node => {
        return node.service_name.includes(this.searchService)
      })
    },
    updateEnv () {
      const serviceName = this.$route.query.service_name
      return this.$store.state.serviceManage.chartNames.filter(
        chart => chart.type !== 'delete' && chart.serviceName === serviceName
      )
    },
    contentChanged () {
      if (this.currentCode.txt !== this.currentCode.originalTxt) {
        return true
      } else {
        return false
      }
    }
  },
  mounted () {
    this.$store.dispatch('queryService', { projectName: this.projectName })
  },
  beforeDestroy () {
    this.$store.commit('RESET_CHART_NAMES')
  }
}
</script>
<style lang="less" scoped>
.code-content {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
  padding: 15px 5px 0;
  overflow: auto;

  /deep/ .dialog-source {
    .el-dialog__header {
      padding: 20px 20px 10px;
      font-size: 16px;
      border: 1px solid #d2d2d2;
    }

    .el-dialog__footer {
      padding: 0 20px 20px;
      text-align: right;
    }

    .el-dialog__body {
      padding: 40px 106px 20px 106px;
    }
  }

  .left {
    display: flex;
    flex-direction: column;
    min-width: 250px;
    max-width: 480px;
    height: 100%;
    overflow: hidden;
    background-color: #fff;
    border-right: 1px solid #ebedef;

    .title {
      display: flex;
      flex: 0 0 auto;
      align-items: center;
      justify-content: space-between;
      height: 50px;
      padding: 0 10px;

      .text-right {
        text-align: right;

        /deep/ .el-button {
          .iconfont {
            font-size: 12px;
          }
        }
      }
    }

    .left-tree {
      flex: 1 1 auto;
      max-height: calc(~'100% - 55px');
      overflow: auto;

      .folder {
        height: calc(~'100% - 40px');
        overflow: auto;
      }
    }

    .bottom {
      flex: 0 0 auto;
      height: 40px;
      padding: 0 10px;
    }
  }

  .multipane-resizer {
    z-index: 10;
    cursor: col-resize;
  }

  .multipane-resizer::before {
    position: absolute;
    top: 50%;
    left: 50%;
    display: block;
    width: 8px;
    height: 55px;
    margin-top: -20px;
    margin-left: -5.5px;
    background-color: #fff;
    border: 1px solid #dbdbdb;
    border-radius: 5px;
    content: '';
  }

  .center {
    width: 50%;
    min-width: 200px;
    height: 100%;

    .header {
      position: absolute;
      top: 0;
      z-index: 99;
      width: 100%;
      height: 40px;
      overflow-x: scroll;
    }

    .code {
      position: relative;
      box-sizing: border-box;
      height: calc(~'100% - 85px');
      margin-top: 40px;
      overflow-y: scroll;
      background-color: #fff;

      .breadcrumb-nav {
        margin-top: 5px;
        padding-left: 15px;
        color: #a0a3a9;
        font-size: 14px;
      }

      .code-content {
        padding: 3px 3px 50px;
      }

      .service-editor-content {
        position: relative;
        z-index: 0;
      }

      .modal-block {
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        left: 0;
        z-index: 1;
        padding: 14px;
        background: rgba(234, 234, 234, 0.92);
        cursor: not-allowed;
      }
    }

    .footer {
      position: absolute;
      right: 0;
      bottom: 0;
      left: 0;
      height: 45px;
      padding: 0 10px;
      background: #fff;
    }
  }

  .center::-webkit-scrollbar {
    width: 0 !important;
  }

  .right {
    position: static;
    z-index: auto;
    min-width: 200px;
    background-color: #fff;
  }
}

.custom-resizer {
  width: 100%;
  height: 100%;
}

::-webkit-scrollbar {
  display: none;
}
</style>
