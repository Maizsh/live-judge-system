<template>
  <div class="host-view">
    <el-container>
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

const store = useCompetitionStore()
const setupForm = ref({
  judgesCount: 3,
  contestantsCount: 5
})

const getPreviewScores = (scores) => {
  const entries = Object.entries(scores)
  return Object.fromEntries(entries.slice(0, 5))
}

const scoreTableData = computed(() => {
  return store.contestants.map(contestant => {
    const contestantScores = store.scores[contestant.id] || {}
    const scores = Object.entries(contestantScores).reduce((acc, [judgeId, score]) => {
      acc[judgeId] = score
      return acc
    }, {})
    
    const validScores = Object.values(scores).filter(score => score !== null && score !== undefined)
    const average = validScores.length 
      ? validScores.reduce((a, b) => a + b, 0) / validScores.length 
      : 0

    return {
      contestantId: contestant.id,
      name: contestant.name,
      scores,
      validScoresCount: validScores.length,
      averageScore: average.toFixed(2),
      scoreDetails: {
        validScoresCount: validScores.length,
        highestScore: Math.max(...validScores),
        lowestScore: Math.min(...validScores),
        usedScores: validScores,
        allScores: scores
      },
      finalScore: average.toFixed(2)
    }
  })
})

onMounted(() => {
  store.initializeSocket()
})

const setupCompetition = () => {
  store.setupCompetition(setupForm.value.judgesCount, setupForm.value.contestantsCount)
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
  } catch {
    // 用户取消操作
  }
}

const exportResults = () => {
  const results = store.exportResults()
  const blob = new Blob([JSON.stringify(results, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = '比赛结果.json'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
  ElMessage.success('结果已导出')
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
</style> 