/**
 * ClientEngine.js - GitHub Pages 전용 클라이언트 단독(Standalone) 엔진
 * 백엔드 서버 없이도 브라우저 localStorage와 인메모리를 통해
 * 100% 동일한 점령, 보호막, 공격, 공감, 50자 문구 룰을 실행합니다.
 */

class ClientStandaloneEngine {
  constructor() {
    this.storageKey = 'stationland_standalone_stations';
    this.cooldownKey = 'stationland_standalone_cooldowns';
    this.stations = this.loadStations();
    this.cooldowns = this.loadCooldowns();
    this.startTick();
  }

  loadStations() {
    try {
      const raw = localStorage.getItem(this.storageKey);
      if (raw) return JSON.parse(raw);
    } catch (e) {}

    // 초기 빈 역 생성
    const { LINES, STATIONS, GAME_RULES } = window.SUBWAY_DATA;
    const stations = {};
    for (const st of STATIONS) {
      const lineInfo = LINES[st.line];
      const directions = lineInfo ? lineInfo.directions : ['상행', '하행'];
      stations[st.id] = {
        id: st.id,
        name: st.name,
        line: st.line,
        crowded: !!st.crowded,
        transfers: st.transfers,
        directions: {}
      };
      for (let dirIdx = 0; dirIdx < directions.length; dirIdx++) {
        stations[st.id].directions[dirIdx] = {
          dirName: directions[dirIdx],
          mainSlot: this.createEmptySlot('main'),
          subSlots: Array.from({ length: GAME_RULES.SUB_SLOT_COUNT }, () => this.createEmptySlot('sub')),
          factionPoints: {}
        };
      }
    }

    // 기본 시연용 활성화 역 샘플 2개 등록 (강남역, 홍대입구역)
    const now = Date.now();
    if (stations['222'] && stations['222'].directions[0]) {
      stations['222'].directions[0].mainSlot = {
        type: 'main',
        owner: { uuid: 'sample-1', nickname: '강남소금빵집', factionId: 'line2_crew' },
        title: '🥐 강남역 4번출구 소금빵 1+1',
        body: '오늘 저녁 8시까지 매장 카운터에 이 화면을 보여주시면 즉시 증정!',
        subText: '',
        claimedAt: now - (5 * 60 * 1000),
        protectUntil: now + (120 * 1000),
        expiresAt: now + (10 * 60 * 1000),
        shield: 80,
        likes: 12,
        goldenTime: false,
        goldenTimeUntil: 0
      };
    }
    return stations;
  }

  loadCooldowns() {
    try {
      const raw = localStorage.getItem(this.cooldownKey);
      if (raw) return JSON.parse(raw);
    } catch (e) {}
    return {};
  }

  save() {
    try {
      localStorage.setItem(this.storageKey, JSON.stringify(this.stations));
      localStorage.setItem(this.cooldownKey, JSON.stringify(this.cooldowns));
    } catch (e) {}
  }

  createEmptySlot(type = 'main') {
    return {
      type,
      owner: null,
      title: '',
      body: '',
      subText: '',
      claimedAt: 0,
      protectUntil: 0,
      expiresAt: 0,
      shield: 0,
      likes: 0,
      goldenTime: false,
      goldenTimeUntil: 0
    };
  }

  startTick() {
    setInterval(() => {
      const now = Date.now();
      let changed = false;
      const { GAME_RULES } = window.SUBWAY_DATA;

      for (const st of Object.values(this.stations)) {
        for (const dir of Object.values(st.directions)) {
          const main = dir.mainSlot;
          if (main && main.owner) {
            // 골든타임 검사
            if (!main.goldenTime && (now - main.claimedAt >= GAME_RULES.GOLDEN_TIME_TRIGGER_SEC * 1000)) {
              main.goldenTime = true;
              main.goldenTimeUntil = now + (GAME_RULES.GOLDEN_TIME_DURATION_SEC * 1000);
              main.expiresAt = main.goldenTimeUntil;
              changed = true;
            }
            // 방전 검사
            if (main.goldenTime && now >= main.goldenTimeUntil) {
              const cdKey = `${main.owner.uuid}_${st.id}`;
              this.cooldowns[cdKey] = now + (GAME_RULES.OVERHEAT_COOLDOWN_SEC * 1000);
              dir.mainSlot = this.createEmptySlot('main');
              changed = true;
            } else if (!main.goldenTime && now >= main.expiresAt) {
              dir.mainSlot = this.createEmptySlot('main');
              changed = true;
            }
          }
          // 서브 검사
          for (let i = 0; i < dir.subSlots.length; i++) {
            if (dir.subSlots[i].owner && now >= dir.subSlots[i].expiresAt) {
              dir.subSlots[i] = this.createEmptySlot('sub');
              changed = true;
            }
          }
        }
      }
      if (changed) this.save();
    }, 1000);
  }

