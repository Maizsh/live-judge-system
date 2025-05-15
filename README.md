# 实时评分系统（Real-Time Scoring System）

一个基于 Web 的实时评分系统，适用于比赛或评选场景。评委可对多位选手进行打分，系统会自动去除最高分和最低分，计算平均得分。

## 功能特点
- 有大屏展示
- 多位评委实时打分  
- 自动去除最高分和最低分  
- 实时结果更新  
- 管理后台：支持添加/管理评委和选手  
- 导出最终结果  

## 技术栈

- 前端：Vue.js + Element UI  
- 后端：Node.js  
- 实时通信：WebSocket  
- 数据存储：**无需数据库，数据存储于内存中（服务器运行期间有效）**

## 快速开始

1. 克隆仓库  
2. 安装依赖  
3. 启动开发服务器
   
```bash
git clone https://github.com/yourusername/real-time-scoring-system.git
cd real-time-scoring-system
npm install
npm run dev
```

# Real-Time Scoring System

A web-based real-time scoring system for competitions. Judges can score multiple contestants, with automatic calculation of average scores (excluding highest and lowest).

## Features

- Realtime score input by multiple judges
- Auto exclusion of highest and lowest scores
- Live result updates
- Admin panel for managing contestants and judges
- Export final results

## Tech Stack

- Frontend: Vue.js + Element UI
- Backend: Node.js 
- Realtime: WebSocket 
- Database: No database required; data is stored in memory.

## Getting Started

1. Clone the repo
2. Install dependencies
3. Run the development server

```bash
git clone https://github.com/yourusername/real-time-scoring-system.git
cd real-time-scoring-system
npm install
npm run dev
```
