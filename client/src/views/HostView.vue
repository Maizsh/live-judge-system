<template>
  <div class="host-view">
    <el-dialog v-model="showPasswordDialog" title="请输入主持人密码" :close-on-click-modal="false" :close-on-press-escape="false" :show-close="false" width="300px">
      <el-input v-model="passwordInput" type="password" placeholder="请输入密码" @keyup.enter="checkPassword" />
      <template #footer>
        <el-button type="primary" @click="checkPassword">确认</el-button>
      </template>
    </el-dialog>
    <el-container v-if="!showPasswordDialog">
      <el-header>
        <h1>主持人控制界面</h1>
        <div class="connection-status" :class="{ connected: store.isConnected }">
          {{ store.isConnected ? '已连接' : '未连接' }}
        </div>
      </el-header>
      
      <el-main>
        <div class="setup-section" v-if="!store.competitionStarted">
          <el-form :model="setupForm" label-width="120px">
            <el-form-item label="评委数量">
              <el-input-number v-model="setupForm.judgesCount" :min="1" :max="30" />
            </el-form-item>
            <el-form-item label="选手数量">
              <el-input-number v-model="setupForm.contestantsCount" :min="1" :max="50" />
            </el-form-item>
            <el-form-item label="导入名单">
              <el-upload
                accept=".xlsx,.xls"
                :auto-upload="false"
                :on-change="handleFileChange"
                :limit="1"
                :file-list="fileList"
              >
                <el-button type="primary">选择Excel文件</el-button>
              </el-upload>
              <p class="upload-tip">Excel第一列为选手姓名，第二列为评委姓名</p>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="setupCompetition">
                确认设置
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <div class="competition-section" v-else>
          <div class="current-status">
            <h2>当前比赛状态</h2>
            <p>当前选手：{{ store.currentContestant }} / {{ store.contestantsCount }}</p>
            <p>已登录评委：{{ store.judges.length }} / {{ store.judgesCount }}</p>
          </div>
          <el-alert title="重要：先导出结果再结束比赛" type="warning" show-icon style="margin-bottom: 10px;"/>
          <div class="control-buttons">
           
            <el-button-group>
              <el-button 
                type="primary" 
                :icon="ArrowLeft" 
                @click="store.previousContestant"
                :disabled="store.currentContestant <= 1">
                上一位
              </el-button>
              <el-button 
                type="primary" 
                :icon="ArrowRight" 
                @click="store.nextContestant"
                :disabled="store.currentContestant >= store.contestantsCount">
                下一位
              </el-button>
            </el-button-group>

            <el-button type="danger" @click="endCompetition">
              结束比赛
            </el-button>

            <el-button type="success" @click="exportResults">
              导出结果
            </el-button>

            <el-button 
              type="primary" 
              @click="store.toggleRanking"
              :disabled="!store.isAllContestantsScored">
              {{ store.showRanking ? '隐藏排名' : '显示排名' }}
            </el-button>

            <el-button 
              type="warning" 
              @click="stopScoreEdit"
              :disabled="!store.competitionStarted || !store.allowScoreEdit"
            >
              停止评分
            </el-button>

            <el-button 
              type="success" 
              @click="startScoreEdit"
              :disabled="!store.competitionStarted || store.allowScoreEdit"
            >
              开始评分
            </el-button>
          </div>

          <div class="scores-table" v-if="store.competitionStarted">
            <h3>实时得分表</h3>
            <el-table :data="scoreTableData" style="width: 100%">
              <el-table-column prop="contestantId" label="选手编号" width="80" />
              <el-table-column prop="name" label="选手姓名" width="100" />
              <el-table-column prop="finalScore" label="最终得分" width="100">
                <template #default="{ row }">
                  <el-tooltip
                    v-if="row.scoreDetails.validScoresCount >= 3"
                    effect="dark"
                    placement="top"
                  >
                    <template #content>
                      <div>
                        <p>最高分：{{ row.scoreDetails.highestScore }}（已去除）</p>
                        <p>最低分：{{ row.scoreDetails.lowestScore }}（已去除）</p>
                        <p>有效分数：{{ row.scoreDetails.usedScores.join(', ') }}</p>
                      </div>
                    </template>
                    <span>{{ row.finalScore }}</span>
                  </el-tooltip>
                  <span v-else>{{ row.finalScore }}</span>
                </template>
              </el-table-column>
              <el-table-column prop="validScoresCount" label="已打分/总数" width="100">
                <template #default="{ row }">
                  {{ row.scoreDetails.validScoresCount }}/{{ store.judgesCount }}
                </template>
              </el-table-column>
              <el-table-column label="评委打分">
                <template #default="{ row }">
                  <el-popover
                    placement="right"
                    :width="400"
                    trigger="hover"
                  >
                    <template #reference>
                      <div class="scores-preview">
                        <el-tag 
                          v-for="(score, judgeId) in getPreviewScores(row.scoreDetails.allScores)"
                          :key="judgeId"
                          :type="score ? 'success' : 'info'"
                          class="score-tag"
                        >
                          评委{{ judgeId }}: {{ score || '未打分' }}
                        </el-tag>
                        <el-tag v-if="row.scoreDetails.allScores.length > 5" type="info">
                          ...更多
                        </el-tag>
                      </div>
                    </template>
                    <div class="scores-detail">
                      <el-row :gutter="10">
                        <el-col 
                          v-for="(score, judgeId) in row.scoreDetails.allScores" 
                          :key="judgeId"
                          :span="8"
                        >
                          <el-tag 
                            :type="score ? 'success' : 'info'"
                            class="score-tag full-width"
                          >
                            评委{{ judgeId }}: {{ score || '未打分' }}
                          </el-tag>
                        </el-col>
                      </el-row>
                    </div>
                  </el-popover>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { ref, computed, onMounted } from 'vue'
