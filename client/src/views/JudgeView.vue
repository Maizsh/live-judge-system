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
                  :label="`评委 ${n} 号`"
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
            <el-tag size="large">评委 {{ judgeId }} 号</el-tag>
            <el-button type="danger" @click="handleLogout" size="small">
              退出登录
            </el-button>
          </div>

          <div class="current-contestant" v-if="store.competitionStarted">
            <h2>当前选手</h2>
            <el-card class="contestant-card">
              <template #header>
                <div class="card-header">
                  <span>选手 {{ store.currentContestant }} 号</span>
                  <el-tag 
                    :type="hasScored ? 'success' : 'warning'"
                    size="small"
                  >
                    {{ hasScored ? '已打分' : '未打分' }}
                  </el-tag>
                </div>
              </template>
              
              <div class="score-input">
                <el-form :model="scoreForm" label-width="80px">
                  <el-form-item label="评分">
                    <el-input-number 
                      v-model="scoreForm.score" 
                      :min="0" 
                      :max="100" 
                      :step="0.5"
                      :disabled="!store.competitionStarted"
                    />
                  </el-form-item>
                  <el-form-item>
                    <el-button 
                      type="primary" 
                      @click="submitScore"
                      :disabled="!store.competitionStarted"
                    >
                      提交分数
                    </el-button>
                  </el-form-item>
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
              <el-table-column prop="contestantId" label="选手编号" width="100" />
              <el-table-column prop="score" label="分数" width="100" />
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

const loginForm = ref({
  judgeNumber: null,
  loading: false
})

const scoreForm = ref({
  score: 80
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
  } finally {
    loginForm.value.loading = false
  }
}

// 处理评委退出
const handleLogout = () => {
  store.judgeLogout(judgeId.value)
  judgeId.value = null
  ElMessage.success('已退出登录')
}

// 监听断连事件
watch(() => store.isConnected, (newVal) => {
  if (!newVal && judgeId.value) {
    ElMessage.error('与服务器断开连接，请刷新页面重新登录')
    judgeId.value = null
  }
})

// 提交分数
const submitScore = () => {
  if (!scoreForm.value.score && scoreForm.value.score !== 0) {
    ElMessage.warning('请输入分数')
    return
  }

  store.socket.emit('submitScore', {
    contestantId: store.currentContestant,
    judgeId: judgeId.value,
    score: scoreForm.value.score
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
</script>

<style scoped>
.judge-view {
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

.score-input {
  max-width: 300px;
  margin: 0 auto;
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
</style> 