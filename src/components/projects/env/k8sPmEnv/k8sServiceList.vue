<template>
  <div class="common-parcel-block">
    <div class="primary-title">服务列表</div>
    <div>
      <div v-if="showFilter" class="service-filter-block">
        <span class="service-filter">
          快速过滤:
          <el-tooltip class="img-tooltip" effect="dark" placement="top">
            <div slot="content">
              智能选择会优先选择最新的容器镜像，如果在 Registry
              <br />下不存在该容器镜像，则会选择模板中的默认镜像进行填充
            </div>
            <i class="el-icon-info"></i>
          </el-tooltip>
          <el-select
            :disabled="cantOperate"
            size="small"
            class="img-select"
            v-model="quickSelection"
            placeholder="请选择"
            @change="quickInitImage"
          >
            <el-option label="全容器-智能选择镜像" value="latest"></el-option>
            <el-option label="全容器-全部默认镜像" value="default"></el-option>
          </el-select>
        </span>
      </div>
      <el-form class="service-form-block" label-width="50%" label-position="left">
        <div class="service-item" v-for="(service, serviceName) in selectedContainerMap" :key="serviceName">
          <div class="primary-title service-title">
            <div class="service-name">{{ serviceName }}</div>
            <template v-if="hasPlutus">
              <div class="service-resource">
                <span class="middle">
                  资源检测
                  <el-tooltip effect="dark" content="检查服务中定义的资源在所选的 K8s 命名空间中是否存在" placement="top">
                    <i class="el-icon-info gray"></i>
                  </el-tooltip>
                </span>
                <div style="display: inline-block;">
                  <span
                    class="resource-item"
                    v-for="(resource, index) in svcResources[serviceName] ? svcResources[serviceName].resources : []"
                    :key="index"
                  >
                    <i class="middle" :class="[resource.status === 'deployed' ? 'el-icon-success success' : 'el-icon-error fail']"></i>
                    <span>{{ `${resource.type}/${resource.name}` }}</span>
                  </span>
                </div>
              </div>
              <div class="service-operation">
                <el-radio-group v-model="service.deploy_strategy">
                  <el-radio label="import" :disabled="!(svcResources[serviceName] && svcResources[serviceName].deployed)">仅导入服务</el-radio>
                  <el-radio label="deploy">执行部署</el-radio>
                </el-radio-group>
              </div>
            </template>
          </div>
          <div class="service-content" v-show="service.deploy_strategy !== 'import'">
            <template v-if="service.type==='k8s' && service.containers">
              <el-form-item v-for="con of service.containers" :key="con.name" :label="con.name" label-width="40%">
                <el-select v-model="con.image" :disabled="cantOperate" filterable size="small">
                  <virtual-scroll-list
                    v-if="imageMap[con.image_name] && imageMap[con.image_name].length > 200"
                    style="height: 272px; overflow-y: auto;"
                    :size="virtualData.size"
                    :keeps="virtualData.keeps"
                    :start="virtualData.start"
                    :dataKey="(img)=>{ return img.name+'-'+img.tag}"
                    :dataSources="imageMap[con.image_name]"
                    :dataComponent="itemComponent"
                  ></virtual-scroll-list>
                  <el-option
                    v-else
                    v-for="img of imageMap[con.image_name]"
                    :key="`${img.name}-${img.tag}`"
                    :label="img.tag"
                    :value="img.full"
                  ></el-option>
                </el-select>
              </el-form-item>
            </template>
          </div>
        </div>
      </el-form>
    </div>
  </div>
</template>

<script>
import virtualListItem from '../../common/imageItem'
import virtualScrollList from 'vue-virtual-scroll-list'
import { imagesAPI, checkK8sSvcResourceAPI } from '@api'
import { mapState } from 'vuex'

