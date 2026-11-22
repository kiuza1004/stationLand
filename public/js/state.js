/**
 * State.js - 클라이언트 익명 유저 데이터 & 로컬 스토리지 관리
 * 무(無)로그인 & 무(無)DB 환경에서 스마트폰 로컬에 데이터 보관
 */

const STORAGE_KEY = 'stationland_user_state';

class UserStateManager {
  constructor() {
    this.state = this.loadState();
    this.ensureAuthToken();
  }

  // 기본 상태 생성
  getDefaultState() {
    const randomSuffix = Math.floor(1000 + Math.random() * 9000);
    return {
      uuid: null,
      token: null,
      nickname: `2호선통근러_${randomSuffix}`,
      factionId: 'line2_crew',
      points: 100, // 시작 기본 포인트
      presets: [
        {
          id: 'preset_1',
          title: '🥐 강남역 4번출구 소금빵 1+1',
          body: '오늘 저녁 8시까지 매장 카운터에 이 화면을 보여주시면 즉시 증정!'
        },
        {
          id: 'preset_2',
          title: '💻 직장인 여러분 칼퇴 화이팅',
          body: '오늘 하루도 수고 많으셨습니다. 빠른 귀가와 함께 즐거운 저녁 되세요!'
        },
        {
          id: 'preset_3',
          title: '☕ 홍대 3번출구 아메리카노 반값',
          body: '스테이션랜드 승객 전원 테이크아웃 아메리카노 50% 즉시 할인'
        }
      ],
      currentStationId: '222', // 기본 강남역
      currentLine: 'line2',
      directionIdx: 0,
      checkedInStations: []
    };
  }

  loadState() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return { ...this.getDefaultState(), ...JSON.parse(raw) };
      }
    } catch (e) {
      console.warn('로컬 상태 로드 실패:', e);
    }
    return this.getDefaultState();
  }

  save() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(this.state));
    } catch (e) {
      console.error('로컬 상태 저장 실패:', e);
    }
  }

  // 서버로부터 보안 인증 토큰 발급받기
  async ensureAuthToken() {
    if (!this.state.uuid || !this.state.token) {
      try {
        const res = await fetch('/api/auth/token', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ uuid: this.state.uuid })
        });
        const data = await res.json();
        if (data.success) {
          this.state.uuid = data.uuid;
          this.state.token = data.token;
          this.save();
        }
      } catch (err) {
        console.error('토큰 발급 실패:', err);
      }
    }
  }

  get user() {
    return this.state;
  }

  setNickname(name) {
    this.state.nickname = name.trim().slice(0, 10);
    this.save();
  }

  setFaction(factionId) {
    this.state.factionId = factionId;
    this.save();
  }

  addPoints(pts) {
    this.state.points = Math.max(0, (this.state.points || 0) + pts);
    this.save();
  }

  deductPoints(pts) {
    if ((this.state.points || 0) >= pts) {
      this.state.points -= pts;
      this.save();
      return true;
    }
    return false;
  }

  addPreset(title, body) {
    this.state.presets.push({
      id: 'preset_' + Date.now(),
      title: title.slice(0, 15),
      body: body.slice(0, 35)
    });
    this.save();
  }

  removePreset(id) {
    this.state.presets = this.state.presets.filter(p => p.id !== id);
    this.save();
  }

  // 복구 코드 생성 (내보내기)
  async exportBackupCode() {
    try {
      const res = await fetch('/api/user/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uuid: this.state.uuid,
          token: this.state.token,
          userData: {
            nickname: this.state.nickname,
            factionId: this.state.factionId,
            points: this.state.points,
            presets: this.state.presets
          }
        })
      });
      const data = await res.json();
      return data.backupCode;
    } catch (err) {
      throw new Error('복구 코드 생성 실패');
    }
  }

  // 복구 코드 가져오기 (불러오기)
  async importBackupCode(backupCode) {
    try {
      const res = await fetch('/api/user/import', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ backupCode })
      });
      const data = await res.json();
      if (data.success) {
        this.state.uuid = data.uuid;
        this.state.token = data.token;
        if (data.userData) {
          this.state.nickname = data.userData.nickname || this.state.nickname;
          this.state.factionId = data.userData.factionId || this.state.factionId;
          this.state.points = data.userData.points || this.state.points;
          this.state.presets = data.userData.presets || this.state.presets;
        }
        this.save();
        return true;
      }
    } catch (err) {
      throw new Error('복구 코드 복원 실패');
    }
    return false;
  }
}

const userState = new UserStateManager();
