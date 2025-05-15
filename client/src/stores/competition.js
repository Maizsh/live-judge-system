import { defineStore } from 'pinia'
import { io } from 'socket.io-client'

export const useCompetitionStore = defineStore('competition', {
  state: () => ({
    socket: null,
    isConnected: false,
    competitionStarted: false,
    judgesCount: 0,
    contestantsCount: 0,
    currentContestant: 1,
    judges: [],
    scores: {},
    contestants: []
  }),
  
  getters: {
    // 计算去掉最高分最低分后的平均分
    calculateFinalScore: (state) => (contestantId) => {
      console.log('开始计算选手', contestantId, '的最终得分')
      const contestantScores = Object.values(state.scores[contestantId] || {})
      console.log('该选手的所有分数:', contestantScores)
      
      // 如果评分数量少于3个，返回所有分数的平均值
      if (contestantScores.length < 3) {
        const average = contestantScores.length 
          ? (contestantScores.reduce((a, b) => a + b, 0) / contestantScores.length).toFixed(1)
          : '0.0'
        console.log('评委数量少于3人，直接平均得分:', average)
        return average
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
        allScores: contestantScores,
        validScoresCount: contestantScores.length,
        lowestScore,
        highestScore,
        usedScores,
        average: average.toFixed(1)
      }
    }
  },
  
  actions: {
    initializeSocket() {
      this.socket = io('http://localhost:3000')
      
      this.socket.on('connect', () => {
        this.isConnected = true
        console.log('已连接到服务器')
      })
      
      this.socket.on('disconnect', () => {
        this.isConnected = false
        console.log('与服务器断开连接')
      })

      // 处理服务器状态同步
      this.socket.on('syncState', (state) => {
        console.log('收到服务器状态:', state)
        this.competitionStarted = state.isStarted
        this.judgesCount = state.judgesCount
        this.contestantsCount = state.contestantsCount
        this.currentContestant = state.currentContestant
        this.scores = state.scores
        this.contestants = state.contestants
        if (state.judges > 0) {
          this.judges = Array.from({ length: state.judges }, (_, i) => i + 1)
        } else {
          this.judges = []
        }
        
        // 当收到新状态时，重新计算所有选手的分数
        if (this.contestants.length > 0) {
          console.log('重新计算所有选手的分数')
          this.contestants.forEach(contestant => {
            const score = this.calculateFinalScore(contestant.id)
            console.log('选手', contestant.id, '的最终得分:', score)
          })
        }
      })

      this.socket.on('judgeUpdate', (data) => {
        console.log('评委数量更新:', data)
        if (data.judgesCount > 0) {
          this.judges = Array.from({ length: data.judgesCount }, (_, i) => i + 1)
        } else {
          this.judges = []
        }
      })

      this.socket.on('loginSuccess', (data) => {
        console.log('评委登录成功:', data)
        if (!this.judges.includes(data.judgeId)) {
          this.judges.push(data.judgeId)
        }
      })
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
    }
  }
}) 