/**
 * StationLand 시스템 자동 검증 테스트 스위트
 */

const assert = require('assert');
const path = require('path');
const fs = require('fs');

async function runTests() {
  console.log('🚀 [StationLand] 시스템 종합 검증을 시작합니다...\n');

  // 1. 모듈 및 설정 로드 검증
  console.log('1. 모듈 로드 검증...');
  const config = require('../server/config');
  const stateManager = require('../server/stateManager');
  const { LINES, STATIONS, FACTIONS } = require('../server/subwayData');
  assert(STATIONS.length > 30, '서울 지하철 역 데이터가 30개 이상이어야 합니다.');
  assert(Object.keys(LINES).length >= 7, '노선 데이터가 7개 이상이어야 합니다.');
  console.log('  ✓ 모듈 및 지하철 데이터 로드 성공');

  // 2. 인메모리 스냅샷 캐싱 검증
  console.log('2. 인메모리 스냅샷 캐싱 검증...');
  const snapshot1 = stateManager.getSnapshot();
  assert(snapshot1 && snapshot1.stations, '스냅샷 객체가 생성되어야 합니다.');
  assert(snapshot1.stations['222'], '2호선 강남역(222)이 존재해야 합니다.');
  console.log('  ✓ 스냅샷 캐싱 정상 동작');

  // 3. 점령 룰 (메인 50자: 제목 15자 + 본문 35자)
  console.log('3. 메인 전광판 50자 점령 룰 검증...');
  // 이전 백업 데이터가 있어도 테스트가 독립적으로 통과하도록 슬롯 초기화
  stateManager.stations['222'].directions[0].mainSlot = stateManager.createEmptySlot('main');

  const mockUser = {
    uuid: 'test-user-uuid-1234',
    nickname: '테스터승객',
    factionId: 'line2_crew'
  };

  const title15 = '🥐 강남역 소금빵1+1'; // 12자
  const body35 = '오늘 저녁 8시까지 카운터에 점령 화면 제시 시 소금빵 증정'; // 31자 (35자 이내)
  
  const claimResult = stateManager.claimMainSlot('222', 0, mockUser, title15, body35);
  assert(claimResult.success, `점령 성공해야 함: ${claimResult.message}`);
  
  const gangnamMain = stateManager.stations['222'].directions[0].mainSlot;
  assert.strictEqual(gangnamMain.owner.nickname, '테스터승객');
  assert.strictEqual(gangnamMain.title, title15);
  assert.strictEqual(gangnamMain.body, body35);
  assert(gangnamMain.protectUntil > Date.now(), '기본 3분 보호막이 활성화되어야 합니다.');
  console.log('  ✓ 메인 50자 점령 및 기본 보호막 활성화 검증 완료');

  // 4. 보호 중 무단 점령 차단 및 공격 검증
  console.log('4. 보호 중 타 유저 참여 (방어막 공격) 검증...');
  const attackerUser = {
    uuid: 'attacker-uuid-5678',
    nickname: '공격자',
    factionId: 'line9_rush'
  };

  const invalidClaim = stateManager.claimMainSlot('222', 0, attackerUser, '뺏기시도', '본문');
  assert(!invalidClaim.success, '보호 중에는 바로 뺏을 수 없어야 합니다.');

  const initialShield = gangnamMain.shield;
  const attackResult = stateManager.attackMainSlot('222', 0, attackerUser);
  assert(attackResult.success, '보호 중에도 공격 미션은 성공해야 합니다.');
  assert.strictEqual(gangnamMain.shield, initialShield - config.GAME_RULES.ATTACK_DAMAGE, '방어막이 깎여야 합니다.');
  console.log(`  ✓ 보호막 중 직접 점령 차단 및 방어막 공격 성공 (현재 방어막: ${gangnamMain.shield})`);

  // 5. 공감(좋아요) 시간 연장 및 방어막 수리
  console.log('5. 공감(좋아요) 연장 및 방어막 수리 검증...');
  const beforeExpire = gangnamMain.expiresAt;
  const beforeShield = gangnamMain.shield;
  const likeResult = stateManager.likeMainSlot('222', 0, 'passerby-uuid-9999');
  assert(likeResult.success, '공감 성공해야 함');
  assert(gangnamMain.expiresAt > beforeExpire, '공감 시 만료 시간이 연장되어야 합니다.');
  assert(gangnamMain.shield > beforeShield, '공감 시 방어막이 수리되어야 합니다.');
  console.log('  ✓ 공감 시 수명 연장 및 방어막 회복 검증 완료');

  // 6. 서브 슬롯 25자 롤링 등록
  console.log('6. 서브 슬롯 25자 롤링 검증...');
  const subResult = stateManager.claimSubSlot('222', 0, attackerUser, '서브 응원 문구입니다 25자 이내!');
  assert(subResult.success, '서브 슬롯 등록 성공해야 함');
  const subSlot0 = stateManager.stations['222'].directions[0].subSlots[0];
  assert.strictEqual(subSlot0.owner.nickname, '공격자');
  console.log('  ✓ 서브 슬롯 25자 롤링 등록 검증 완료');

  // 7. 원자적 파일 백업 및 부팅 복원 검증
  console.log('7. 원자적 파일 백업 & 복원 검증 (비용 0원 & 데이터 보존)...');
  stateManager.saveBackup();
  assert(fs.existsSync(config.BACKUP_FILE), '백업 파일이 생성되어야 합니다.');
  
  // 강제로 메모리 수정 후 백업에서 복원해보기
  stateManager.stations['222'].directions[0].mainSlot = stateManager.createEmptySlot('main');
  assert(!stateManager.stations['222'].directions[0].mainSlot.owner, '메모리 초기화 확인');
  
  stateManager.loadBackup();
  assert(stateManager.stations['222'].directions[0].mainSlot.owner, '백업에서 이전 점령자가 복원되어야 합니다.');
  assert.strictEqual(stateManager.stations['222'].directions[0].mainSlot.owner.nickname, '테스터승객');
  console.log('  ✓ 원자적 파일 백업 및 부팅 복원 완벽 통과');

  console.log('\n====================================================');
  console.log('🎉 모든 시스템 코어 테스트가 100% 정상 통과되었습니다!');
  console.log('====================================================\n');
  process.exit(0);
}

runTests().catch(err => {
  console.error('\n❌ 테스트 실패:', err);
  process.exit(1);
});
