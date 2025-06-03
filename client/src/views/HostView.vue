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
        <h1 style="color: black;">主持人控制界面</h1>
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

        <div style="color: black;" class="competition-section" v-else>
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
                          :type="getScoreTagType(score)"
                          class="score-tag"
                        >
                          评委{{ judgeId+1 }}: {{ score ? score.score : '未打分' }}
                        </el-tag>
                        <el-tag v-if="row.scoreDetails.allScores.length > 5" type="info">
                          ...更多
                        </el-tag>
                      </div>
                    </template>
                    <div class="scores-detail">
                      <div class="scores-grid">
                        <div v-for="(score, judgeId) in row.scoreDetails.allScores" :key="judgeId" class="score-card">
                          <div class="score-card-header">
                            <span class="judge-name">{{ getJudgeName(judgeId) }}</span>
                            <el-tag :type="getScoreTagType(score)" size="small">
                              {{ score ? (score.approved ? '已通过' : '待审核') : '未打分' }}
                            </el-tag>
                          </div>
                          <div class="score-value">
                            {{ score ? score.score : '未打分' }}
                          </div>
                          <div class="score-actions-group" v-if="score">
                            <el-button type="primary" size="small" @click="editScore(row.contestantId, judgeId, score.score)" v-if="!score.approved">修改</el-button>
                            <el-button type="danger" size="small" @click="deleteScore(row.contestantId, judgeId)" v-if="!score.approved">删除</el-button>
                            <el-button type="success" size="small" @click="approveScore(row.contestantId, judgeId)" v-if="!score.approved">通过</el-button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </el-popover>
                </template>
              </el-table-column>
            </el-table>
          </div>
        </div>
      </el-main>
    </el-container>

    <el-dialog
      v-model="editScoreDialog"
      title="修改评分"
      width="300px"
    >
      <el-form>
        <el-form-item label="新分数">
          <el-input-number
            v-model="currentEditScore.score"
            :min="0"
            :max="100"
            :precision="2"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editScoreDialog = false">取消</el-button>
        <el-button type="primary" @click="saveEditedScore">保存</el-button>
      </template>
    </el-dialog>
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

const editScoreDialog = ref(false)
const currentEditScore = ref({
  contestantId: null,
  judgeId: null,
  score: null
})

const getPreviewScores = (scores) => {
  return Object.entries(scores).slice(0, 5)
}