  getSnapshot() {
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
        let dominantFaction = null;
        let maxPts = 0;
        for (const [fId, pts] of Object.entries(dir.factionPoints || {})) {
          if (pts > maxPts) {
            maxPts = pts;
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

    return {
      timestamp: now,
      factions: window.SUBWAY_DATA.FACTIONS,
      stations: stationsSummary
    };
  }

  claimMainSlot(stationId, dirIdx, user, title, body) {
    const st = this.stations[stationId];
    if (!st || !st.directions[dirIdx]) return { success: false, message: '역을 찾을 수 없습니다.' };
    const dir = st.directions[dirIdx];
    const main = dir.mainSlot;
    const now = Date.now();
    const { GAME_RULES } = window.SUBWAY_DATA;

    if (main.owner && now < main.protectUntil) {
      return { success: false, message: `보호막 작동 중 (${Math.ceil((main.protectUntil - now)/1000)}초 남음)` };
    }
    if (main.owner && main.goldenTime && now < main.goldenTimeUntil) {
      return { success: false, message: '골든타임 무적 상태입니다.' };
    }
    if (main.owner && main.shield > 0) {
      return { success: false, message: `방어막(${main.shield})을 먼저 소진시켜야 합니다.` };
    }

    let protectSec = GAME_RULES.PROTECT_DURATION_SEC;
    if (dir.factionPoints[user.factionId]) protectSec = Math.floor(protectSec * 1.5);

    dir.mainSlot = {
      type: 'main',
      owner: { uuid: user.uuid, nickname: user.nickname, factionId: user.factionId },
      title: title.slice(0, GAME_RULES.MAX_TITLE_LEN),
      body: body.slice(0, GAME_RULES.MAX_BODY_LEN),
      subText: '',
      claimedAt: now,
      protectUntil: now + (protectSec * 1000),
      expiresAt: now + (protectSec * 1000) + (10 * 60 * 1000),
      shield: GAME_RULES.INITIAL_SHIELD,
      likes: 0,
      goldenTime: false,
      goldenTimeUntil: 0
    };
    dir.factionPoints[user.factionId] = (dir.factionPoints[user.factionId] || 0) + 10;
    this.save();
    return { success: true, message: '메인 전광판 점령 성공!' };
  }

  claimSubSlot(stationId, dirIdx, user, subText) {
    const st = this.stations[stationId];
    if (!st || !st.directions[dirIdx]) return { success: false, message: '역을 찾을 수 없습니다.' };
    const dir = st.directions[dirIdx];
    const now = Date.now();
    const { GAME_RULES } = window.SUBWAY_DATA;

    dir.subSlots.pop();
    dir.subSlots.unshift({
      type: 'sub',
      owner: { uuid: user.uuid, nickname: user.nickname, factionId: user.factionId },
      title: '',
      body: '',
      subText: subText.slice(0, GAME_RULES.MAX_SUB_LEN),
      claimedAt: now,
      protectUntil: 0,
      expiresAt: now + (15 * 60 * 1000),
      shield: 0,
      likes: 0,
      goldenTime: false,
      goldenTimeUntil: 0
    });
    dir.factionPoints[user.factionId] = (dir.factionPoints[user.factionId] || 0) + 3;
    this.save();
    return { success: true, message: '서브 전광판 등록 성공!' };
  }

  attackSlot(stationId, dirIdx, user) {
    const st = this.stations[stationId];
    if (!st || !st.directions[dirIdx]) return { success: false, message: '역을 찾을 수 없습니다.' };
    const main = st.directions[dirIdx].mainSlot;
    if (!main.owner) return { success: false, message: '빈 역입니다. 바로 점령하세요!' };
    if (main.goldenTime) return { success: false, message: '골든타임 무적 상태입니다.' };

    const { GAME_RULES } = window.SUBWAY_DATA;
    main.shield = Math.max(0, main.shield - GAME_RULES.ATTACK_DAMAGE);
    this.save();
    return { success: true, shield: main.shield, message: `공격 성공! 현재 방어막: ${main.shield}` };
  }

  likeSlot(stationId, dirIdx) {
    const st = this.stations[stationId];
    if (!st || !st.directions[dirIdx]) return { success: false, message: '역을 찾을 수 없습니다.' };
    const main = st.directions[dirIdx].mainSlot;
    if (!main.owner) return { success: false, message: '점령자가 없는 역입니다.' };

    const { GAME_RULES } = window.SUBWAY_DATA;
    main.likes += 1;
    main.shield = Math.min(GAME_RULES.MAX_SHIELD, main.shield + GAME_RULES.LIKE_HEAL_SHIELD);
    main.expiresAt += (GAME_RULES.LIKE_EXTEND_SEC * 1000);
    this.save();
    return { success: true, likes: main.likes, shield: main.shield, message: `공감 완료! (+${GAME_RULES.LIKE_EXTEND_SEC}초 연장)` };
  }
}

window.clientEngine = new ClientStandaloneEngine();
