<template>
  <div class="judge-view">
    <el-container>
      <el-header>
        <h1>评委打分界面</h1>
        <div class="connection-status" :class="{ connected: store.isConnected }">
          {{ store.isConnected ? '已连接' : '未连接' }}
        </div>
      </el-header>

      <el-main>
        <!-- 评委登录界面 -->
        <div v-if="!judgeId" class="login-section">
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
                    :type="hasScored ? 'success' : 'warning'"
                    size="small"
                  >
                    {{ hasScored ? '已打分' : '未打分' }}
                  </el-tag>
                </div>
              </template>
              
              <div class="score-input">
                <el-form :model="scoreForm" label-position="top">
                  <el-form-item label="个人成长 (30分)">
                    <el-input-number v-model="scoreForm.feasibility" :min="0" :max="30" :step="0.5" :disabled="!store.allowScoreEdit" class="score-input-number" />
                    <div class="score-desc">1.立德树人。项目弘扬正确价值观，厚植家国情怀，恪守伦理规范，有助于培育创新精神。
2.调研深入。项目扎根中国大地了解国情民情，鼓励学生深入社会、行业、实验场所选题立项、调查研究、试验论证。
3.逻辑正确。项目符合将专业知识与商业知识有效结合并转化为商业价值或社会价值的创新创业基本过程和基本逻辑，展现创新教育对大学生基本素养和认知的塑造力。
4.知识掌握与应用能力。项目体现团队对创新创业所需知识（专业知识、商业知识、行业知识等）与技能（计划、组织、领导、控制、创新等）的娴熟掌握；体现团队用课堂和实验室学到的知识解决实际问题的综合能力和高级思维；体现对团队成员创新精神、创新意识、创新能力的锻炼和提升作用，展现创新教育提升大学生综合能力的效力。
5.人才培养成效。项目能充分体现院校在职业教育建设方面取得的成果；体现院校在项目的培育、孵化等方面的支持情况；体现职普融通、产教融合、科教融汇、多学科交叉、专创融合、产学研协同创新等模式在项目的产生与执行中的重要作用。
</div>
                  </el-form-item>
                  <el-form-item label="项目创新 (30分)">
                    <el-input-number v-model="scoreForm.innovation" :min="0" :max="30" :step="0.5" :disabled="!store.allowScoreEdit" class="score-input-number" />
                    <div class="score-desc">1.原始创新。具有原始创意、创造。
2.培养成效。具有面向培养“大国工匠”与能工巧匠的创意与创新。
3.模式创新。项目体现产教融合模式创新、校企合作模式创新、工学一体模式创新。
4.创新成效。鼓励面向职业和岗位的创意及创新，侧重于加工工艺创新、实用技术创新、产品（技术）改良、应用性优化、民生类创意等。
</div>
                  </el-form-item>
                  <el-form-item label="产业价值 (25分)">
                    <el-input-number v-model="scoreForm.profession" :min="0" :max="25" :step="0.5" :disabled="!store.allowScoreEdit" class="score-input-number" />
                    <div class="score-desc">1.产业情况。充分了解所在产业（行业）的产业规模、增长速度、竞争格局、产业趋势、产业政策等情况，形成完备、深刻的产业认知。
2.市场情况。项目具有明确的目标市场定位，对目标市场的特征、需求等情况有清晰的了解，并据此制定合理的营销、运营、财务等计划，设计出完整、创新、可行的商业模式，展现团队的商业思维。
3.落地情况。项目落地执行情况；项目促进区域经济发展、产业转型升级的情况；已有盈利能力或盈利潜力情况。
4.社会影响。项目直接或间接带动就业的数量和质量，对社会文明、生态文明、民生福祉等方面的积极推动作用。</div>
                  </el-form-item>
                  <el-form-item label="团队协作 (15分)">
                    <el-input-number v-model="scoreForm.practice" :min="0" :max="15" :step="0.5" :disabled="!store.allowScoreEdit" class="score-input-number" />
                    <div class="score-desc">1.团队精神。团队的组成原则与过程是否科学合理；团队是否具有支撑项目成长的知识、技术和经验；是否有明确的使命愿景。
2.团队结构。团队的组织构架、人员配置、分工协作、能力结构、专业结构、合作机制、激励制度等的合理性情况。
3.团队效能。团队与项目关系的真实性、紧密性情况；对项目的各项投入情况；创立创业企业的可能性情况。
4.团队资源。支撑项目发展的合作伙伴等外部资源的使用以及与项目关系的情况。</div>
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
                  <el-tag :type="row.score ? 'success' : 'info'">
                    {{ row.score ? '已打分' : '未打分' }}
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

// 生成历史打分记录
const scoreHistory = computed(() => {
  if (!store.contestants.length) return []
  return store.contestants.map(contestant => {
    const contestantScores = store.scores[contestant.id] || {}
    return {
      contestantId: contestant.id,
      contestantName: contestant.name,
      score: contestantScores[judgeId.value],
      status: contestantScores[judgeId.value] ? '已打分' : '未打分'
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
  ElMessage.success('已退出登录')
}

// 监听断连事件
watch(() => store.isConnected, (newVal) => {
  if (!newVal && judgeId.value) {
    ElMessage.error('与服务器断开连接，请刷新页面重新登录')
    judgeId.value = null
  }
})

// 自动计算总分
watch(
  () => [scoreForm.value.feasibility, scoreForm.value.innovation, scoreForm.value.profession, scoreForm.value.practice],
  ([f, i, p, pr]) => {
    scoreForm.value.total = +(f + i + p + pr).toFixed(1)
  }
)

// 提交分数
const submitScore = () => {
  // 校验每项分数
  if (
    scoreForm.value.feasibility < 0 || scoreForm.value.feasibility > 30 ||
    scoreForm.value.innovation < 0 || scoreForm.value.innovation > 25 ||
    scoreForm.value.profession < 0 || scoreForm.value.profession > 20 ||
    scoreForm.value.practice < 0 || scoreForm.value.practice > 25
  ) {
    ElMessage.warning('请检查各项分数是否在合理区间内')
    return
  }
  if (
    scoreForm.value.total !== scoreForm.value.feasibility + scoreForm.value.innovation + scoreForm.value.profession + scoreForm.value.practice
  ) {
    ElMessage.warning('总分有误')
    return
  }
  store.socket.emit('submitScore', {
    contestantId: store.currentContestant,
    judgeId: judgeId.value,
    score: scoreForm.value.total
  })
}

// 确保在组件卸载时移除事件监听
onUnmounted(() => {
  if (store.socket) {
    store.socket.off('submitFailed');
    store.socket.off('submitSuccess');
    if (judgeId.value) {
      store.judgeLogout(judgeId.value)
    }
  }
})

// 获取当前选手的姓名
const getCurrentContestantName = computed(() => {
  if (!store.currentContestant) return '未命名选手'
  const contestant = store.contestants.find(c => c.id === store.currentContestant)
  return contestant ? contestant.name : '未命名选手'
})

// 获取评委名称
const getJudgeName = (judgeNumber) => {
  if (store.importedJudgeNames && store.importedJudgeNames[judgeNumber - 1]) {
    return store.importedJudgeNames[judgeNumber - 1]
  }
  return `评委 ${judgeNumber} 号`
}
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