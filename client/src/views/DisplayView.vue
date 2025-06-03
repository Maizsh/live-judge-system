<template>
  <div class="display-view">
    <el-container>
      <el-header>
        <div class="title-container">
          <h1 v-if="!isEditing" @click="startEditing">{{ title }}</h1>
          <div v-else class="title-edit-form">
            <el-input v-model="editTitle" placeholder="输入比赛标题" ref="titleInput" />
            <div class="title-actions">
              <el-button type="primary" size="small" @click="saveTitle">确定</el-button>
              <el-button size="small" @click="cancelEditing">取消</el-button>
            </div>
          </div>
        </div>
        <div v-if="!store.isConnected" class="connection-status">
          未连接
        </div>
      </el-header>

      <el-main>
        <template v-if="store.competitionStarted">
          <!-- 比赛进行中且未显示排名 -->
          <div v-if="!store.showRanking" class="display-content">
            <!-- 顶部信息区 -->
            <div class="top-info">
              <div class="contestant-info">
                <div class="contestant-label">当前选手</div>
                <div class="contestant-number">{{ getCurrentContestantName }}</div>
              </div>
              <div class="progress-info">
                <div class="progress-label">评分进度</div>
                <div class="progress-value">{{ currentContestantDetails.validScoresCount }}/{{ store.judgesCount }}</div>
              </div>
            </div>

            <!-- 评分展示区域 -->
            <div class="scoring-area">
              <!-- 评分进行中 -->
              <template v-if="currentContestantDetails.validScoresCount < store.judgesCount">
                <div class="scores-display">
                  <div 
                    v-for="(score, judgeId) in approvedScores" 
                    :key="judgeId"
                    class="score-card"
                    :class="{
                      'removed': isScoreRemoved(score, currentContestantDetails, judgeId),
                      'active': !isScoreRemoved(score, currentContestantDetails, judgeId)
                    }"
                  >
                    <div class="judge-number">{{ getJudgeName(judgeId) }}</div>
                    <div class="score-number">{{ score.score }}</div>
                  </div>
                </div>
              </template>

              <!-- 最终得分 -->
              <div v-else class="final-score-container">
                <!-- 左侧最终得分 -->
                <div class="final-score-left">
                  <div class="final-label">最终得分</div>
                  <div class="final-value">{{ currentContestantDetails.average }}</div>
                </div>

                <!-- 右侧得分详情 -->
                <div class="final-score-right">
                  <!-- 最高分和最低分 -->
                  <div class="minmax-scores">
                    <div class="score-item highest">
                      <div class="score-label">最高分</div>
                      <div class="score-value">{{ currentContestantDetails.highestScore }}</div>
                    </div>
                    <div class="score-item lowest">
                      <div class="score-label">最低分</div>
                      <div class="score-value">{{ currentContestantDetails.lowestScore }}</div>
                    </div>
                  </div>

                  <!-- 所有评委打分 -->
                  <div class="all-scores">
                    <div class="scores-label">评委打分</div>
                    <div class="scores-grid">
                      <div 
                        v-for="(score, judgeId) in approvedScores" 
                        :key="judgeId"
                        class="judge-score"
                        :class="{
                          'removed': isScoreRemoved(score, currentContestantDetails, judgeId)
                        }"
                      >
                        <span class="judge-id">{{ getJudgeName(judgeId) }}</span>
                        <span class="score">{{ score.score }}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          <!-- 显示总排名 -->
          <div v-else class="ranking-display">
            <h2 class="ranking-title">总成绩排名</h2>
            <div class="ranking-list">
              <div 
                v-for="(contestant, index) in sortedContestants" 
                :key="contestant.number"
                class="ranking-item"
                :class="{'top-three': index < 3}"
                :style="{'--index': index}"
              >
                <div class="rank-number">{{ index + 1 }}</div>
                <div class="contestant-number">{{ contestant.name }}</div>
                <div class="final-score">{{ contestant.score }}</div>
              </div>
            </div>
          </div>
        </template>

        <div v-else class="waiting-message">
          <el-empty description="等待比赛开始..." />
        </div>
      </el-main>
    </el-container>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, nextTick } from 'vue'
import { useCompetitionStore } from '../stores/competition'

const store = useCompetitionStore()

// 标题编辑相关
const isEditing = ref(false)
const title = ref('第一届泰安市黄炎培职业教育创新创业大赛')
const editTitle = ref('')
const titleInput = ref(null)

// 开始编辑标题
const startEditing = () => {
  editTitle.value = title.value
  isEditing.value = true
  nextTick(() => {
    titleInput.value.focus()
  })
}

// 保存标题
const saveTitle = () => {
  if (editTitle.value.trim()) {
    title.value = editTitle.value.trim()
    localStorage.setItem('competitionTitle', title.value)
  }
  isEditing.value = false
}

// 取消编辑
const cancelEditing = () => {
  isEditing.value = false
}

// 从localStorage加载保存的标题
onMounted(() => {
  const savedTitle = localStorage.getItem('competitionTitle')
  if (savedTitle) {
    title.value = savedTitle
  }
  store.initializeSocket()
})

