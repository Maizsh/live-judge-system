<template>
  <div class="display-view">
    <el-container>
      <el-header>
        <h1>第一届泰安市黄炎培职业教育创新创业大赛</h1>
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
                <div class="contestant-number">{{ store.currentContestant }}</div>
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
                    v-for="(score, judgeId) in currentContestantDetails.allScores" 
                    :key="judgeId"
                    class="score-card"
                    :class="{
                      'removed': isScoreRemoved(score, currentContestantDetails),
                      'active': !isScoreRemoved(score, currentContestantDetails)
                    }"
                  >
                    <div class="judge-number">{{ judgeId }}号评委</div>
                    <div class="score-number">{{ score }}</div>
                  </div>
                </div>
              </template>

              <!-- 最终得分 -->
              <div v-else class="final-score">
                <div class="final-label">最终得分</div>
                <div class="final-value">{{ currentContestantDetails.average }}</div>
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
                <div class="contestant-number">{{ contestant.number }}号</div>
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
import { computed, onMounted } from 'vue'
import { useCompetitionStore } from '../stores/competition'

const store = useCompetitionStore()

const currentContestantDetails = computed(() => {
  return store.getContestantScoreDetails(store.currentContestant)
})

const sortedContestants = computed(() => {
  return store.getAllContestantsRanking()
})

const isScoreRemoved = (score, details) => {
  if (details.validScoresCount < 3) return false
  return score === details.highestScore || score === details.lowestScore
}

onMounted(() => {
  store.initializeSocket()
})
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

.el-header h1 {
  font-size: 2.5vw;
  font-weight: bold;
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
}

.contestant-label, .progress-label {
  font-size: 1.5vw;
  opacity: 0.9;
  margin-bottom: 2vh;
}

.contestant-number {
  font-size: 5vw;
  font-weight: bold;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.3);
}

.progress-value {
  font-size: 3vw;
  font-weight: bold;
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
}

.score-number {
  font-size: 2.5vw;
  font-weight: bold;
}

/* 最终得分样式 */
.final-score {
  text-align: center;
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
</style> 