const scoreTableData = computed(() => {
  return store.contestants.map(contestant => ({
    contestantId: contestant.id,
    name: contestant.name,
    finalScore: store.calculateFinalScore(contestant.id),
    scoreDetails: store.getContestantScoreDetails(contestant.id)
  }))
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

const handleFileChange = (file) => {
  const reader = new FileReader()
  reader.onload = (e) => {
    try {
      const data = new Uint8Array(e.target.result)
      const workbook = XLSX.read(data, { type: 'array' })
      const firstSheet = workbook.Sheets[workbook.SheetNames[0]]
      const jsonData = XLSX.utils.sheet_to_json(firstSheet, { header: 1 })
      
      // 提取选手和评委名单
      importedNames.value = {
        contestants: jsonData.map(row => row[0]).filter(Boolean),
        judges: jsonData.map(row => row[1]).filter(Boolean)
      }
      
      // 更新表单
      setupForm.value.contestantsCount = importedNames.value.contestants.length
      setupForm.value.judgesCount = importedNames.value.judges.length
      
      ElMessage.success('名单导入成功')
    } catch (error) {
      console.error('解析Excel文件失败:', error)
      ElMessage.error('解析Excel文件失败')
    }
  }
  reader.readAsArrayBuffer(file.raw)
}

const setupCompetition = () => {
  if (setupForm.value.judgesCount < 1 || setupForm.value.contestantsCount < 1) {
    ElMessage.error('评委数量和选手数量必须大于0')
    return
  }
  
  store.setupCompetition(
    setupForm.value.judgesCount,
    setupForm.value.contestantsCount,
    {
      contestants: importedNames.value.contestants,
      judges: importedNames.value.judges
    }
  )
  store.startCompetition()
}

const endCompetition = () => {
  ElMessageBox.confirm(
    '确定要结束比赛吗？请确保已导出结果。',
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    store.endCompetition()
  }).catch(() => {})
}

const exportResults = () => {
  const results = store.exportResults()
  const wb = XLSX.utils.book_new()
  
  // 创建总表
  const summaryData = results.summary.map(item => ({
    '选手编号': item.contestantId,
    '选手姓名': item.name,
    '最终得分': item.finalScore,
    '有效评分数量': item.scoreDetails.validScoresCount,
    '最高分': item.scoreDetails.highestScore || '',
    '最低分': item.scoreDetails.lowestScore || '',
    '使用分数': item.scoreDetails.usedScores.join(', ')
  }))
  const summaryWs = XLSX.utils.json_to_sheet(summaryData)
  XLSX.utils.book_append_sheet(wb, summaryWs, '总表')
  
  // 创建详细评分表
  const detailData = []
  results.contestants.forEach(contestant => {
    const contestantScores = results.scores[contestant.id] || {}
    Object.entries(contestantScores).forEach(([judgeId, score]) => {
      detailData.push({
        '选手编号': contestant.id,
        '选手姓名': contestant.name,
        '评委编号': judgeId,
        '评分': score.score,
        '状态': score.approved ? '已通过' : '待审核'
      })
    })
  })
  const detailWs = XLSX.utils.json_to_sheet(detailData)
  XLSX.utils.book_append_sheet(wb, detailWs, '详细评分')
  
  // 导出文件
  XLSX.writeFile(wb, '比赛结果.xlsx')
}

const stopScoreEdit = () => {
  store.stopScoreEdit()
}

const startScoreEdit = () => {
  store.startScoreEdit()
}

const getScoreTagType = (score) => {
  if (!score) return 'info'
  if (score.approved) return 'success'
  return 'warning'
}

const editScore = (contestantId, judgeId, score) => {
  currentEditScore.value = {
    contestantId,
    judgeId,
    score
  }
  editScoreDialog.value = true
}

const deleteScore = (contestantId, judgeId) => {
  ElMessageBox.confirm(
    '确定要删除这个评分吗？',
    '警告',
    {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning'
    }
  ).then(() => {
    store.deleteScore(contestantId, judgeId)
  }).catch(() => {})
}

const approveScore = (contestantId, judgeId) => {
  store.approveScore(contestantId, judgeId)
}

const saveEditedScore = () => {
  if (currentEditScore.value) {
    store.updateScore(
      currentEditScore.value.contestantId,
      currentEditScore.value.judgeId,
      currentEditScore.value.score
    )
    editScoreDialog.value = false
  }
}

const getJudgeName = (judgeId) => {
  const judge = store.judges.find(j => j.id === judgeId)
  return judge ? judge.name : `评委${judgeId}`
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
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
}

.scores-preview {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  padding: 8px;
}

.score-tag {
  margin: 0;
  padding: 4px 8px;
  font-size: 14px;
}

.scores-detail {
  max-height: 400px;
  overflow-y: auto;
  padding: 16px;
}

.scores-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 16px;
  padding: 8px 0;
}

.score-card {
  background: #f5f7fa;
  border-radius: 8px;
  padding: 16px 12px;
  display: flex;
  flex-direction: column;
  gap: 10px;
  box-shadow: 0 1px 4px 0 rgba(0,0,0,0.04);
}

.score-card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.score-value {
  font-size: 22px;
  font-weight: bold;
  color: #409EFF;
  margin-bottom: 6px;
}

.score-actions-group {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.el-table {
  margin-top: 16px;
}

.el-table :deep(th) {
  background-color: #f5f7fa;
  font-weight: bold;
}

.el-table :deep(td) {
  padding: 12px 0;
}

.el-popover {
  max-width: 600px !important;
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

.full-width {
  width: 100%;
  margin-bottom: 8px;
  text-align: center;
}

.upload-tip {
  margin-top: 10px;
  margin-bottom: 0;
  font-size: 0.8rem;
  color: #909399;
}

@media screen and (max-width: 768px) {
  .scores-grid {
    grid-template-columns: 1fr;
  }
}
</style> 