// 获取当前选手的评分详情
const currentContestantDetails = computed(() => {
  return store.getContestantScoreDetails(store.currentContestant)
})

// 获取所有选手的排名
const sortedContestants = computed(() => {
  return store.getAllContestantsRanking()
})

// 获取已审核通过的分数
const approvedScores = computed(() => {
  const scores = currentContestantDetails.value.allScores
  return Object.entries(scores)
    .filter(([_, score]) => score.approved)
    .reduce((acc, [judgeId, score]) => {
      acc[judgeId] = score
      return acc
    }, {})
})

// 判断分数是否被去除
const isScoreRemoved = (score, details, judgeId) => {
  if (details.validScoresCount < 3) return false
  
  // 获取所有分数和评委ID
  const scores = Object.entries(details.allScores)
    .filter(([_, s]) => s.approved)
    .map(([id, s]) => [id, s.score])
  
  // 如果是最高分
  if (score.score === details.highestScore) {
    // 找到所有最高分的评委ID
    const highestJudges = scores
      .filter(([_, s]) => s === details.highestScore)
      .map(([id]) => id)
      .sort()
    
    // 只有当当前评委ID是最高分评委中ID最小的那个时，才显示为灰色
    return judgeId === highestJudges[0]
  }
  
  // 如果是最低分
  if (score.score === details.lowestScore) {
    // 找到所有最低分的评委ID
    const lowestJudges = scores
      .filter(([_, s]) => s === details.lowestScore)
      .map(([id]) => id)
      .sort()
    
    // 只有当当前评委ID是最低分评委中ID最小的那个时，才显示为灰色
    return judgeId === lowestJudges[0]
  }
  
  return false
}

// 获取当前选手名称
const getCurrentContestantName = computed(() => {
  if (!store.currentContestant) return '未知选手'
  const contestant = store.contestants.find(c => c.id === store.currentContestant)
  return contestant ? contestant.name : `选手${store.currentContestant}`
})

// 获取评委名称
const getJudgeName = (judgeId) => {
  if (store.importedJudgeNames && store.importedJudgeNames[judgeId - 1]) {
    return store.importedJudgeNames[judgeId - 1]
  }
  return `评委${judgeId}`
}
</script>

