const express = require('express');
const router = express.Router();
const crypto = require('crypto');
const config = require('../config');
const stateManager = require('../stateManager');
const { LINES, STATIONS, FACTIONS } = require('../subwayData');

// 익명 사용자 HMAC 서명 생성 및 검증 함수
function signUuid(uuid) {
  return crypto.createHmac('sha256', config.TOKEN_SECRET).update(uuid).digest('hex');
}

function verifyToken(uuid, token) {
  if (!uuid || !token) return false;
  const expected = signUuid(uuid);
  return crypto.timingSafeEqual(Buffer.from(token), Buffer.from(expected));
}

// 1. 익명 토큰 발급
router.post('/auth/token', (req, res) => {
  const uuid = req.body.uuid || crypto.randomUUID();
  const token = signUuid(uuid);
  res.json({ success: true, uuid, token });
});

// 2. 전체 노선 및 역 스냅샷 조회 (10초 캐시 헤더)
router.get('/stations/snapshot', (req, res) => {
  res.setHeader('Cache-Control', 'public, max-age=10');
  const snapshot = stateManager.getSnapshot();
  res.json(snapshot);
});

// 3. 노선 및 진영 메타데이터
router.get('/meta', (req, res) => {
  res.json({
    lines: LINES,
    factions: FACTIONS,
    rules: config.GAME_RULES
  });
});

// 4. 역 체크인 (2개 역 이상 이동 확인 및 시크릿 창 어뷰징 방지)
router.post('/stations/checkin', (req, res) => {
  const { uuid, token, stationId } = req.body;
  if (!verifyToken(uuid, token)) {
    return res.status(401).json({ success: false, message: '유효하지 않은 보안 토큰입니다.' });
  }

  const hasTraveled = stateManager.recordCheckin(uuid, stationId);
  res.json({
    success: true,
    hasTraveled,
    message: hasTraveled ? '체크인 완료! 점령/공격 미션 참여가 가능합니다.' : '첫 번째 역 체크인 완료! 다음 역 도착 후 이동 인증이 활성화됩니다.'
  });
});

// 5. 메인 전광판 점령 (50자: 제목 15자 + 본문 35자)
router.post('/stations/claim/main', (req, res) => {
  const { uuid, token, nickname, factionId, stationId, directionIdx, title, body } = req.body;
  if (!verifyToken(uuid, token)) {
    return res.status(401).json({ success: false, message: '유효하지 않은 인증 토큰입니다.' });
  }

  const cleanTitle = (title || '').trim().slice(0, config.GAME_RULES.MAX_TITLE_LEN);
  const cleanBody = (body || '').trim().slice(0, config.GAME_RULES.MAX_BODY_LEN);

  if (!cleanTitle && !cleanBody) {
    return res.status(400).json({ success: false, message: '전광판에 띄울 문구를 1자 이상 입력하세요.' });
  }

  const user = {
    uuid,
    nickname: (nickname || '익명 승객').slice(0, 10),
    factionId: factionId || 'line2_crew'
  };

  const result = stateManager.claimMainSlot(stationId, directionIdx || 0, user, cleanTitle, cleanBody);
  res.json(result);
});

// 6. 서브 전광판 롤링 등록 (25자)
router.post('/stations/claim/sub', (req, res) => {
  const { uuid, token, nickname, factionId, stationId, directionIdx, subText } = req.body;
  if (!verifyToken(uuid, token)) {
    return res.status(401).json({ success: false, message: '유효하지 않은 인증 토큰입니다.' });
  }

  const cleanSubText = (subText || '').trim().slice(0, config.GAME_RULES.MAX_SUB_LEN);
  if (!cleanSubText) {
    return res.status(400).json({ success: false, message: '서브 슬롯 문구를 입력하세요.' });
  }

  const user = {
    uuid,
    nickname: (nickname || '익명 승객').slice(0, 10),
    factionId: factionId || 'line2_crew'
  };

  const result = stateManager.claimSubSlot(stationId, directionIdx || 0, user, cleanSubText);
  res.json(result);
});

// 7. 보호 중인 메인 전광판 공격 (방어막 깎기)
router.post('/stations/attack', (req, res) => {
  const { uuid, token, nickname, factionId, stationId, directionIdx } = req.body;
  if (!verifyToken(uuid, token)) {
    return res.status(401).json({ success: false, message: '유효하지 않은 인증 토큰입니다.' });
  }

  const user = {
    uuid,
    nickname: (nickname || '공격 승객').slice(0, 10),
    factionId: factionId || 'line2_crew'
  };

  const result = stateManager.attackMainSlot(stationId, directionIdx || 0, user);
  res.json(result);
});

// 8. 공감(좋아요) 클릭
router.post('/stations/like', (req, res) => {
  const { uuid, token, stationId, directionIdx } = req.body;
  if (!verifyToken(uuid, token)) {
    return res.status(401).json({ success: false, message: '유효하지 않은 인증 토큰입니다.' });
  }

  const result = stateManager.likeMainSlot(stationId, directionIdx || 0, uuid);
  res.json(result);
});

// 9. 사용자 데이터 암호화 복구 코드 생성 (내보내기)
router.post('/user/export', (req, res) => {
  const { uuid, token, userData } = req.body;
  if (!verifyToken(uuid, token)) {
    return res.status(401).json({ success: false, message: '인증 실패' });
  }

  const payload = JSON.stringify({
    uuid,
    userData: userData || {},
    exportedAt: Date.now()
  });

  const cipher = crypto.createCipheriv('aes-256-cbc', Buffer.from(config.TOKEN_SECRET.padEnd(32).slice(0, 32)), Buffer.alloc(16, 0));
  let encrypted = cipher.update(payload, 'utf8', 'base64');
  encrypted += cipher.final('base64');

  res.json({ success: true, backupCode: encrypted });
});

// 10. 복구 코드로 데이터 불러오기 (가져오기)
router.post('/user/import', (req, res) => {
  const { backupCode } = req.body;
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', Buffer.from(config.TOKEN_SECRET.padEnd(32).slice(0, 32)), Buffer.alloc(16, 0));
    let decrypted = decipher.update(backupCode, 'base64', 'utf8');
    decrypted += decipher.final('utf8');

    const data = JSON.parse(decrypted);
    const token = signUuid(data.uuid);
    res.json({ success: true, uuid: data.uuid, token, userData: data.userData });
  } catch (err) {
    res.status(400).json({ success: false, message: '유효하지 않은 복구 코드입니다.' });
  }
});

module.exports = router;
