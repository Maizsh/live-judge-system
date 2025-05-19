const { io } = require('socket.io-client');

const SERVER_URL = process.env.SERVER_URL || 'http://localhost:3000';
const JUDGES_COUNT = 30;
const CONTESTANTS_COUNT = 50;

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));

async function main() {
  const socket = io(SERVER_URL, {
    transports: ['websocket', 'polling']
  });

  await new Promise(resolve => socket.on('connect', resolve));
  console.log('已连接到服务端');

  // 启动比赛
  socket.emit('startCompetition', {
    judgesCount: JUDGES_COUNT,
    contestantsCount: CONTESTANTS_COUNT
  });
  console.log('已发送开始比赛指令');
  await sleep(1000);

  // 依次为每个评委、每个选手打分
  for (let judgeId = 1; judgeId <= JUDGES_COUNT; judgeId++) {
    // 模拟评委登录
    socket.emit('judgeLogin', { judgeNumber: judgeId });
    await sleep(50); // 等待登录
    for (let contestantId = 1; contestantId <= CONTESTANTS_COUNT; contestantId++) {
      const score = +(Math.random() * 100).toFixed(1);
      socket.emit('submitScore', {
        contestantId,
        judgeId,
        score
      });
      await sleep(2); // 避免过快
    }
    // 模拟评委退出
    socket.emit('judgeLogout');
    await sleep(10);
    console.log(`评委${judgeId}打分完成`);
  }

  console.log('所有模拟数据注入完成');
  socket.disconnect();
}

main().catch(err => {
  console.error('注入失败:', err);
  process.exit(1);
}); 