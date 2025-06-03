const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"],
    credentials: true,
    transports: ['websocket', 'polling']
  },
  allowEIO3: true
});
const cors = require('cors');
const XLSX = require('xlsx');
const path = require('path');

// 配置 CORS
app.use(cors({
  origin: '*',
  methods: ['GET', 'POST'],
  credentials: true
}));

// 配置安全headers
app.use((req, res, next) => {
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, POST');
  res.header('Access-Control-Allow-Headers', 'Content-Type');
  next();
});

// 静态文件托管
app.use(express.static(path.join(__dirname, 'client/dist')));

// 所有其他请求都返回 index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'client/dist/index.html'));
});

// 存储比赛状态
const competitionState = {
  isStarted: false,
  judgesCount: 0,
  contestantsCount: 0,
  currentContestant: 1,
  judges: new Map(), // 使用 Map 存储评委编号和 socket.id 的映射
  scores: {}, // 存储格式：{ contestantId: { judgeId: { score: number, approved: boolean } } }
  contestants: [],
  showRanking: false, // 添加排名显示状态
  allowScoreEdit: true, // 新增：是否允许评委修改分数
  importedJudgeNames: []
};

// 广播比赛状态给所有客户端
function broadcastState() {
  const occupiedJudges = Array.from(competitionState.judges.keys());
  console.log('广播状态 - 当前评委:', occupiedJudges);
  io.emit('syncState', {
    isStarted: competitionState.isStarted,
    judgesCount: competitionState.judgesCount,
    contestantsCount: competitionState.contestantsCount,
    currentContestant: competitionState.currentContestant,
    judges: occupiedJudges,
    scores: competitionState.scores,
    contestants: competitionState.contestants,
    showRanking: competitionState.showRanking, // 添加排名显示状态
    allowScoreEdit: competitionState.allowScoreEdit, // 新增
    importedJudgeNames: competitionState.importedJudgeNames
  });
}

