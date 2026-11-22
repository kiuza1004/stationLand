const express = require('express');
const cors = require('cors');
const path = require('path');
const config = require('./config');
const apiRoutes = require('./routes/api');

const app = express();

// 미들웨어
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 정적 파일 서빙 (PWA 프론트엔드)
app.use(express.static(path.join(__dirname, '..', 'public')));

// API 라우터
app.use('/api', apiRoutes);

// SPA 서빙 (모든 미지정 경로는 index.html)
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});

// 서버 기동
const server = app.listen(config.PORT, () => {
  console.log(`====================================================`);
  console.log(`🚇 StationLand 서버가 성공적으로 시작되었습니다!`);
  console.log(`🔗 로컬 주소: http://localhost:${config.PORT}`);
  console.log(`⚡ 비용 0원 & 인메모리 + 원자적 백업 엔진 가동 중`);
  console.log(`====================================================`);
});

module.exports = app;
