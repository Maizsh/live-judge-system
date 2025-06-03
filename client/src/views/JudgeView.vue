<template>
  <div class="judge-view">
    <el-container>
      <el-header>
        <h1 style="color: black;">评委打分界面</h1>
        <div class="connection-status" :class="{ connected: store.isConnected }">
          {{ store.isConnected ? '已连接' : '未连接' }}
        </div>
      </el-header>

      <el-main>
        <!-- 评委登录界面 -->
        <div style="color: black;" v-if="!judgeId" class="login-section">
          <h2>请选择评委编号</h2>
          <el-form :model="loginForm" label-width="120px">
            <el-form-item label="评委编号">
              <el-select v-model="loginForm.judgeNumber" placeholder="请选择评委编号">
                <el-option
                  v-for="n in store.judgesCount"
                  :key="n"
                  :label="getJudgeName(n)"
                  :value="n"
                />
              </el-select>
            </el-form-item>
            <el-form-item>
              <el-button type="primary" @click="handleLogin" :loading="loginForm.loading">
                确认登录
              </el-button>
            </el-form-item>
          </el-form>
        </div>

        <!-- 打分界面 -->
        <div v-else class="scoring-section">
          <div class="judge-info">
            <el-tag size="large">{{ judgeName }}</el-tag>
            <el-button type="danger" @click="handleLogout" size="small">
              退出登录
            </el-button>
          </div>

          <div class="current-contestant" v-if="store.competitionStarted">
            <h2>当前选手</h2>
            <el-card class="contestant-card">
              <template #header>
                <div class="card-header">
                  <span class="contestant-name">选手: <strong>{{ getCurrentContestantName }}</strong></span>
                  <el-tag 
                    :type="hasScored ? (currentScoreStatus === '已通过' ? 'success' : 'warning') : 'info'"
                    size="small"
                  >
                    {{ hasScored ? currentScoreStatus : '未打分' }}
                  </el-tag>
                </div>
              </template>
              
              <div class="score-input">
                <el-form :model="scoreForm" label-position="top">
                  <el-form-item label="可行性 (30分)">
                    <el-input-number v-model="scoreForm.feasibility" :min="0" :max="30" :step="0.5" :disabled="!store.allowScoreEdit" class="score-input-number" />
                    <div class="score-desc">指对参赛项目的主要内容和配套条件,如市场需求、资源供应、资金筹措、盈利能力等,从技术、经济等方面进行调查研究和分析比较,并提出该项目是否值得投资、如何进行建设的咨询意见。优秀25-30分，良好15-25分，一般0-15分。</div>
                  </el-form-item>
                  <el-form-item label="创新性 (25分)">
                    <el-input-number v-model="scoreForm.innovation" :min="0" :max="25" :step="0.5" :disabled="!store.allowScoreEdit" class="score-input-number" />
                    <div class="score-desc">指提交的参赛项目是否具有一定的技术含量,或具有低碳、环保、节能等方面的特色,内容、理念是否新颖。优秀20-25分，良好15-20分，一般0-15分。</div>
                  </el-form-item>
                  <el-form-item label="专业性 (20分)">
                    <el-input-number v-model="scoreForm.profession" :min="0" :max="20" :step="0.5" :disabled="!store.allowScoreEdit" class="score-input-number" />
                    <div class="score-desc">指参赛项目涉及的内容与参赛团队成员所学和擅长的专业业务、个人特长、爱好是否紧密相结合。参赛团队的组合搭配和分工在知识结构上是否科学合理。优秀15-20分，良好10-15分，一般0-10分。</div>
                  </el-form-item>
                  <el-form-item label="实践性 (25分)">
                    <el-input-number v-model="scoreForm.practice" :min="0" :max="25" :step="0.5" :disabled="!store.allowScoreEdit" class="score-input-number" />
                    <div class="score-desc">指参赛团队是否具备融资、抵御风险、公司管理等能力,是否有能力将规划付诸实践。优秀20-25分，良好15-20分，一般0-15分。</div>
                  </el-form-item>
                  <el-form-item label="总分">
                    <el-input-number v-model="scoreForm.total" :min="0" :max="100" :step="0.1" disabled class="score-input-number total-score" />
                  </el-form-item>
                  <el-form-item>
                    <el-button type="primary" @click="submitScore" :disabled="!store.competitionStarted || !store.allowScoreEdit" size="large" class="submit-button">
                      提交分数
                    </el-button>
                  </el-form-item>
                  <el-alert v-if="!store.allowScoreEdit" type="warning" show-icon style="margin-top:8px;">主持人已锁定评分，不能再修改分数，如需请联系主持人</el-alert>
                </el-form>
              </div>
            </el-card>
          </div>

          <div v-else class="waiting-message">
            <el-empty description="等待比赛开始..." />
          </div>

          <!-- 历史打分记录 -->
          <div class="score-history" v-if="store.competitionStarted">
            <h3>历史打分记录</h3>
            <el-table :data="scoreHistory" style="width: 100%">
              <el-table-column prop="contestantId" label="选手编号" width="80" />
              <el-table-column prop="contestantName" label="选手姓名" width="120" />
              <el-table-column prop="score" label="分数" width="80" />
              <el-table-column prop="status" label="状态">
                <template #default="{ row }">
                  <el-tag :type="row.score ? (row.status === '已通过' ? 'success' : 'warning') : 'info'">
                    {{ row.status }}
                  </el-tag>
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
import { ref, computed, onMounted, watch, onUnmounted } from 'vue'
import { useCompetitionStore } from '../stores/competition'
import { ElMessage } from 'element-plus'