import { useCompetitionStore } from '../stores/competition'
import { ArrowLeft, ArrowRight } from '@element-plus/icons-vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import * as XLSX from 'xlsx'

const PASSWORD = '1024'
const showPasswordDialog = ref(true)
const passwordInput = ref('')

function checkPassword() {
  if (passwordInput.value === PASSWORD) {
    showPasswordDialog.value = false
  } else {
    ElMessage.error('密码错误！')
    passwordInput.value = ''
  }
}

const store = useCompetitionStore()
const setupForm = ref({
  judgesCount: 3,
  contestantsCount: 5
})

const fileList = ref([])
const importedNames = ref({
  contestants: [],
  judges: []
})

const getPreviewScores = (scores) => {
  const entries = Object.entries(scores)
  return Object.fromEntries(entries.slice(0, 5))
}

const scoreTableData = computed(() => {
  return store.contestants.map(contestant => {
    const details = store.getContestantScoreDetails(contestant.id)
    const finalScore = store.calculateFinalScore(contestant.id)
    console.log(`选手 ${contestant.id} 得分详情:`, {
      details,
      finalScore,
      rawScores: store.scores[contestant.id] || {}
    })
    
    return {
      contestantId: contestant.id,
      name: contestant.name,
      scoreDetails: details,
      finalScore
    }
  })
})

onMounted(() => {
  store.initializeSocket()
  // 监听评分锁定状态
  store.socket?.on('syncState', (state) => {
    store.allowScoreEdit = state.allowScoreEdit
  })
  
  // 组件挂载时清空导入的名单数据
  importedNames.value = {
    contestants: [],
    judges: []
  }
  fileList.value = []
})

