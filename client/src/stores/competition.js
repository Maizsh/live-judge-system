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
      const contestantScores = Object.values(state.scores[contestantId] || {})
      
      // 如果评分数量少于3个，返回所有分数的平均值
      if (contestantScores.length < 3) {
        return contestantScores.length 
          ? (contestantScores.reduce((a, b) => a + b, 0) / contestantScores.length).toFixed(1)
          : '0.0'
      }
      
      // 对分数进行排序
      const sortedScores = [...contestantScores].sort((a, b) => a - b)
      
      // 去掉最高分和最低分
      const trimmedScores = sortedScores.slice(1, -1)
      
      // 计算平均分（保留一位小数）
      const average = trimmedScores.reduce((a, b) => a + b, 0) / trimmedScores.length
      return average.toFixed(1)
    },

    // 获取选手的所有评分详情
    getContestantScoreDetails: (state) => (contestantId) => {
      const contestantScores = Object.values(state.scores[contestantId] || {})
      if (contestantScores.length === 0) {
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
      const lowestScore = sortedScores[0]
      const highestScore = sortedScores[sortedScores.length - 1]
      
      // 如果评分数量少于3个，使用所有分数
      const usedScores = contestantScores.length < 3 
        ? sortedScores 
        : sortedScores.slice(1, -1)
      
      const average = usedScores.reduce((a, b) => a + b, 0) / usedScores.length

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
        console.log('Connected to server')
      })
      
      this.socket.on('disconnect', () => {
        this.isConnected = false
        console.log('Disconnected from server')
      })

      // 处理服务器状态同步
      this.socket.on('syncState', (state) => {
        console.log('Received sync state:', state)
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
      })

      this.socket.on('judgeUpdate', (data) => {
        if (data.judgesCount > 0) {
          this.judges = Array.from({ length: data.judgesCount }, (_, i) => i + 1)
        } else {
          this.judges = []
        }
      })

      this.socket.on('loginSuccess', (data) => {
        if (!this.judges.includes(data.judgeId)) {
          this.judges.push(data.judgeId)
        }
      })
    },
    
    setupCompetition(judgesCount, contestantsCount) {
      this.judgesCount = judgesCount
      this.contestantsCount = contestantsCount
      this.contestants = Array.from({ length: contestantsCount }, (_, i) => ({
        id: i + 1,
        name: '选手' + (i + 1)
      }))
      this.scores = {}
    },
    
    startCompetition() {
      this.socket?.emit('startCompetition', {
        judgesCount: this.judgesCount,
        contestantsCount: this.contestantsCount
      })
    },
    
    endCompetition() {
      this.socket?.emit('endCompetition')
    },
    
    nextContestant() {
      if (this.currentContestant < this.contestantsCount) {
        this.currentContestant++
        this.socket?.emit('contestantChange', { contestantId: this.currentContestant })
      }
    },
    
    previousContestant() {
      if (this.currentContestant > 1) {
        this.currentContestant--
        this.socket?.emit('contestantChange', { contestantId: this.currentContestant })
      }
    },
    
    exportResults() {
      const results = {
        contestants: this.contestants,
        scores: this.scores,
        summary: this.contestants.map(contestant => {
          const details = this.getContestantScoreDetails(contestant.id)
          return {
            contestantId: contestant.id,
            name: contestant.name,
            finalScore: this.calculateFinalScore(contestant.id),
            scoreDetails: details
          }
        })
      }
      return results
    }
  }
}) 