const store = useCompetitionStore()
const judgeId = ref(null)
const judgeName = ref(null)

const loginForm = ref({
  judgeNumber: null,
  loading: false
})

const scoreForm = ref({
  feasibility: 0,
  innovation: 0,
  profession: 0,
  practice: 0,
  total: 0
})

// 计算当前选手是否已打分
const hasScored = computed(() => {
  if (!store.competitionStarted || !store.currentContestant) return false
  const contestantScores = store.scores[store.currentContestant] || {}
  return !!contestantScores[judgeId.value]
})

// 获取当前选手的评分状态
const currentScoreStatus = computed(() => {
  if (!store.competitionStarted || !store.currentContestant) return null
  const contestantScores = store.scores[store.currentContestant] || {}
  const score = contestantScores[judgeId.value]
  if (!score) return null
  return score.approved ? '已通过' : '待审核'
})

// 生成历史打分记录
const scoreHistory = computed(() => {
  if (!store.contestants.length) return []
  return store.contestants.map(contestant => {
    const contestantScores = store.scores[contestant.id] || {}
    const score = contestantScores[judgeId.value]
    return {
      contestantId: contestant.id,
      contestantName: contestant.name,
      score: score ? score.score : null,
      status: score ? (score.approved ? '已通过' : '待审核') : '未打分'
    }
  })
})

// 监听比赛状态变化
watch(() => store.competitionStarted, (newVal) => {
  if (!newVal && judgeId.value) {
    ElMessage.warning('比赛已结束')
    judgeId.value = null
  }
})

onMounted(() => {
  if (!store.socket) {
    store.initializeSocket()
  }

  // 添加提交失败和成功的事件监听
  store.socket.on('submitFailed', (data) => {
    ElMessage.error(data.message);
  });

  store.socket.on('submitSuccess', (data) => {
    ElMessage.success(data.message);
  });
})

// 处理评委登录
const handleLogin = async () => {
  if (!loginForm.value.judgeNumber) {
    ElMessage.warning('请选择评委编号')
    return
  }

  // 确保 store.judges 是数组
  if (!Array.isArray(store.judges)) {
    console.error('评委列表不是数组:', store.judges)
    ElMessage.error('系统错误：评委列表状态异常')
    return
  }

  // 检查评委编号是否已被占用
  if (store.judges.includes(loginForm.value.judgeNumber)) {
    console.log('评委编号已被占用:', loginForm.value.judgeNumber)
    console.log('当前评委列表:', store.judges)
    ElMessage.warning('该评委编号已被占用')
    return
  }

  loginForm.value.loading = true
  try {
    // 等待登录结果
    await new Promise((resolve, reject) => {
      const timeout = setTimeout(() => {
        reject(new Error('登录超时'))
      }, 5000)

      const successHandler = (data) => {
        clearTimeout(timeout)
        if (data.judgeId === loginForm.value.judgeNumber) {
          judgeId.value = data.judgeId
          judgeName.value = data.judgeName || `评委${data.judgeId}号`
          resolve()
        }
      }

      const failHandler = (data) => {
        clearTimeout(timeout)
        reject(new Error(data.message))
      }

      store.socket.once('loginSuccess', successHandler)
      store.socket.once('loginFailed', failHandler)

      // 发送登录请求
      store.socket.emit('judgeLogin', { judgeNumber: loginForm.value.judgeNumber })
    })

    ElMessage.success('登录成功')
  } catch (error) {
    console.error('登录失败:', error)
    ElMessage.error(error.message || '登录失败')
    judgeId.value = null
    judgeName.value = null
  } finally {
    loginForm.value.loading = false
  }
}

// 处理评委退出
const handleLogout = () => {
  store.judgeLogout(judgeId.value)
  judgeId.value = null
  judgeName.value = null
}

// 监听断连事件
watch(() => store.isConnected, (newVal) => {
  if (!newVal && judgeId.value) {
    ElMessage.error('与服务器断开连接，请刷新页面重新登录')
    judgeId.value = null
  }
})

// 获取评委名称
const getJudgeName = (number) => {
  if (store.importedJudgeNames && store.importedJudgeNames[number - 1]) {
    return store.importedJudgeNames[number - 1]
  }
  return `评委${number}号`
}

// 获取当前选手名称
const getCurrentContestantName = computed(() => {
  if (!store.competitionStarted || !store.currentContestant) return ''
  const contestant = store.contestants.find(c => c.id === store.currentContestant)
  return contestant ? contestant.name : ''
})