const handleFileChange = (uploadFile) => {
  if (!uploadFile.raw) {
    return
  }

  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })
      
      // 解析数据
      const contestants = jsonData.map(row => row[0]).filter(Boolean)
      const judges = jsonData.map(row => row[1]).filter(Boolean)
      
      // 更新导入的名单
      importedNames.value = {
        contestants,
        judges
      }
      
      ElMessage.success('名单导入成功')
    } catch (error) {
      console.error('解析Excel失败:', error)
      ElMessage.error('解析Excel失败，请检查文件格式')
    }
  }
  
  reader.readAsArrayBuffer(uploadFile.raw)
}

const setupCompetition = () => {
  // 使用导入的名单设置比赛
  store.setupCompetition(
    setupForm.value.judgesCount, 
    setupForm.value.contestantsCount,
    importedNames.value
  )
  store.startCompetition()
}

const endCompetition = async () => {
  try {
    await ElMessageBox.confirm('确定要结束比赛吗？', '提示', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    })
    store.endCompetition()
    
    // 清空导入的名单数据
    importedNames.value = {
      contestants: [],
      judges: []
    }
    fileList.value = []
  } catch {
    // 用户取消操作
  }
}

const exportResults = () => {
  const results = store.exportResults()
  
  // 准备 Excel 数据
  const workbookData = [
    // 表头
    ['选手编号', '选手姓名', '最终得分', '有效分数数量', '最高分', '最低分', '所有评委打分']
  ]

  // 添加选手数据
  results.summary.forEach(item => {
    const allScores = Object.entries(item.scoreDetails.allScores)
      .map(([judgeId, score]) => `评委${judgeId}: ${score}`)
      .join(', ')

    workbookData.push([
      item.contestantId,
      item.name,
      item.finalScore,
      item.scoreDetails.validScoresCount,
      item.scoreDetails.highestScore || '-',
      item.scoreDetails.lowestScore || '-',
      allScores
    ])
  })

  // 按最终得分排序
  workbookData.slice(1).sort((a, b) => Number(b[2]) - Number(a[2]))

  // 发送到服务器生成 Excel
  store.socket?.emit('exportExcel', { data: workbookData }, (response) => {
    if (response.success) {
      // 创建下载链接
      const link = document.createElement('a')
      link.href = `data:application/vnd.openxmlformats-officedocument.spreadsheetml.sheet;base64,${response.file}`
      link.download = '比赛成绩表.xlsx'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      ElMessage.success('成绩表已导出')
    } else {
      ElMessage.error('导出失败：' + response.error)
    }
  })
}

const stopScoreEdit = () => {
  store.socket?.emit('stopScoreEdit')
}

const startScoreEdit = () => {
  store.socket?.emit('startScoreEdit')
}
</script>

<style scoped>
.host-view {
  height: 100vh;
  background-color: #f5f7fa;
}

.el-header {
  background-color: #fff;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
}

.connection-status {
  padding: 6px 12px;
  border-radius: 4px;
  background-color: #f56c6c;
  color: white;
}

.connection-status.connected {
  background-color: #67c23a;
}

.el-main {
  padding: 20px;
}

.setup-section {
  max-width: 500px;
  margin: 0 auto;
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
}

.competition-section {
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
}

.current-status {
  margin-bottom: 20px;
  padding: 15px;
  background-color: #f5f7fa;
  border-radius: 4px;
}

.control-buttons {
  display: flex;
  gap: 16px;
  margin-bottom: 20px;
}

.scores-table {
  margin-top: 20px;
}

.score-tag {
  margin-right: 8px;
  margin-bottom: 4px;
}

h1 {
  margin: 0;
  font-size: 1.5rem;
}

h2 {
  margin: 0 0 15px 0;
  font-size: 1.2rem;
}

h3 {
  margin: 0 0 15px 0;
  font-size: 1.1rem;
}

.scores-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.scores-detail {
  max-height: 300px;
  overflow-y: auto;
}

.full-width {
  width: 100%;
  margin-bottom: 8px;
  text-align: center;
}

.el-tag {
  margin: 2px;
}

.upload-tip {
  margin-top: 10px;
  margin-bottom: 0;
  font-size: 0.8rem;
  color: #909399;
}
</style> 