const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db');

exports.register = async (req, res) => {
    try {
        const { login_id, password } = req.body;
        if (!login_id || !password) return res.status(400).json({ error: "아이디와 비밀번호를 입력해주세요." });

        const [existing] = await db.execute('SELECT * FROM users WHERE login_id = ?', [login_id]);
        if (existing.length > 0) return res.status(409).json({ error: "이미 존재하는 아이디입니다." });

        const hashedPassword = await bcrypt.hash(password, 10);
        await db.execute('INSERT INTO users (login_id, password_hash) VALUES (?, ?)', [login_id, hashedPassword]);

        res.status(201).json({ message: "회원가입 완료!" });
    } catch (error) {
        res.status(500).json({ error: "서버 오류" });
    }
};

exports.login = async (req, res) => {
    try {
        const { login_id, password } = req.body;
        const [users] = await db.execute('SELECT * FROM users WHERE login_id = ?', [login_id]);
        
        if (users.length === 0) return res.status(401).json({ error: "정보가 잘못되었습니다." });
        
        const user = users[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        if (!isMatch) return res.status(401).json({ error: "정보가 잘못되었습니다." });

        const token = jwt.sign({ id: user.id, login_id: user.login_id }, process.env.JWT_SECRET, { expiresIn: '7d' });
        res.status(200).json({ message: "로그인 성공!", token, user: { id: user.id, login_id: user.login_id } });
    } catch (error) {
        res.status(500).json({ error: "서버 오류" });
    }
};