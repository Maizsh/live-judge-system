const contestantsCount = 50;
const judgesCount = 30;

const scores = {};

for (let contestantId = 1; contestantId <= contestantsCount; contestantId++) {
  scores[contestantId] = {};
  for (let judgeId = 1; judgeId <= judgesCount; judgeId++) {
    // 生成0~100之间的一位小数分数
    scores[contestantId][judgeId] = +(Math.random() * 100).toFixed(1);
  }
}

console.log(JSON.stringify(scores, null, 2));