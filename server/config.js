const path = require('path');

module.exports = {
  PORT: process.env.PORT || 3000,
  DATA_DIR: path.join(__dirname, '..', 'data'),
  BACKUP_FILE: path.join(__dirname, '..', 'data', 'station_state.json'),
  TEMP_BACKUP_FILE: path.join(__dirname, '..', 'data', 'station_state.tmp.json'),
  
  // 백업 및 스냅샷 주기
  BACKUP_INTERVAL_MS: 60 * 1000, // 1분 주기 파일 백업
  SNAPSHOT_CACHE_MS: 10 * 1000,  // 10초 스냅샷 메모리 캐시 (1만명 조회 부하 방지)

  // 게임 코어 룰
  GAME_RULES: {
    PROTECT_DURATION_SEC: 180,           // 3분 절대 보호막 (초)
    INITIAL_SHIELD: 100,                 // 초기 방어막 내구도
    ATTACK_DAMAGE: 20,                   // 타 유저 미션 성공 시 방어막 깎기 데미지
    LIKE_EXTEND_SEC: 15,                 // 공감 시 점령 시간 +15초
    LIKE_HEAL_SHIELD: 15,                // 공감 시 방어막 +15 수리
    MAX_SHIELD: 150,                     // 최대 방어막 한계
    GOLDEN_TIME_TRIGGER_SEC: 30 * 60,    // 30분 연속 유지 시 골든타임
    GOLDEN_TIME_DURATION_SEC: 15 * 60,   // 15분 골든타임 (절대 무적)
    OVERHEAT_COOLDOWN_SEC: 2 * 60 * 60,  // 방전 후 2시간 재점령 금지

    // 글자 수 제한
    MAX_TITLE_LEN: 15,                   // 메인 헤드라인 15자
    MAX_BODY_LEN: 35,                    // 메인 상세 본문 35자 (합산 50자)
    MAX_SUB_LEN: 25,                     // 서브 슬롯 25자
    SUB_SLOT_COUNT: 3,                   // 역당 서브 슬롯 개수

    // 포인트
    REWARD_POINTS_CLAIM: 50,             // 점령 성공 포인트
    REWARD_POINTS_ATTACK: 25,            // 보호막 공격 성공 포인트
    REWARD_POINTS_LIKE: 5,               // 공감 누를 때 포인트
    BOOST_COST_POINTS: 100               // 방어막 강화 아이템 포인트 비용
  },

  // HMAC 위변조 방지 시크릿
  TOKEN_SECRET: process.env.TOKEN_SECRET || 'stationland-zero-cost-secret-key-2026'
};