export default {
  props: {
    showFilter: Boolean,
    cantOperate: Boolean,
    selectedContainerMap: Object,
    registryId: {
      required: true,
      type: String
    }
  },
  data () {
    return {
      itemComponent: virtualListItem,
      virtualData: {
        keeps: 20,
        size: 34,
        start: 0
      },
      quickSelection: '',
      imageMapById: {},
      svcResources: {}
    }
  },
  computed: {
    imageMap () {
      return this.imageMapById[this.registryId] || {}
    },
    ...mapState({
      hasPlutus: state => state.checkPlutus.hasPlutus
    })
  },
  methods: {
    async getImages (containerNames, registryId, init, services) {
      if (!this.imageMapById[registryId]) {
        const images = await imagesAPI(containerNames, registryId).catch(err =>
          console.log(err)
        )
        if (images) {
          for (const image of images) {
            image.full = `${image.host}/${image.owner}/${image.name}:${image.tag}`
          }
          this.$set(
            this.imageMapById,
            registryId,
            this.makeMapOfArray(images, 'name')
          )
        }
      }
      if (init) {
        this.quickSelection = 'latest'
        this.quickInitImage(services, this.imageMapById[registryId])
      }
    },
    makeMapOfArray (arr, namePropName) {
      const map = {}
      for (const obj of arr) {
        if (!map[obj[namePropName]]) {
          map[obj[namePropName]] = [obj]
        } else {
          map[obj[namePropName]].push(obj)
        }
      }
      return map
    },
    quickInitImage (services, imageMap = this.imageMap) {
      const select = this.quickSelection
      for (const group of services) {
        for (const ser of group) {
          ser.picked =
            ser.type === 'k8s' && (select === 'latest' || select === 'default')
          const containers = ser.containers
          if (containers) {
            for (const con of ser.containers) {
              if (select === 'latest') {
                if (imageMap[con.image_name]) {
                  con.image = imageMap[con.image_name][0].full
                } else {
                  con.image = con.defaultImage
                }
              }
              if (select === 'default') {
                con.image = con.defaultImage
              }
            }
          }
        }
      }
    },
    async checkSvcResource (projectName, payload) {
      if (!this.hasPlutus) {
        return Promise.reject()
      }
      // payload: env_name, namespace, cluster_id, vars
      this.svcResources = {}
      const res = await checkK8sSvcResourceAPI(
        projectName,
        payload
      ).catch(err => console.log(err))
      if (res) {
        const svcResources = {}
        const svcStatus = {}
        res.forEach(resource => {
          const deployed = !resource.resources.find(
            re => re.status === 'undeployed'
          )
          svcResources[resource.service_name] = {
            ...resource,
            deployed
          }
          svcStatus[resource.service_name] = deployed
        })
        this.svcResources = svcResources
        return Promise.resolve(svcStatus)
      }
      return Promise.reject()
    }
  },
  components: {
    virtualScrollList
  }
}
</script>

<style lang="less" scoped>
.service-filter-block {
  margin-bottom: 14px;

  .service-filter {
    color: @themeColor;
    font-size: 14px;

    .el-input__inner {
      color: #06f;
      border-color: #8cc5ff;

      &::placeholder {
        color: #8cc5ff;
      }
    }
  }
}

.service-form-block {
  width: 90%;
  max-width: 1000px;

  .service-item {
    margin-bottom: 8px;
    padding: 12px;
    background: rgba(246, 246, 246, 0.6);
    border-radius: 6px;

    .service-title {
      display: flex;
      align-items: center;
      margin-bottom: 0;

      .service-name {
        flex: 1 0 auto;
      }

      .service-resource {
        flex: 0 0 60%;
        margin: 0 20px;

        .resource-item {
          white-space: nowrap;
        }
      }

      .middle {
        margin-left: 8px;
        vertical-align: middle;
      }

      .success {
        color: @success;
      }

      .fail {
        color: @danger;
      }

      .gray {
        color: @info;
      }

      /deep/.el-radio {
        margin-right: 10px;
        color: inherit;
        font-weight: inherit;

        &:last-child {
          margin-right: 0;
        }

        .el-radio__label {
          padding-left: 4px;
        }
      }
    }

    .service-content {
      box-sizing: border-box;
      margin-top: 14px;
      padding: 15px 12px;
      background: #fff;
      border: 1px solid #d2d7dc;
      border-radius: 6px;

      /deep/.el-form-item {
        margin-bottom: 8px;

        .el-select {
          width: 100%;
        }
      }
    }
  }
}
</style>
