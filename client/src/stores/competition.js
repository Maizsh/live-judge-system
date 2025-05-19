import { defineStore } from 'pinia'
import { io } from 'socket.io-client'
console.log("开发者：zsh，邮箱：zshx2001@163.com，微信：exemples");

// 获取当前环境的服务器地址
const getServerUrl = () => {
  if (import.meta.env.VITE_SERVER_URL) {
    return import.meta.env.VITE_SERVER_URL
  }
  // 如果没有配置环境变量，则使用当前域名
  return window.location.origin
}

export const useCompetitionStore = defineStore('competition', {
  state: () => ({
    socket: null,
    isConnected: false,
    competitionStarted: false,
    judgesCount: 0,
    contestantsCount: 0,
    currentContestant: 1,
    judges: [], // 存储已登录的评委编号
    scores: {},
    contestants: [],
    showRanking: false, // 控制是否显示排名
  }),
  
  getters: {
    // 计算去掉最高分最低分后的平均分
    calculateFinalScore: (state) => (contestantId) => {
      console.log('开始计算选手', contestantId, '的最终得分')
      const contestantScores = Object.values(state.scores[contestantId] || {})
      console.log('该选手的所有分数:', contestantScores)
      
      // 如果没有分数，返回0
      if (contestantScores.length === 0) {
        console.log('选手暂无评分，返回0.0')
        return '0.0'
      }
      
      // 如果评分数量少于3个，返回所有分数的平均值
      if (contestantScores.length < 3) {
        const average = contestantScores.reduce((a, b) => a + b, 0) / contestantScores.length
        console.log('评委数量少于3人，直接平均得分:', average.toFixed(1))
        return average.toFixed(1)
      }
      
      // 对分数进行排序
      const sortedScores = [...contestantScores].sort((a, b) => a - b)
      console.log('排序后的分数:', sortedScores)
      
      // 去掉最高分和最低分
      const trimmedScores = sortedScores.slice(1, -1)
      console.log('去掉最高分', sortedScores[sortedScores.length-1], 
                '和最低分', sortedScores[0], 
                '后的分数:', trimmedScores)
      
      // 计算平均分（保留一位小数）
      const average = trimmedScores.reduce((a, b) => a + b, 0) / trimmedScores.length
      console.log('最终平均分:', average.toFixed(1))
      return average.toFixed(1)
    },

    // 获取选手的所有评分详情
    getContestantScoreDetails: (state) => (contestantId) => {
      console.log('获取选手', contestantId, '的详细得分信息')
      const contestantScores = Object.values(state.scores[contestantId] || {})
      console.log('原始分数:', contestantScores)
      
      if (contestantScores.length === 0) {
        console.log('该选手暂无评分')
        return {
          allScores: [],
          validScoresCount: 0,
          lowestScore: null,
          highestScore: null,
          usedScores: [],
          average: '0.0'
        }
      }

      const sortedScores = [...contestantScores].sort((a, b) => a - b)
      console.log('排序后的分数:', sortedScores)
      
      const lowestScore = sortedScores[0]
      const highestScore = sortedScores[sortedScores.length - 1]
      
      // 如果评分数量少于3个，使用所有分数
      const usedScores = contestantScores.length < 3 
        ? sortedScores 
        : sortedScores.slice(1, -1)
      
      const average = usedScores.reduce((a, b) => a + b, 0) / usedScores.length
      console.log('使用的分数:', usedScores)
      console.log('计算得到的平均分:', average.toFixed(1))

      return {
        allScores: state.scores[contestantId] || {}, // 返回原始的评委-分数映射
        validScoresCount: contestantScores.length,
        lowestScore,
        highestScore,
        usedScores,
        average: average.toFixed(1)
      }
    },

    // 检查评委编号是否已被占用
    isJudgeOccupied: (state) => (judgeNumber) => {
      return state.judges.includes(judgeNumber)
    },

    // 获取所有选手的排名
    getAllContestantsRanking: (state) => () => {
      // 获取所有选手的得分
      const contestantsWithScores = state.contestants.map(contestant => ({
        number: contestant.id,
        name: contestant.name,
        score: Number(state.calculateFinalScore(contestant.id))
      }))

      // 按分数降序排序
      return contestantsWithScores.sort((a, b) => b.score - a.score)
    },

    // 判断是否所有选手都已完成打分
    isAllContestantsScored: (state) => {
      return state.contestants.every(contestant => {
        const details = state.getContestantScoreDetails(contestant.id)
        return details.validScoresCount === state.judgesCount
      })
    },
  },
  
  actions: {
    initializeSocket() {
      if (this.socket) {
        console.log('Socket 已存在，重用现有连接');
        return;
      }

      const serverUrl = getServerUrl();
      console.log('连接到服务器:', serverUrl);
      
      this.socket = io(serverUrl, {
        transports: ['websocket', 'polling'],
        reconnectionAttempts: 5,
        reconnectionDelay: 1000,
        timeout: 5000
      });

      console.log('初始化 Socket 连接');
      
      this.socket.on('connect', () => {
        this.isConnected = true;
        console.log('已连接到服务器');
      });
      
      this.socket.on('connect_error', (error) => {
        console.error('连接错误:', error);
        this.isConnected = false;
      });

      // 处理服务器状态同步
      this.socket.on('syncState', (state) => {
        console.log('收到服务器状态:', state)
        this.competitionStarted = state.isStarted
        this.judgesCount = state.judgesCount
        this.contestantsCount = state.contestantsCount
        this.currentContestant = state.currentContestant
        this.scores = state.scores || {}
        this.contestants = state.contestants || []
        this.judges = Array.isArray(state.judges) ? state.judges : []
        this.showRanking = state.showRanking || false
        console.log('更新评委列表:', this.judges)
      })

      this.socket.on('loginSuccess', (data) => {
        console.log('评委登录成功:', data)
        if (data.judgeId && !this.judges.includes(data.judgeId)) {
          this.judges.push(data.judgeId)
          console.log('更新评委列表:', this.judges)
        }
      })

      this.socket.on('loginFailed', (data) => {
        console.log('评委登录失败:', data.message)
      })
    },
    
    // 评委退出
    judgeLogout(judgeId) {
      console.log('评委退出:', judgeId)
      if (this.socket && judgeId) {
        this.socket.emit('judgeLogout')
      }
    },
    
    setupCompetition(judgesCount, contestantsCount) {
      console.log('设置比赛:', judgesCount, '名评委,', contestantsCount, '名选手')
      this.judgesCount = judgesCount
      this.contestantsCount = contestantsCount
      this.contestants = Array.from({ length: contestantsCount }, (_, i) => ({
        id: i + 1,
        name: '选手' + (i + 1)
      }))
      this.scores = {}
      this.judges = [] // 重置评委列表
    },
    
    startCompetition() {
      console.log('开始比赛')
      this.socket?.emit('startCompetition', {
        judgesCount: this.judgesCount,
        contestantsCount: this.contestantsCount
      })
    },
    
    endCompetition() {
      console.log('结束比赛')
      this.socket?.emit('endCompetition')
      this.judges = [] // 结束比赛时清空评委列表
    },
    
    nextContestant() {
      if (this.currentContestant < this.contestantsCount) {
        this.currentContestant++
        console.log('切换到下一位选手:', this.currentContestant)
        this.socket?.emit('contestantChange', { contestantId: this.currentContestant })
      }
    },
    
    previousContestant() {
      if (this.currentContestant > 1) {
        this.currentContestant--
        console.log('切换到上一位选手:', this.currentContestant)
        this.socket?.emit('contestantChange', { contestantId: this.currentContestant })
      }
    },
    
    exportResults() {
      console.log('导出比赛结果')
      const results = {
        contestants: this.contestants,
        scores: this.scores,
        summary: this.contestants.map(contestant => {
          const details = this.getContestantScoreDetails(contestant.id)
          const finalScore = this.calculateFinalScore(contestant.id)
          console.log('选手', contestant.id, '最终得分:', finalScore)
          return {
            contestantId: contestant.id,
            name: contestant.name,
            finalScore,
            scoreDetails: details
          }
        })
      }
      console.log('完整比赛结果:', results)
      return results
    },

    toggleRanking() {
      this.showRanking = !this.showRanking
      this.socket?.emit('toggleRanking', { showRanking: this.showRanking })
    },
  }
}) 