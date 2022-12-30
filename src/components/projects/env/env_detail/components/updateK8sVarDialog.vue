<template>
  <el-dialog title="更新全局变量" :visible.sync="updateK8sEnvVarDialogVisible" width="60%" class="update-env-variable">
    <div>
      <Resize @sizeChange="$refs.codemirror.refresh()" :height="'350px'">
        <CodeMirror ref="codemirror" v-model="defaultVariable" />
      </Resize>
    </div>
    <span slot="footer" class="dialog-footer">
      <el-button size="small" type="primary" :loading="updateK8sEnvVarLoading" @click="updateK8sEnv">更新</el-button>
      <el-button size="small" @click="updateK8sEnvVarDialogVisible = false">{{$t(`global.cancel`)}}</el-button>
    </span>
  </el-dialog>
</template>
<script>
import Resize from '@/components/common/resize'
import CodeMirror from '@/components/projects/common/codemirror.vue'
import {
  getEnvDefaultVariableAPI,
  updateK8sEnvAPI,
  getAffectedServicesAPI
} from '@/api'
export default {
  name: 'updateK8sVar',
  props: {
    fetchAllData: Function
  },
  data () {
    return {
      updateK8sEnvVarDialogVisible: false,
      updateK8sEnvVarLoading: false,
      defaultVariable: ''
    }
  },
  computed: {
    projectName () {
      return this.$route.params.project_name
    },
    envName () {
      return this.$route.query.envName
    }
  },
  methods: {
    openDialog () {
      this.updateK8sEnvVarDialogVisible = true
    },
    async updateK8sEnv () {
      this.updateK8sEnvVarLoading = true
      const res = await getAffectedServicesAPI(this.projectName, this.envName, {
        variable_yaml: this.defaultVariable
      }).catch(err => console.log(err))
      this.updateK8sEnvVarLoading = false
      if (res) {
        this.$confirm(
          `修改的变量关联的服务 ${res.services.join('、')} 会更新，请确认。`,
          '确认',
          {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning'
          }
        ).then(() => {
          this.updateK8sEnvVar()
        })
      }
    },
    updateK8sEnvVar () {
      this.updateK8sEnvVarLoading = true
      updateK8sEnvAPI(
        this.projectName,
        this.envName,
        {
          variable_yaml: this.defaultVariable
        },
        false
      )
        .then(() => {
          this.updateK8sEnvVarLoading = false
          this.updateK8sEnvVarDialogVisible = false
          this.fetchAllData()
          this.$message({
            message: '更新全局变量成功，请等待服务升级',
            type: 'success'
          })
        })
        .catch(error => {
          const description = error.response.data.description
          const res = description.match(
            'the following services are modified since last update'
          )
          if (res) {
            this.updateEnv(description)
          }
        })
    },
    updateEnv (res) {
      const message = JSON.parse(res.match(/{.+}/g)[0])
      this.$confirm(
        `您的更新操作将覆盖环境中${message.name}服务变更，确认继续?`,
        '提示',
        {
          confirmButtonText: this.$t(`global.confirm`),
          cancelButtonText: this.$t(`global.cancel`),
          type: 'warning'
        }
      ).then(() => {
        updateK8sEnvAPI(
          this.projectName,
          this.envName,
          {
            variable_yaml: this.defaultVariable
          },
          true
        ).then(() => {
          this.fetchAllData()
          this.updateK8sEnvVarLoading = false
          this.updateK8sEnvVarDialogVisible = false
          this.$message({
            message: '更新环境成功，请等待服务升级',
            type: 'success'
          })
        })
      })
    }
  },
  watch: {
    updateK8sEnvVarDialogVisible (value) {
      if (value) {
        getEnvDefaultVariableAPI(this.projectName, this.envName).then(res => {
          this.defaultVariable = res.default_variable
        })
      } else {
        this.defaultVariable = ''
      }
    }
  },
  components: {
    Resize,
    CodeMirror
  }
}
</script>