<style scoped>
.display-view {
  height: 100vh;
  background: linear-gradient(135deg, #1e3c72 0%, #2a5298 100%);
  color: white;
  overflow: hidden;
}

.el-container {
  height: 100vh;
}

.el-header {
  background-color: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 3vw;
  height: 10vh !important;
}

.title-container {
  flex: 1;
}

.el-header h1 {
  font-size: 2.5vw;
  font-weight: bold;
  cursor: pointer;
  transition: all 0.3s;
  padding: 0.5vh 1vw;
  border-radius: 0.5vw;
}

.el-header h1:hover {
  background-color: rgba(255, 255, 255, 0.1);
}

.title-edit-form {
  display: flex;
  flex-direction: column;
  gap: 1vh;
  max-width: 60vw;
}

.title-actions {
  display: flex;
  gap: 1vw;
}

.connection-status {
  padding: 1vh 1.5vw;
  border-radius: 0.5vw;
  background-color: #f56c6c;
  font-size: 1.2vw;
  animation: blink 1s infinite;
}

.el-main {
  height: 90vh;
  padding: 2vh 3vw;
}

.display-content {
  height: 100%;
  display: flex;
  flex-direction: column;
  gap: 3vh;
}

/* 顶部信息区样式 */
.top-info {
  height: 20vh;
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0 5vw;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 1vw;
}

.contestant-info, .progress-info {
  text-align: center;
  flex: 1;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
}

.contestant-label, .progress-label {
  font-size: 1.5vw;
  opacity: 0.9;
  margin-bottom: 2vh;
}

.contestant-number {
  font-size: 4vw;
  font-weight: bold;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
  text-align: center;
  word-break: keep-all;
  line-height: 1.2;
}

.progress-value {
  font-size: 4vw;
  font-weight: bold;
  line-height: 1.2;
}

/* 评分区域样式 */
.scoring-area {
  flex: 1;
  display: flex;
  justify-content: center;
  align-items: center;
}

.scores-display {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: repeat(5, 1fr);
  gap: 1.5vw;
  padding: 2vh 0;
}

.score-card {
  background: rgba(255, 255, 255, 0.1);
  border-radius: 1vw;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  transition: all 0.3s ease;
}

.score-card.removed {
  opacity: 0.5;
}

.score-card.active {
  background: rgba(255, 255, 255, 0.2);
}

.judge-number {
  font-size: 1.2vw;
  margin-bottom: 1vh;
  text-align: center;
  word-break: keep-all;
  overflow: hidden;
  text-overflow: ellipsis;
}

.score-number {
  font-size: 2.5vw;
  font-weight: bold;
}

/* 最终得分容器样式 */
.final-score-container {
  width: 100%;
  height: 100%;
  display: grid;
  grid-template-columns: 40% 60%;
  gap: 2vw;
  padding: 2vh 2vw;
  padding-left: 0;
}

/* 左侧最终得分样式 */
.final-score-left {
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 1vw;
  padding: 2vh;
}

.final-label {
  font-size: 3vw;
  opacity: 0.9;
  margin-bottom: 3vh;
}

.final-value {
  font-size: 10vw;
  font-weight: bold;
  text-shadow: 0 0 30px rgba(255, 255, 255, 0.3);
}

/* 右侧得分详情样式 */
.final-score-right {
  display: flex;
  flex-direction: column;
  gap: 2vh;
}

/* 最高分最低分样式 */
.minmax-scores {
  display: flex;
  justify-content: space-between;
  gap: 2vw;
}

.score-item {
  flex: 1;
  text-align: center;
  padding: 1vh;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 0.5vw;
}

.score-item.highest {
  border: 2px solid #f56c6c;
}

.score-item.lowest {
  border: 2px solid #409eff;
}

.score-label {
  font-size: 1.2vw;
  opacity: 0.9;
  margin-bottom: 0.5vh;
}

.score-value {
  font-size: 2.5vw;
  font-weight: bold;
}

/* 所有评委打分样式 */
.all-scores {
  flex: 1;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 0.5vw;
  padding: 1vh;
}

.scores-label {
  font-size: 1.2vw;
  opacity: 0.9;
  margin-bottom: 1vh;
  text-align: center;
}

.scores-grid {
  display: grid;
  grid-template-columns: repeat(6, 1fr);
  grid-template-rows: repeat(5, 1fr);
  gap: 0.5vw;
  height: calc(100% - 3vh);
}

.judge-score {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 0.3vw;
  padding: 0.5vh;
  font-size: 1vw;
}

.judge-score.removed {
  opacity: 0.5;
  background: rgba(255, 255, 255, 0.05);
}

.judge-id {
  font-size: 0.8vw;
  opacity: 0.9;
  text-align: center;
  word-break: keep-all;
  overflow: hidden;
  text-overflow: ellipsis;
}

.score {
  font-size: 1.2vw;
  font-weight: bold;
}

@keyframes fadeIn {
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
}

@keyframes blink {
  0% { opacity: 1; }
  50% { opacity: 0.5; }
  100% { opacity: 1; }
}

/* Element Plus 空状态样式覆盖 */
:deep(.el-empty__description) {
  color: white;
  font-size: 2vw;
}

:deep(.el-empty__image) {
  opacity: 0.7;
}

/* 添加排名相关样式 */
.ranking-display {
  height: 100%;
  padding: 2vh 5vw;
  display: flex;
  flex-direction: column;
  gap: 4vh;
}

.ranking-title {
  font-size: 3vw;
  text-align: center;
  margin-bottom: 4vh;
  font-weight: bold;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
}

.ranking-list {
  display: flex;
  flex-direction: column;
  gap: 2vh;
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

.ranking-item {
  display: grid;
  grid-template-columns: 15% 45% 40%;
  align-items: center;
  background: rgba(255, 255, 255, 0.1);
  padding: 2vh 3vw;
  border-radius: 1vw;
  font-size: 2vw;
  transition: all 0.3s ease;
  animation: slideIn 0.5s ease forwards;
  animation-delay: calc(var(--index) * 0.1s);
}

.ranking-item.top-three {
  background: rgba(255, 255, 255, 0.2);
  transform: scale(1.02);
}

.ranking-item:nth-child(1) {
  background: linear-gradient(45deg, #FFD700 0%, rgba(255, 215, 0, 0.2) 100%);
}

.ranking-item:nth-child(2) {
  background: linear-gradient(45deg, #C0C0C0 0%, rgba(192, 192, 192, 0.2) 100%);
}

.ranking-item:nth-child(3) {
  background: linear-gradient(45deg, #CD7F32 0%, rgba(205, 127, 50, 0.2) 100%);
}

.rank-number {
  font-size: 2.5vw;
  font-weight: bold;
  text-align: center;
}

.ranking-item .contestant-number {
  font-size: 2vw;
  text-align: center;
}

.ranking-item .final-score {
  font-size: 2.5vw;
  font-weight: bold;
  text-align: right;
}

@keyframes slideIn {
  from {
    transform: translateX(-100%);
    opacity: 0;
  }
  to {
    transform: translateX(0);
    opacity: 1;
  }
}

/* 响应式样式 */
@media screen and (max-width: 768px) {
  .el-header h1 {
    font-size: 4vw;
  }
  
  .title-edit-form {
    max-width: 80vw;
  }
  
  .connection-status {
    font-size: 2.5vw;
  }
}

/* 移动端竖屏适配 */
@media screen and (max-width: 480px) {
  .el-header {
    flex-direction: column;
    align-items: flex-start;
    padding: 1vh 2vw;
    height: auto !important;
  }
  
  .el-header h1 {
    font-size: 5vw;
    margin-bottom: 1vh;
  }
  
  .title-container {
    width: 100%;
    margin-bottom: 1vh;
  }
  
  .title-edit-form {
    max-width: 95vw;
  }
  
  .connection-status {
    align-self: flex-start;
    font-size: 3vw;
    padding: 0.5vh 2vw;
  }
}
</style> 