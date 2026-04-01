const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// 라우터 등록
const { router: authRouter } = require('./routes/auth');
const profilesRouter = require('./routes/profiles');
const keywordsRouter = require('./routes/keywords');
const { router: scansRouter } = require('./routes/scans');

app.use('/api/auth', authRouter);
app.use('/api/profiles', profilesRouter);
app.use('/api/profiles/:profileId/keywords', keywordsRouter);
app.use('/api/profiles/:profileId/scans', scansRouter);

// 전역 에러 핸들러
app.use((err, req, res, next) => {
  console.error('[server] 오류:', err);
  res.status(500).json({ error: '서버 오류가 발생했습니다.' });
});

// SPA fallback
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

app.listen(PORT, () => {
  console.log(`[랭크인] 서버 시작: http://localhost:${PORT}`);
});

// 스케줄러 시작
require('./scheduler');