// 监听分数变化，自动计算总分
watch(() => [
  scoreForm.value.feasibility,
  scoreForm.value.innovation,
  scoreForm.value.profession,
  scoreForm.value.practice
], () => {
  scoreForm.value.total = Number((
    scoreForm.value.feasibility +
    scoreForm.value.innovation +
    scoreForm.value.profession +
    scoreForm.value.practice
  ).toFixed(1))
}, { deep: true })

// 提交分数
const submitScore = () => {
  if (!store.competitionStarted || !store.allowScoreEdit) {
    ElMessage.warning('当前不能提交分数')
    return
  }

  if (!judgeId.value) {
    ElMessage.warning('请先登录')
    return
  }

  const totalScore = scoreForm.value.total
  if (totalScore < 0 || totalScore > 100) {
    ElMessage.error('分数必须在0-100之间')
    return
  }

  store.socket?.emit('submitScore', {
    contestantId: store.currentContestant,
    judgeId: judgeId.value,
    score: totalScore
  })
}

// 组件卸载时清理
onUnmounted(() => {
  if (judgeId.value) {
    store.judgeLogout(judgeId.value)
  }
})
</script>

<style scoped>
.judge-view {
  min-height: 100vh;
  background-color: #f5f7fa;
  display: flex;
  flex-direction: column;
}

.el-header {
  background-color: #fff;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  position: sticky;
  top: 0;
  z-index: 10;
}

.el-container {
  display: flex;
  flex-direction: column;
  flex: 1;
}

.el-main {
  padding: 20px;
  flex: 1;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch; /* 提高移动端滚动体验 */
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

.login-section {
  max-width: 400px;
  margin: 40px auto;
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
}

.scoring-section {
  max-width: 800px;
  margin: 0 auto;
  padding-bottom: 50px; /* 增加底部空间 */
}

.judge-info {
  margin-bottom: 20px;
  text-align: right;
  display: flex;
  justify-content: flex-end;
  align-items: center;
  gap: 10px;
}

.contestant-card {
  margin-bottom: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.contestant-name {
  font-size: 1.2rem;
  color: #409EFF;
  padding: 4px 8px;
  border-radius: 4px;
  background-color: #ecf5ff;
  border-left: 3px solid #409EFF;
}

.score-input {
  width: 100%;
  max-width: 500px;
  margin: 0 auto;
}

/* 增大输入框样式 */
.score-input-number {
  width: 100% !important;
  margin-bottom: 10px;
}

.score-input-number :deep(.el-input-number__decrease),
.score-input-number :deep(.el-input-number__increase) {
  width: 40px;
  height: 40px;
  line-height: 40px;
  font-size: 20px;
  transform: none !important;
  position: absolute;
}

.score-input-number :deep(.el-input-number__decrease) {
  left: 1px;
  border-right: 1px solid #dcdfe6;
  border-radius: 4px 0 0 4px;
}

.score-input-number :deep(.el-input-number__increase) {
  right: 1px;
  border-left: 1px solid #dcdfe6;
  border-radius: 0 4px 4px 0;
}

.score-input-number :deep(.el-input__inner) {
  height: 46px !important;
  font-size: 20px;
  padding-left: 50px;
  padding-right: 50px;
  text-align: center;
}

.total-score {
  font-weight: bold;
}

.total-score :deep(.el-input__inner) {
  color: #409EFF;
  font-size: 24px;
}

.submit-button {
  width: 100%;
  height: 50px;
  font-size: 18px;
  margin-top: 10px;
}

.score-history {
  margin-top: 30px;
  background-color: white;
  padding: 20px;
  border-radius: 8px;
  box-shadow: 0 2px 12px 0 rgba(0,0,0,0.1);
}

.waiting-message {
  margin: 40px 0;
  text-align: center;
}

h1 {
  margin: 0;
  font-size: 1.5rem;
}

h2 {
  margin: 0 0 20px 0;
  font-size: 1.2rem;
}

h3 {
  margin: 0 0 15px 0;
  font-size: 1.1rem;
}

.score-desc {
  font-size: 12px;
  color: #888;
  margin-top: 4px;
  margin-bottom: 15px;
}

/* 响应式调整 */
@media screen and (max-width: 768px) {
  .el-main {
    padding: 10px;
  }
  
  .scoring-section {
    width: 100%;
    padding-bottom: 80px; /* 移动端增加更多底部空间 */
  }
  
  .score-input {
    width: 100%;
  }

  .contestant-name {
    font-size: 1.1rem;
  }
  
  .score-desc {
    font-size: 11px;
  }
  
  .score-input-number :deep(.el-input-number__decrease),
  .score-input-number :deep(.el-input-number__increase) {
    width: 50px;
    height: 50px;
    line-height: 50px;
  }
  
  .score-input-number :deep(.el-input__inner) {
    height: 50px !important;
    font-size: 22px;
    padding-left: 60px;
    padding-right: 60px;
  }
  
  /* 确保表格在移动端可以横向滚动 */
  .score-history .el-table {
    width: 100%;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
  }
}
</style> 