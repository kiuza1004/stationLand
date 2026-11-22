const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
const config = require('./config');
const { LINES, STATIONS, FACTIONS } = require('./subwayData');

class StateManager {
  constructor() {
    this.stations = {};            // stationId -> direction -> { main: {}, subs: [], factionPoints: {} }
    this.factionDominance = {};    // stationId -> factionId
    this.cooldowns = {};           // `${uuid}_${stationId}` -> timestamp (과열 쿨타임)
    this.userRecentLikes = {};     // `${uuid}_${slotKey}` -> timestamp (공감 어뷰징 방지)
    this.userCheckins = {};        // uuid -> [stationIds] (2개 역 이동 인증용)
    
    // 캐싱된 스냅샷 데이터
    this.cachedSnapshot = null;
    this.lastSnapshotTime = 0;
    this.isDirty = false;

    this.initStations();
    this.loadBackup();
    this.startBackupTimer();
    this.startTickTimer();
  }

  // 역 및 슬롯 초기화
  initStations() {
    for (const station of STATIONS) {
      const lineInfo = LINES[station.line];
      const directions = lineInfo ? lineInfo.directions : ['상행', '하행'];

      this.stations[station.id] = {
        id: station.id,
        name: station.name,
        line: station.line,
        crowded: !!station.crowded,
        transfers: station.transfers,
        directions: {}
      };

      for (let dirIdx = 0; dirIdx < directions.length; dirIdx++) {
        const dirName = directions[dirIdx];
        this.stations[station.id].directions[dirIdx] = {
          dirName,
          mainSlot: this.createEmptySlot('main'),
          subSlots: Array.from({ length: config.GAME_RULES.SUB_SLOT_COUNT }, () => this.createEmptySlot('sub')),
          factionPoints: {}
        };
      }
    }
  }

  createEmptySlot(type = 'main') {
    return {
      type,
      owner: null,          // { uuid, nickname, factionId }
      title: '',            // 메인 헤드라인 15자
      body: '',             // 메인 본문 35자
      subText: '',          // 서브 슬롯 25자
      claimedAt: 0,
      protectUntil: 0,      // 기본 3분 절대 보호막 만료 시각
      expiresAt: 0,         // 점령 만료 시각
      shield: 0,            // 현재 방어막 (0~150)
      likes: 0,
      goldenTime: false,
      goldenTimeUntil: 0,
      consecutiveClaimMs: 0 // 연속 점령 누적 시간
    };
  }

  // 백업 불러오기 (부팅 시 복구)
  loadBackup() {
    try {
      if (fs.existsSync(config.BACKUP_FILE)) {
        const raw = fs.readFileSync(config.BACKUP_FILE, 'utf-8');
        const data = JSON.parse(raw);
        if (data.stations) {
          const now = Date.now();
          // 불러온 데이터 병합 및 시간 만료 처리
          for (const [stId, stData] of Object.entries(data.stations)) {
            if (!this.stations[stId]) continue;
            for (const [dirIdx, dirData] of Object.entries(stData.directions || {})) {
              if (!this.stations[stId].directions[dirIdx]) continue;
              
              const targetDir = this.stations[stId].directions[dirIdx];
              // 메인 슬롯 복원
              if (dirData.mainSlot && dirData.mainSlot.owner) {
                if (dirData.mainSlot.expiresAt > now) {
                  targetDir.mainSlot = dirData.mainSlot;
                }
              }
              // 서브 슬롯 복원
              if (Array.isArray(dirData.subSlots)) {
                targetDir.subSlots = dirData.subSlots.map(s => {
                  return (s && s.owner && s.expiresAt > now) ? s : this.createEmptySlot('sub');
                });
              }
              targetDir.factionPoints = dirData.factionPoints || {};
            }
          }
          this.cooldowns = data.cooldowns || {};
          console.log('[StateManager] 성공적으로 백업 데이터에서 상태를 복구했습니다.');
        }
      }
    } catch (err) {
      console.error('[StateManager] 백업 복구 실패 (새 상태로 시작):', err.message);
    }
    this.updateSnapshot();
  }

