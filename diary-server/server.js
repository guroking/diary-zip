require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');

const db = require('./config/db');
const authRoutes = require('./routes/authRoutes');
const diaryRoutes = require('./routes/diaryRoutes'); 
const calendarRoutes = require('./routes/calendarRoutes');

const app = express();
app.use(helmet());
app.use(cors({ origin: 'http://localhost:5173', methods: ['POST', 'GET', 'PUT', 'DELETE'] }));
app.use(express.json());

app.use('/api/', rateLimit({ windowMs: 15 * 60 * 1000, max: 100 }));

// ----------------------------------------------------
// [핵심] 여기에 주소가 등록되어 있어야 길을 찾을 수 있습니다.
app.use('/api/auth', authRoutes);
app.use('/api/diaries', diaryRoutes);
app.use('/api/calendar', calendarRoutes);
// ----------------------------------------------------

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🚀 서버 구동 완료: http://localhost:${PORT}`);
});