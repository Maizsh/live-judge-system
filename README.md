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