  // 원자적 파일 저장 (Atomic Write)
  saveBackup() {
    try {
      if (!fs.existsSync(config.DATA_DIR)) {
        fs.mkdirSync(config.DATA_DIR, { recursive: true });
      }

      const payload = {
        savedAt: Date.now(),
        stations: this.stations,
        cooldowns: this.cooldowns
      };

      // 1. 임시 파일에 쓰기
      fs.writeFileSync(config.TEMP_BACKUP_FILE, JSON.stringify(payload), 'utf-8');
      // 2. 원자적으로 교체
      fs.renameSync(config.TEMP_BACKUP_FILE, config.BACKUP_FILE);
      this.isDirty = false;
      // console.log('[StateManager] 원자적 백업 완료');
    } catch (err) {
      console.error('[StateManager] 백업 저장 에러:', err.message);
    }
  }

  startBackupTimer() {
    setInterval(() => {
      if (this.isDirty) {
        this.saveBackup();
      }
    }, config.BACKUP_INTERVAL_MS);
  }

  // 1초 단위 틱 (보호막 감소, 골든타임 계산, 만료 처리)
  startTickTimer() {
    setInterval(() => {
      const now = Date.now();
      let changed = false;

      for (const st of Object.values(this.stations)) {
        for (const dir of Object.values(st.directions)) {
          // 메인 슬롯 검사
          const main = dir.mainSlot;
          if (main && main.owner) {
            // 골든 타임 진입 검사
            const elapsedMs = now - main.claimedAt;
            if (!main.goldenTime && elapsedMs >= config.GAME_RULES.GOLDEN_TIME_TRIGGER_SEC * 1000) {
              main.goldenTime = true;
              main.goldenTimeUntil = now + (config.GAME_RULES.GOLDEN_TIME_DURATION_SEC * 1000);
              main.expiresAt = main.goldenTimeUntil;
              changed = true;
            }

            // 골든타임 종료 -> 과열 방전 및 슬롯 초기화
            if (main.goldenTime && now >= main.goldenTimeUntil) {
              // 2시간 재점령 금지 쿨타임 등록
              const cdKey = `${main.owner.uuid}_${st.id}`;
              this.cooldowns[cdKey] = now + (config.GAME_RULES.OVERHEAT_COOLDOWN_SEC * 1000);
              dir.mainSlot = this.createEmptySlot('main');
              changed = true;
            } else if (!main.goldenTime && now >= main.expiresAt) {
              // 일반 만료
              dir.mainSlot = this.createEmptySlot('main');
              changed = true;
            }
          }

          // 서브 슬롯 검사
          for (let i = 0; i < dir.subSlots.length; i++) {
            const sub = dir.subSlots[i];
            if (sub && sub.owner && now >= sub.expiresAt) {
              dir.subSlots[i] = this.createEmptySlot('sub');
              changed = true;
            }
          }
        }
      }

      // 만료된 쿨타임 정리
      for (const [key, expireTime] of Object.entries(this.cooldowns)) {
        if (now >= expireTime) {
          delete this.cooldowns[key];
        }
      }

      if (changed) {
        this.isDirty = true;
        this.cachedSnapshot = null; // 캐시 무효화
      }
    }, 1000);
  }

  // 10초 스냅샷 생성 및 캐싱 (1만 명 동시 접속 지원)
  getSnapshot() {
    const now = Date.now();
    if (this.cachedSnapshot && (now - this.lastSnapshotTime < config.SNAPSHOT_CACHE_MS)) {
      return this.cachedSnapshot;
    }
    return this.updateSnapshot();
  }

  updateSnapshot() {
    const now = Date.now();
    const stationsSummary = {};

    for (const [stId, st] of Object.entries(this.stations)) {
      stationsSummary[stId] = {
        id: st.id,
        name: st.name,
        line: st.line,
        crowded: st.crowded,
        transfers: st.transfers,
        directions: {}
      };

      for (const [dirIdx, dir] of Object.entries(st.directions)) {
        // 우세 진영 산출
        let dominantFaction = null;
        let maxPoints = 0;
        for (const [fId, pts] of Object.entries(dir.factionPoints)) {
          if (pts > maxPoints) {
            maxPoints = pts;
            dominantFaction = fId;
          }
        }

        stationsSummary[stId].directions[dirIdx] = {
          dirName: dir.dirName,
          dominantFaction,
          mainSlot: {
            hasOwner: !!dir.mainSlot.owner,
            owner: dir.mainSlot.owner ? { nickname: dir.mainSlot.owner.nickname, factionId: dir.mainSlot.owner.factionId } : null,
            title: dir.mainSlot.title,
            body: dir.mainSlot.body,
            shield: dir.mainSlot.shield,
            likes: dir.mainSlot.likes,
            isProtected: now < dir.mainSlot.protectUntil,
            isGolden: dir.mainSlot.goldenTime,
            remainingSec: Math.max(0, Math.floor((dir.mainSlot.expiresAt - now) / 1000)),
            protectRemainingSec: Math.max(0, Math.floor((dir.mainSlot.protectUntil - now) / 1000))
          },
          subSlots: dir.subSlots.map(s => ({
            hasOwner: !!s.owner,
            owner: s.owner ? { nickname: s.owner.nickname, factionId: s.owner.factionId } : null,
            subText: s.subText,
            remainingSec: Math.max(0, Math.floor((s.expiresAt - now) / 1000))
          }))
        };
      }
    }

    this.cachedSnapshot = {
      timestamp: now,
      factions: FACTIONS,
      stations: stationsSummary
    };
    this.lastSnapshotTime = now;
    return this.cachedSnapshot;
  }

