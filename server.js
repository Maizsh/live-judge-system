const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "http://localhost:5173", // Vue开发服务器的默认地址
    methods: ["GET", "POST"]
  }
});
const cors = require('cors');

app.use(cors());

// 存储比赛状态
const competitionState = {
  isStarted: false,
  judgesCount: 0,
  contestantsCount: 0,
  currentContestant: 1,
  judges: new Set(),
  scores: {},
  contestants: []
};

// 广播比赛状态给所有客户端
function broadcastState() {
  io.emit('syncState', {
    isStarted: competitionState.isStarted,
    judgesCount: competitionState.judgesCount,
    contestantsCount: competitionState.contestantsCount,
    currentContestant: competitionState.currentContestant,
    judges: Array.from(competitionState.judges).length,
    scores: competitionState.scores,
    contestants: competitionState.contestants
  });
}

io.on('connection', (socket) => {
  console.log('用户已连接:', socket.id);

  // 立即发送当前比赛状态给新连接的客户端
  socket.emit('syncState', {
    isStarted: competitionState.isStarted,
    judgesCount: competitionState.judgesCount,
    contestantsCount: competitionState.contestantsCount,
    currentContestant: competitionState.currentContestant,
    judges: Array.from(competitionState.judges).length,
    scores: competitionState.scores,
    contestants: competitionState.contestants
  });

  // 处理评委登录
  socket.on('judgeLogin', (data) => {
    if (competitionState.judges.size < competitionState.judgesCount) {
      competitionState.judges.add(socket.id);
      socket.judgeId = competitionState.judges.size;
      socket.emit('loginSuccess', { judgeId: socket.judgeId });
      io.emit('judgeUpdate', { judgesCount: competitionState.judges.size });
      broadcastState();
    } else {
      socket.emit('loginFailed', { message: '评委数量已满' });
    }
  });

  // 处理开始比赛
  socket.on('startCompetition', (data) => {
    competitionState.isStarted = true;
    competitionState.judgesCount = data.judgesCount;
    competitionState.contestantsCount = data.contestantsCount;
    competitionState.currentContestant = 1;
    competitionState.contestants = Array.from({ length: data.contestantsCount }, (_, i) => ({
      id: i + 1,
      name: '选手' + (i + 1)
    }));
    broadcastState();
  });

  // 处理结束比赛
  socket.on('endCompetition', () => {
    competitionState.isStarted = false;
    competitionState.judges.clear();
    competitionState.scores = {};
    competitionState.contestants = [];
    competitionState.judgesCount = 0;
    competitionState.contestantsCount = 0;
    competitionState.currentContestant = 1;
    broadcastState();
  });

  // 处理选手切换
  socket.on('contestantChange', (data) => {
    competitionState.currentContestant = data.contestantId;
    broadcastState();
  });

  // 处理评分提交
  socket.on('submitScore', (data) => {
    if (socket.judgeId && competitionState.isStarted) {
      if (!competitionState.scores[data.contestantId]) {
        competitionState.scores[data.contestantId] = {};
      }
      competitionState.scores[data.contestantId][socket.judgeId] = data.score;
      broadcastState();
    }
  });

  // 处理断开连接
  socket.on('disconnect', () => {
    console.log('用户已断开:', socket.id);
    if (socket.judgeId) {
      competitionState.judges.delete(socket.id);
      io.emit('judgeUpdate', { judgesCount: competitionState.judges.size });
      broadcastState();
    }
  });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
  console.log('服务器运行在端口 ' + PORT);
}); 