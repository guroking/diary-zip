const express = require('express');
const cors = require('cors');
const crypto = require('crypto');
const pool = require('./config/db');
const OpenAI = require('openai');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

const app = express();
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// OpenAI 클라이언트
const openai = new OpenAI({
    apiKey: process.env.OPENAI_API_KEY || ''
});

// Google Gemini 클라이언트
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');

// --- 3단계 AI 분석 및 Fallback 엔진 ---
async function analyzeDiary(content, userEmoji, userScore) {
    const prompt = `
당신은 일기 분석 전문 AI 심리 카운슬러입니다.
사용자가 작성한 일기와 스스로 매긴 점수를 바탕으로, 비관하지 않도록 따뜻하고 객관적인 피드백을 제공하세요.

- 이모지: ${userEmoji}
- 점수: ${userScore}점
- 일기 본문:
"""
${content}
"""

반드시 아래 JSON 포맷으로만 응답하세요:
{
  "title": "일기 제목 (15자 이내)",
  "one_line_summary": "명확한 1줄 요약",
  "three_line_summary": ["요약1", "요약2", "요약3"],
  "ai_emoji": "😊",
  "ai_score": 85,
  "ai_comment": "위로와 격려의 다정한 코멘트 (3문장)",
  "gratitude": "본문에서 찾은 감사한 일",
  "reflection": "건강한 성찰 포인트",
  "reminders": ["내일 할 일 1", "내일 할 일 2"]
}
`.trim();

    // 1단계: OpenAI (ChatGPT) 시도
    if (process.env.OPENAI_API_KEY) {
        try {
            console.log('🤖 [1순위] OpenAI API 호출 시도...');
            const response = await openai.chat.completions.create({
                model: "gpt-4o-mini",
                messages: [{ role: "user", content: prompt }],
                response_format: { type: "json_object" },
                timeout: 10000
            });
            const parsed = JSON.parse(response.choices[0].message.content);
            return {
                result: parsed,
                provider: 'openai',
                ai_connection_failed: false
            };
        } catch (openaiErr) {
            console.warn('⚠️ OpenAI 호출 실패 (토큰 소진/할당량 초과 등):', openaiErr.message);
            console.log('🔄 [2순위] Google Gemini API 백업 호출 전환...');
        }
    }

    // 2단계: Google Gemini 백업 시도
    if (process.env.GEMINI_API_KEY) {
        try {
            const geminiModel = genAI.getGenerativeModel({
                model: process.env.GEMINI_MODEL || "gemini-2.5-flash",
                generationConfig: {
                    responseMimeType: "application/json",
                    temperature: 0.7
                }
            });
            const geminiRes = await geminiModel.generateContent(prompt);
            let rawText = geminiRes.response.text().trim();
            rawText = rawText.replace(/^```json\s*/i, '').replace(/^```\s*/i, '').replace(/\s*```$/, '');
            const parsed = JSON.parse(rawText);
            return {
                result: parsed,
                provider: 'gemini',
                ai_connection_failed: false
            };
        } catch (geminiErr) {
            console.warn('⚠️ Gemini 백업 호출 실패:', geminiErr.message);
        }
    }

    // 3단계: 두 AI 모두 실패 시 로컬 Fallback 요약
    console.warn('🚨 모든 AI 호출 실패, 로컬 분석 모드로 fallback');
    const sentences = content.split(/[.\n!?]/).map(s => s.trim()).filter(s => s.length > 5);
    const threeLines = sentences.length >= 3
        ? [sentences[0], sentences[Math.floor(sentences.length / 2)], sentences[sentences.length - 1]]
        : [content.slice(0, 30), "하루를 솔직하게 돌아본 기록입니다.", "내일을 위한 휴식을 취해보세요."];

    return {
        result: {
            title: sentences[0] ? `${sentences[0].slice(0, 15)}...` : "오늘의 기록",
            one_line_summary: threeLines[0],
            three_line_summary: threeLines.slice(0, 3),
            ai_emoji: userEmoji,
            ai_score: userScore,
            ai_comment: "네트워크 또는 AI 서비스 점검 중으로 로컬 분석이 적용되었습니다. 오늘 하루도 고생 많으셨습니다.",
            gratitude: "오늘 하루를 차분히 기록한 나 자신",
            reflection: "편안한 마음으로 하루 마무리하기",
            reminders: ["충분한 수면 취하기", "내일 가벼운 스트레칭하기"]
        },
        provider: 'local',
        ai_connection_failed: true
    };
}

// 일기 저장 API 엔드포인트
app.post('/api/diaries', async (req, res) => {
    try {
        const { content, user_emoji, user_score, is_locked } = req.body;
        const authHeader = req.headers.authorization;
        const userId = authHeader ? authHeader.split(' ')[1] : '1';

        const { result: aiResult, provider, ai_connection_failed } = await analyzeDiary(content, user_emoji, Number(user_score));

        // DB 저장 (diaries 테이블)
        await pool.query(
            `INSERT INTO diaries (user_id, content, user_emoji, user_score, is_locked, ai_emoji, ai_score, ai_result)
             VALUES ($1, $2, $3, $4, $5, $6, $7, $8)`,
            [userId, content, user_emoji, user_score, is_locked || false, aiResult.ai_emoji, aiResult.ai_score, JSON.stringify(aiResult)]
        );

        res.status(201).json({
            ai_result: aiResult,
            provider,
            ai_connection_failed
        });
    } catch (err) {
        console.error('일기 저장 실패:', err);
        res.status(500).json({ error: '일기 저장 실패' });
    }
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`🚀 Server running on port ${PORT}`));