  // 체크인 기록 (실제 2개 역 이동 인증 검증)
  recordCheckin(uuid, stationId) {
    if (!this.userCheckins[uuid]) {
      this.userCheckins[uuid] = [];
    }
    const history = this.userCheckins[uuid];
    if (history[history.length - 1] !== stationId) {
      history.push(stationId);
      if (history.length > 10) history.shift();
    }
    return history.length >= 2; // 2개 역 이상 이동 여부
  }

  // 쿨타임 여부 확인
  isUserInCooldown(uuid, stationId) {
    const cdKey = `${uuid}_${stationId}`;
    const cd = this.cooldowns[cdKey];
    if (cd && cd > Date.now()) {
      return Math.ceil((cd - Date.now()) / 1000); // 남은 초
    }
    return 0;
  }

  // 메인 전광판 점령 실행
  claimMainSlot(stationId, dirIdx, user, title, body) {
    const st = this.stations[stationId];
    if (!st || !st.directions[dirIdx]) {
      return { success: false, message: '유효하지 않은 역 또는 방향입니다.' };
    }

    // 쿨타임 검사
    const cdRemaining = this.isUserInCooldown(user.uuid, stationId);
    if (cdRemaining > 0) {
      return { 
        success: false, 
        message: `과열 방전 쿨타임 적용 중입니다. (${Math.ceil(cdRemaining / 60)}분 후 재점령 가능)` 
      };
    }

    const dir = st.directions[dirIdx];
    const now = Date.now();
    const main = dir.mainSlot;

    // 보호막 무적 검사
    if (main.owner && now < main.protectUntil) {
      return { 
        success: false, 
        message: `절대 보호막 작동 중입니다. 남은 시간: ${Math.ceil((main.protectUntil - now)/1000)}초 (공격 미션만 가능)` 
      };
    }

    // 골든타임 무적 검사
    if (main.owner && main.goldenTime && now < main.goldenTimeUntil) {
      return { 
        success: false, 
        message: '골든타임 무적 상태의 역입니다. 방전될 때까지 점령할 수 없습니다.' 
      };
    }

    // 방어막이 남아있는 상태에서 공격 없이 바로 뺏으려는 경우 방지
    if (main.owner && main.shield > 0) {
      return {
        success: false,
        message: `현재 주인의 방어막(${main.shield})이 남아있습니다. 먼저 공격하여 방어막을 소진시키십시오.`
      };
    }

    // 진영 보너스 (현재 역의 우세 진영과 점령자 진영이 일치하면 보호막 1.5배)
    let protectSec = config.GAME_RULES.PROTECT_DURATION_SEC;
    if (dir.factionPoints[user.factionId]) {
      protectSec = Math.floor(protectSec * 1.5);
    }

    // 신규 메인 점령 등록
    dir.mainSlot = {
      type: 'main',
      owner: { uuid: user.uuid, nickname: user.nickname, factionId: user.factionId },
      title: title.slice(0, config.GAME_RULES.MAX_TITLE_LEN),
      body: body.slice(0, config.GAME_RULES.MAX_BODY_LEN),
      subText: '',
      claimedAt: now,
      protectUntil: now + (protectSec * 1000),
      expiresAt: now + (protectSec * 1000) + (10 * 60 * 1000), // 기본 노출 약 13분
      shield: config.GAME_RULES.INITIAL_SHIELD,
      likes: 0,
      goldenTime: false,
      goldenTimeUntil: 0,
      consecutiveClaimMs: 0
    };

    // 진영 기여도 추가
    dir.factionPoints[user.factionId] = (dir.factionPoints[user.factionId] || 0) + 10;

    this.isDirty = true;
    this.cachedSnapshot = null;
    return { success: true, message: '메인 전광판 점령 성공!' };
  }

