const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

// 회원가입
exports.register = async (req, res) => {
    try {
        const { login_id, password } = req.body;
        if (!login_id || !password) {
            return res.status(400).json({ error: "아이디와 비밀번호를 입력해주세요." });
        }

        // 아이디 중복 확인 ($1 사용)
        const [existing] = await db.execute('SELECT * FROM users WHERE login_id = $1', [login_id]);
        if (existing.length > 0) {
            return res.status(400).json({ error: "이미 존재하는 아이디입니다." });
        }

        const hashedPassword = await bcrypt.hash(password, 10);

        // 유저 생성 ($1, $2 사용)
        await db.execute(
            'INSERT INTO users (login_id, password) VALUES ($1, $2)',
            [login_id, hashedPassword]
        );

        res.status(201).json({ message: "회원가입이 완료되었습니다." });
    } catch (error) {
        console.error("Register Error:", error);
        res.status(500).json({ error: "회원가입 중 오류가 발생했습니다." });
    }
};

// 로그인
exports.login = async (req, res) => {
    try {
        const { login_id, password } = req.body;
        
        const [rows] = await db.execute('SELECT * FROM users WHERE login_id = $1', [login_id]);
        if (rows.length === 0) {
            return res.status(401).json({ error: "존재하지 않는 아이디입니다." });
        }

        const user = rows[0];
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) {
            return res.status(401).json({ error: "비밀번호가 일치하지 않습니다." });
        }

        const token = jwt.sign({ id: user.id, login_id: user.login_id }, process.env.JWT_SECRET, { expiresIn: '7d' });

        res.status(200).json({ message: "로그인 성공", token });
    } catch (error) {
        console.error("Login Error:", error);
        res.status(500).json({ error: "로그인 중 오류가 발생했습니다." });
    }
};