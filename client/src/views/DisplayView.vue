<template>
  <div class="display-view">
    <el-container>
      <el-header>
        <h1>大屏展示</h1>
        <div class="connection-status" :class="{ connected: store.isConnected }">
          {{ store.isConnected ? '已连接' : '未连接' }}
        </div>
      </el-header>

      <el-main>
        <div v-if="store.competitionStarted" class="display-content">
          <!-- 当前选手信息 -->
          <div class="current-contestant">
            <h2>当前选手</h2>
            <div class="contestant-number">{{ store.currentContestant }}</div>
          </div>

          <!-- 评分情况 -->
          <div class="scoring-status">
            <h3>评分情况</h3>
            <!-- 未完成评分时显示的内容 -->
            <template v-if="currentContestantDetails.validScoresCount < store.judgesCount">
              <div class="score-info">
                <div class="judges-count">
                  已评分：{{ currentContestantDetails.validScoresCount }}/{{ store.judgesCount }}
                </div>
                <template v-if="currentContestantDetails.validScoresCount >= 3">
                  <div class="score-details">
                    <div class="score-item">
                      <span class="label">最高分</span>
                      <span class="score removed">{{ currentContestantDetails.highestScore }}</span>
                    </div>
                    <div class="score-item">
                      <span class="label">最低分</span>
                      <span class="score removed">{{ currentContestantDetails.lowestScore }}</span>
                    </div>
                  </div>
                </template>
              </div>

              <!-- 评委打分展示 -->
              <div class="judges-scores">
                <transition-group name="score">
                  <div 
                    v-for="(score, judgeId) in currentContestantDetails.allScores" 
                    :key="judgeId"
                    class="judge-score"
                    :class="{
                      'removed': isScoreRemoved(score, currentContestantDetails)
                    }"
                  >
                    <div class="judge-label">评委 {{ judgeId }} 号</div>
                    <div class="score-value">{{ score }}</div>
                  </div>
                </transition-group>
              </div>
            </template>

            <!-- 所有评委打完分后只显示最终得分 -->
            <div v-else 
                 class="final-score-container"
                 :class="{'fade-in': currentContestantDetails.validScoresCount === store.judgesCount}">
              <div class="final-score">
                <h2>最终得分</h2>
                <div class="score">{{ currentContestantDetails.average }}</div>
              </div>
            </div>
          </div>
        </div>

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

// 获取当前选手的得分详情
const currentContestantDetails = computed(() => {
  return store.getContestantScoreDetails(store.currentContestant)
})

// 判断分数是否被去除（最高分或最低分）
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
}

.el-header {
  background-color: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0 20px;
  height: 60px !important;
}

.connection-status {
  padding: 6px 12px;
  border-radius: 4px;
  background-color: #f56c6c;
}

.connection-status.connected {
  background-color: #67c23a;
}

.el-main {
  padding: 20px;
  display: flex;
  justify-content: center;
  align-items: center;
}

.display-content {
  width: 100%;
  max-width: 1200px;
  text-align: center;
}

.current-contestant {
  margin-bottom: 40px;
}

.contestant-number {
  font-size: 8rem;
  font-weight: bold;
  text-shadow: 0 0 20px rgba(255, 255, 255, 0.5);
  margin: 20px 0;
}

.scoring-status {
  background-color: rgba(255, 255, 255, 0.1);
  border-radius: 16px;
  padding: 30px;
  margin-top: 20px;
}

.score-info {
  margin: 20px 0;
  font-size: 1.2rem;
}

.judges-count {
  margin-bottom: 20px;
  font-size: 1.5rem;
}

.score-details {
  display: flex;
  justify-content: center;
  gap: 40px;
  margin: 20px 0;
}

.score-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
}

.label {
  font-size: 1.2rem;
  opacity: 0.8;
}

.score {
  font-size: 2rem;
  font-weight: bold;
}

.score.removed {
  opacity: 0.5;
  text-decoration: line-through;
}

.judges-scores {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 20px;
  margin: 30px 0;
}

.judge-score {
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 12px;
  padding: 15px;
  min-width: 150px;
  transition: all 0.3s ease;
}

.judge-score.removed {
  opacity: 0.5;
  background-color: rgba(255, 255, 255, 0.1);
}

.judge-label {
  font-size: 1.1rem;
  margin-bottom: 10px;
}

.score-value {
  font-size: 2rem;
  font-weight: bold;
}

.final-score-container {
  margin-top: 40px;
  display: flex;
  justify-content: center;
  align-items: center;
  min-height: 300px;
}

.final-score {
  padding: 40px;
  background-color: rgba(255, 255, 255, 0.2);
  border-radius: 20px;
  text-align: center;
  box-shadow: 0 0 30px rgba(255, 255, 255, 0.1);
}

.final-score h2 {
  margin-bottom: 30px;
  font-size: 2.5rem;
  color: rgba(255, 255, 255, 0.9);
}

.final-score .score {
  font-size: 6rem;
  font-weight: bold;
  text-shadow: 0 0 30px rgba(255, 255, 255, 0.6);
  color: #fff;
}

h1 {
  margin: 0;
  font-size: 1.5rem;
}

h2 {
  margin: 0;
  font-size: 1.8rem;
}

h3 {
  margin: 0;
  font-size: 1.5rem;
}

.waiting-message {
  color: white;
  font-size: 1.5rem;
}

/* 动画效果 */
.score-enter-active,
.score-leave-active {
  transition: all 0.5s ease;
}

.score-enter-from,
.score-leave-to {
  opacity: 0;
  transform: translateY(30px);
}

.score-move {
  transition: transform 0.5s ease;
}

/* 适配深色主题的 Element Plus Empty 组件 */
:deep(.el-empty__description) {
  color: white !important;
}

:deep(.el-empty__image svg path) {
  fill: rgba(255, 255, 255, 0.3) !important;
}

/* 添加淡入动画效果 */
.fade-in {
  animation: fadeIn 1s ease-in;
}

@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20px);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}
</style> 