io.on('connection', (socket) => {
  console.log('用户已连接:', socket.id);

  // 立即发送当前比赛状态给新连接的客户端
  const occupiedJudges = Array.from(competitionState.judges.keys());
  socket.emit('syncState', {
    isStarted: competitionState.isStarted,
    judgesCount: competitionState.judgesCount,
    contestantsCount: competitionState.contestantsCount,
    currentContestant: competitionState.currentContestant,
    judges: occupiedJudges,
    scores: competitionState.scores,
    contestants: competitionState.contestants,
    showRanking: competitionState.showRanking, // 添加排名显示状态
    allowScoreEdit: competitionState.allowScoreEdit, // 新增
    importedJudgeNames: competitionState.importedJudgeNames
  });

  // 处理评委登录
  socket.on('judgeLogin', (data) => {
    const judgeNumber = data.judgeNumber;
    console.log(`评委 ${judgeNumber} 尝试登录`);
    
    // 检查评委编号是否已被占用
    if (competitionState.judges.has(judgeNumber)) {
      console.log(`评委 ${judgeNumber} 登录失败：编号已被占用`);
      socket.emit('loginFailed', { message: '该评委编号已被占用' });
      return;
    }

    // 检查是否还有评委名额
    if (competitionState.judges.size >= competitionState.judgesCount) {
      console.log(`评委 ${judgeNumber} 登录失败：评委数量已满`);
      socket.emit('loginFailed', { message: '评委数量已满' });
      return;
    }

    // 获取评委名称（如果有导入的名单）
    let judgeName = `评委${judgeNumber}`;
    if (competitionState.importedJudgeNames && 
        competitionState.importedJudgeNames[judgeNumber - 1]) {
      judgeName = competitionState.importedJudgeNames[judgeNumber - 1];
    }

    // 记录评委信息
    competitionState.judges.set(judgeNumber, socket.id);
    socket.judgeId = judgeNumber;
    
    console.log(`评委 ${judgeNumber} 登录成功，名称：${judgeName}`);
    socket.emit('loginSuccess', { 
      judgeId: judgeNumber,
      judgeName: judgeName 
    });
    broadcastState();
  });

  // 处理评委退出
  socket.on('judgeLogout', () => {
    if (socket.judgeId) {
      console.log(`评委 ${socket.judgeId} 主动退出`);
      competitionState.judges.delete(socket.judgeId);
      socket.judgeId = null;
      broadcastState();
    }
  });

  // 处理开始比赛
  socket.on('startCompetition', (data) => {
    competitionState.isStarted = true;
    competitionState.judgesCount = data.judgesCount;
    competitionState.contestantsCount = data.contestantsCount;
    competitionState.currentContestant = 1;
    
    // 使用客户端传来的选手列表（如果有导入的名单）
    if (data.contestants && Array.isArray(data.contestants)) {
      competitionState.contestants = data.contestants;
    } else {
      competitionState.contestants = Array.from({ length: data.contestantsCount }, (_, i) => ({
        id: i + 1,
        name: '选手' + (i + 1)
      }));
    }
    
    // 保存导入的评委名单（如果有）
    if (data.importedJudgeNames && Array.isArray(data.importedJudgeNames)) {
      competitionState.importedJudgeNames = data.importedJudgeNames;
    }
    
    competitionState.showRanking = false; // 重置排名显示状态
    competitionState.allowScoreEdit = true; // 新增：每次开始比赛时允许评分
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
    competitionState.showRanking = false; // 重置排名显示状态
    competitionState.allowScoreEdit = true; // 新增：每次开始比赛时允许评分
    competitionState.importedJudgeNames = []; // 重置导入的评委名单
    broadcastState();
  });

  // 处理选手切换
  socket.on('contestantChange', (data) => {
    competitionState.currentContestant = data.contestantId;
    competitionState.allowScoreEdit = true; // 切换选手时自动开始评分
    broadcastState();
  });

  // 处理评分提交
  socket.on('submitScore', (data) => {
    if (socket.judgeId && competitionState.isStarted) {
      if (!competitionState.allowScoreEdit) {
        // 锁定后不能再修改
        if (competitionState.scores[data.contestantId] && 
            competitionState.scores[data.contestantId][socket.judgeId]?.approved) {
          socket.emit('submitFailed', { message: '主持人已锁定评分，不能再修改分数，如需请联系主持人' });
          return;
        }
      }
      if (!competitionState.scores[data.contestantId]) {
        competitionState.scores[data.contestantId] = {};
      }
      competitionState.scores[data.contestantId][socket.judgeId] = {
        score: data.score,
        approved: false // 新增：默认未审核
      };
      socket.emit('submitSuccess', { message: '打分成功，等待主持人审核' });
      broadcastState();
    }
  });

  // 处理修改评分
  socket.on('updateScore', (data) => {
    if (competitionState.scores[data.contestantId] && 
        competitionState.scores[data.contestantId][data.judgeId]) {
      competitionState.scores[data.contestantId][data.judgeId] = {
        score: data.score,
        approved: false // 修改后需要重新审核
      };
      broadcastState();
    }
  });

  // 处理删除评分
  socket.on('deleteScore', (data) => {
    if (competitionState.scores[data.contestantId] && 
        competitionState.scores[data.contestantId][data.judgeId]) {
      delete competitionState.scores[data.contestantId][data.judgeId];
      broadcastState();
    }
  });

  // 处理通过评分
  socket.on('approveScore', (data) => {
    if (competitionState.scores[data.contestantId] && 
        competitionState.scores[data.contestantId][data.judgeId]) {
      competitionState.scores[data.contestantId][data.judgeId].approved = true;
      broadcastState();
    }
  });

  // 处理排名显示切换
  socket.on('toggleRanking', (data) => {
    console.log('切换排名显示状态:', data.showRanking);
    competitionState.showRanking = data.showRanking;
    broadcastState();
  });

  // 新增：主持人停止评分
  socket.on('stopScoreEdit', () => {
    competitionState.allowScoreEdit = false;
    broadcastState();
  });

  // 新增：主持人开始评分
  socket.on('startScoreEdit', () => {
    competitionState.allowScoreEdit = true;
    broadcastState();
  });

  // 处理断开连接
  socket.on('disconnect', () => {
    console.log('用户断开连接:', socket.id);
    if (socket.judgeId) {
      // 检查是否是当前评委的 socket
      if (competitionState.judges.get(socket.judgeId) === socket.id) {
        console.log(`评委 ${socket.judgeId} 断开连接，释放编号`);
        competitionState.judges.delete(socket.judgeId);
        broadcastState();
      }
    }
  });

  // 处理 Excel 导出
  socket.on('exportExcel', (data, callback) => {
    try {
      // 创建工作簿
      const workbook = XLSX.utils.book_new();
      
      // 创建工作表
      const worksheet = XLSX.utils.aoa_to_sheet(data.data);
      
      // 设置列宽
      const colWidths = [
        { wch: 10 },  // 选手编号
        { wch: 12 },  // 选手姓名
        { wch: 10 },  // 最终得分
        { wch: 12 },  // 有效分数数量
        { wch: 8 },   // 最高分
        { wch: 8 },   // 最低分
        { wch: 50 }   // 所有评委打分
      ];
      worksheet['!cols'] = colWidths;

      // 将工作表添加到工作簿
      XLSX.utils.book_append_sheet(workbook, worksheet, '比赛成绩');

      // 生成 Excel 文件的二进制数据
      const excelBuffer = XLSX.write(workbook, { type: 'buffer', bookType: 'xlsx' });
      
      // 转换为 base64
      const base64 = excelBuffer.toString('base64');
      
      callback({ success: true, file: base64 });
    } catch (error) {
      console.error('导出 Excel 失败:', error);
      callback({ success: false, error: error.message });
    }
  });
});

const PORT = process.env.PORT || 3001;
const HOST = process.env.HOST || '0.0.0.0';

http.listen(PORT, HOST, () => {
  console.log(`服务器运行在 http://${HOST}:${PORT}`);
}); 