  // 서브 전광판 롤링 등록 (25자)
  claimSubSlot(stationId, dirIdx, user, subText) {
    const st = this.stations[stationId];
    if (!st || !st.directions[dirIdx]) {
      return { success: false, message: '유효하지 않은 역 또는 방향입니다.' };
    }

    const dir = st.directions[dirIdx];
    const now = Date.now();

    // 롤링 방식으로 맨 뒤 밀어내고 앞에 삽입
    dir.subSlots.pop();
    dir.subSlots.unshift({
      type: 'sub',
      owner: { uuid: user.uuid, nickname: user.nickname, factionId: user.factionId },
      title: '',
      body: '',
      subText: subText.slice(0, config.GAME_RULES.MAX_SUB_LEN),
      claimedAt: now,
      protectUntil: 0,
      expiresAt: now + (15 * 60 * 1000), // 서브 슬롯 15분 유지
      shield: 0,
      likes: 0,
      goldenTime: false,
      goldenTimeUntil: 0,
      consecutiveClaimMs: 0
    });

    dir.factionPoints[user.factionId] = (dir.factionPoints[user.factionId] || 0) + 3;

    this.isDirty = true;
    this.cachedSnapshot = null;
    return { success: true, message: '서브 전광판 등록 성공!' };
  }

  // 보호 중인 메인 전광판 공격 (방어막 깎기)
  attackMainSlot(stationId, dirIdx, user) {
    const st = this.stations[stationId];
    if (!st || !st.directions[dirIdx]) return { success: false, message: '역을 찾을 수 없습니다.' };

    const dir = st.directions[dirIdx];
    const main = dir.mainSlot;
    const now = Date.now();

    if (!main.owner) {
      return { success: false, message: '빈 전광판입니다. 바로 점령하십시오!' };
    }

    if (main.goldenTime) {
      return { success: false, message: '골든타임 절대 무적 상태로 공격이 무효화됩니다.' };
    }

    // 방어막 데미지 적용
    main.shield = Math.max(0, main.shield - config.GAME_RULES.ATTACK_DAMAGE);
    
    // 만약 방어막이 0이 되면 보호막 시간도 30초 단축
    if (main.shield === 0 && main.protectUntil > now) {
      main.protectUntil = Math.max(now, main.protectUntil - (30 * 1000));
      main.expiresAt = Math.max(now, main.expiresAt - (30 * 1000));
    }

    this.isDirty = true;
    this.cachedSnapshot = null;

    return {
      success: true,
      shield: main.shield,
      message: `공격 성공! 현재 방어막: ${main.shield}`
    };
  }

  // 공감(좋아요) 클릭 (수명 +15초, 방어막 +15 수리)
  likeMainSlot(stationId, dirIdx, uuid) {
    const st = this.stations[stationId];
    if (!st || !st.directions[dirIdx]) return { success: false, message: '역을 찾을 수 없습니다.' };

    const dir = st.directions[dirIdx];
    const main = dir.mainSlot;
    if (!main.owner) return { success: false, message: '점령자가 없는 역입니다.' };

    // 셀프 좋아요 및 단시간 연타 방지
    const likeKey = `${uuid}_${stationId}_${dirIdx}`;
    const now = Date.now();
    if (this.userRecentLikes[likeKey] && (now - this.userRecentLikes[likeKey] < 60 * 1000)) {
      return { success: false, message: '동일 전광판 공감은 1분에 1회만 가능합니다.' };
    }

    this.userRecentLikes[likeKey] = now;
    main.likes += 1;
    main.shield = Math.min(config.GAME_RULES.MAX_SHIELD, main.shield + config.GAME_RULES.LIKE_HEAL_SHIELD);
    main.expiresAt += (config.GAME_RULES.LIKE_EXTEND_SEC * 1000);

    this.isDirty = true;
    this.cachedSnapshot = null;

    return {
      success: true,
      likes: main.likes,
      shield: main.shield,
      message: `공감 완료! (+${config.GAME_RULES.LIKE_EXTEND_SEC}초 연장 및 방어막 수리)`
    };
  }
}

// 싱글톤 인스턴스
const stateManager = new StateManager();

// Graceful Shutdown 등록
function handleShutdown(signal) {
  console.log(`\n[StateManager] ${signal} 신호 수신. 종료 전 메모리 상태 저장 중...`);
  stateManager.saveBackup();
  console.log('[StateManager] 저장 완료. 프로세스를 안전하게 종료합니다.');
  process.exit(0);
}

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

module.exports = stateManager;
