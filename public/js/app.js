/**
 * App.js - StationLand 프론트엔드 메인 컨트롤러
 * 가상 연습 모드 vs 실전 GPS 모드 & 최신 지하철 노선도 맵 뷰 탑재
 */

let globalSnapshot = null;
let globalMeta = null;
let currentSelectedLine = 'line2';
let currentActiveDirection = 0;
let currentTargetStationId = '222'; // 기본 강남역
let miniGameInstance = null;
let simulatorInstance = null;
let subwayMapRenderer = null;
let currentGameMode = 'virtual'; // 'virtual' | 'real'
let currentViewMode = 'list';    // 'list' | 'map'

// DOM 요소 참조
const lineSelector = document.getElementById('lineSelector');
const stationCardsContainer = document.getElementById('stationCards');
const stationSearchInput = document.getElementById('stationSearchInput');
const quickStationName = document.getElementById('quickStationName');
const quickStationState = document.getElementById('quickStationState');
const btnQuickCheckin = document.getElementById('btnQuickCheckin');
const btnVirtualTransit = document.getElementById('btnVirtualTransit');
const btnRefreshGps = document.getElementById('btnRefreshGps');
const transitStatusText = document.getElementById('transitStatusText');
const gpsDistanceText = document.getElementById('gpsDistanceText');
const headerUserName = document.getElementById('headerUserName');
const headerUserPoints = document.getElementById('headerUserPoints');
const headerFactionBadge = document.getElementById('headerFactionBadge');
const pwaNotice = document.getElementById('pwaNotice');
const btnCloseNotice = document.getElementById('btnCloseNotice');

// 모드 및 뷰 전환 탭
const btnModeVirtual = document.getElementById('btnModeVirtual');
const btnModeReal = document.getElementById('btnModeReal');
const tabViewList = document.getElementById('tabViewList');
const tabViewMap = document.getElementById('tabViewMap');
const subwayMapWrap = document.getElementById('subwayMapWrap');
const stationListContainer = document.getElementById('stationListContainer');

// 모달 참조
const modalMission = document.getElementById('modalMission');
const modalProfile = document.getElementById('modalProfile');
const btnCloseMission = document.getElementById('btnCloseMission');
const btnCloseProfile = document.getElementById('btnCloseProfile');
const btnOpenProfile = document.getElementById('btnOpenProfile');

// 폼 입력 참조 (메인 50자: 제목 15자 + 본문 35자)
const inputMainTitle = document.getElementById('inputMainTitle');
const inputMainBody = document.getElementById('inputMainBody');
const countMainTitle = document.getElementById('countMainTitle');
const countMainBody = document.getElementById('countMainBody');
const previewNeonTitle = document.getElementById('previewNeonTitle');
const previewSubBody = document.getElementById('previewSubBody');
const inputSubText = document.getElementById('inputSubText');
const countSubText = document.getElementById('countSubText');
const tabMainSlot = document.getElementById('tabMainSlot');
const tabSubSlot = document.getElementById('tabSubSlot');
const mainSlotInputs = document.getElementById('mainSlotInputs');
const subSlotInputs = document.getElementById('subSlotInputs');
const selectPreset = document.getElementById('selectPreset');
const btnSubmitClaim = document.getElementById('btnSubmitClaim');
const minigameContainer = document.getElementById('minigameContainer');
const claimFormContainer = document.getElementById('claimFormContainer');

let activeClaimSlotType = 'main';

// 토스트 메시지
function showToast(msg) {
  const container = document.getElementById('toastContainer');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 2600);
}

// 1. 초기화
async function initApp() {
  updateUserHeader();
  setupPwa();

  await loadMetadata();
  await refreshSnapshot();

  // 노선도 맵 렌더러 초기화
  if (window.SubwayMapRenderer) {
    subwayMapRenderer = new SubwayMapRenderer('subwayMapContainer', (selectedStId) => {
      currentTargetStationId = selectedStId;
      updateTransitBanner();
      updateQuickActionBar();
      showToast(`[${getStationName(selectedStId)}] 역이 선택되었습니다.`);
    });
    subwayMapRenderer.render();
  }

  // 시뮬레이터 초기화 (가상 연습 모드용)
  simulatorInstance = new SubwaySimulator((newStId) => {
    if (currentGameMode === 'virtual') {
      currentTargetStationId = newStId;
      if (subwayMapRenderer) subwayMapRenderer.setActiveStation(newStId);
      updateTransitBanner();
      renderStationCards();
      showToast(`🚆 [가상 연습] 다음 역 [${getStationName(newStId)}]에 도착했습니다!`);
    }
  });

  // 미니게임 초기화
  miniGameInstance = new TransitMiniGame(
    () => {
      showToast('🎉 제동 성공! 전광판 문구를 등록하세요.');
      if (minigameContainer) minigameContainer.classList.add('hidden');
      if (claimFormContainer) claimFormContainer.classList.remove('hidden');
    },
    (failMsg) => {
      showToast(failMsg);
      setTimeout(() => {
        if (modalMission) modalMission.classList.add('hidden');
      }, 1000);
    }
  );

  bindEventListeners();
  updateTransitBanner();

  // 10초 주기 스냅샷 자동 갱신
  setInterval(refreshSnapshot, 10000);
}

function updateUserHeader() {
  if (headerUserName) headerUserName.textContent = userState.user.nickname;
  if (headerUserPoints) headerUserPoints.textContent = `${userState.user.points} P`;
  const fBadge = getFactionBadge(userState.user.factionId);
  if (headerFactionBadge) headerFactionBadge.textContent = fBadge;
}

function getFactionBadge(fId) {
  const badges = {
    'line2_crew': '🟢',
    'line9_rush': '🟡',
    'line1_pioneer': '🔵',
    'night_escape': '🟣',
    'salaried_union': '💼'
  };
  return badges[fId] || '🚇';
}

function getStationName(stId) {
  if (globalSnapshot && globalSnapshot.stations && globalSnapshot.stations[stId]) {
    return globalSnapshot.stations[stId].name;
  }
  const { STATIONS } = window.SUBWAY_DATA;
  const found = STATIONS.find(s => s.id === stId);
  return found ? found.name : stId;
}

// 2. 메타데이터 및 스냅샷 로드
async function loadMetadata() {
  if (window.isGitHubPages || !window.fetch) {
    globalMeta = {
      lines: window.SUBWAY_DATA.LINES,
      factions: window.SUBWAY_DATA.FACTIONS,
      rules: window.SUBWAY_DATA.GAME_RULES
    };
    renderLineSelector();
    renderFactionSelector();
    return;
  }

  try {
    const res = await fetch('./api/meta');
    globalMeta = await res.json();
  } catch (err) {
    globalMeta = {
      lines: window.SUBWAY_DATA.LINES,
      factions: window.SUBWAY_DATA.FACTIONS,
      rules: window.SUBWAY_DATA.GAME_RULES
    };
  }
  renderLineSelector();
  renderFactionSelector();
}

async function refreshSnapshot() {
  if (window.isGitHubPages) {
    globalSnapshot = window.clientEngine.getSnapshot();
    renderStationCards();
    return;
  }

  try {
    const res = await fetch('./api/stations/snapshot');
    globalSnapshot = await res.json();
  } catch (err) {
    globalSnapshot = window.clientEngine.getSnapshot();
  }
  renderStationCards();
}

// 3. 노선 탭 렌더링
function renderLineSelector() {
  if (!globalMeta || !globalMeta.lines || !lineSelector) return;
  lineSelector.innerHTML = '';

  for (const [lineId, line] of Object.entries(globalMeta.lines)) {
    const chip = document.createElement('div');
    chip.className = `line-chip ${lineId === currentSelectedLine ? 'active' : ''}`;
    chip.style.backgroundColor = lineId === currentSelectedLine ? line.color : '';
    chip.textContent = line.name;
    chip.addEventListener('click', () => {
      currentSelectedLine = lineId;
      document.querySelectorAll('.line-chip').forEach(c => {
        c.classList.remove('active');
        c.style.backgroundColor = '';
      });
      chip.classList.add('active');
      chip.style.backgroundColor = line.color;
      renderStationCards();
    });
    lineSelector.appendChild(chip);
  }
}

// 4. 역 카드 렌더링
function renderStationCards() {
  if (!globalSnapshot || !globalSnapshot.stations || !stationCardsContainer) return;

  const searchQuery = stationSearchInput ? stationSearchInput.value.trim().toLowerCase() : '';
  stationCardsContainer.innerHTML = '';

  const matchedStations = Object.values(globalSnapshot.stations).filter(st => {
    if (searchQuery) {
      return st.name.toLowerCase().includes(searchQuery);
    }
    return st.line === currentSelectedLine;
  });

  if (matchedStations.length === 0) {
    stationCardsContainer.innerHTML = `<div class="loading-state"><p>해당하는 역이 없습니다.</p></div>`;
    return;
  }

  matchedStations.forEach(st => {
    const card = createStationCard(st);
    stationCardsContainer.appendChild(card);
  });

  updateQuickActionBar();
}

function createStationCard(st) {
  const card = document.createElement('div');
  card.className = `station-card ${st.crowded ? 'crowded' : ''} ${st.id === currentTargetStationId ? 'selected-target' : ''}`;
  card.setAttribute('data-st-id', st.id);

  const currentDirData = st.directions[currentActiveDirection] || st.directions[0];
  const main = currentDirData.mainSlot;

  // 실제 모드일 때 GPS 거리 표시
  let gpsBadgeHtml = '';
  if (currentGameMode === 'real' && window.gpsManager) {
    const prox = window.gpsManager.checkStationProximity(st.id);
    if (prox.hasGps && prox.distanceMeters !== null) {
      const distStr = prox.distanceMeters >= 1000 ? `${(prox.distanceMeters / 1000).toFixed(1)}km` : `${prox.distanceMeters}m`;
      gpsBadgeHtml = prox.isMatch
        ? `<span class="crowd-badge" style="background:rgba(0,255,102,0.2);color:#00ff66;">📍 현재 위치 일치 (${distStr})</span>`
        : `<span class="crowd-badge" style="background:rgba(255,255,255,0.08);color:#8b949e;">📏 거리: ${distStr}</span>`;
    }
  }

  const headerHtml = `
    <div class="card-header">
      <div class="station-title-group">
        <span class="line-badge" style="background-color: ${getLineColor(st.line)}">${getLineShortName(st.line)}</span>
        <span class="st-name">${st.name}</span>
        ${st.crowded ? '<span class="crowd-badge">혼잡(1~10호차)</span>' : ''}
        ${gpsBadgeHtml}
      </div>
      <div class="faction-dom-badge">
        ${currentDirData.dominantFaction ? `우세: ${getFactionBadge(currentDirData.dominantFaction)}` : '중립 구역'}
      </div>
    </div>
  `;

  const dirTabsHtml = `
    <div class="direction-tabs">
      ${Object.entries(st.directions).map(([idx, dir]) => `
        <button class="dir-tab-btn ${parseInt(idx) === currentActiveDirection ? 'active' : ''}" data-dir="${idx}">
          ${dir.dirName}
        </button>
      `).join('')}
    </div>
  `;

  const isProtected = main.isProtected;
  const isGolden = main.isGolden;
  const shieldPercent = Math.min(100, (main.shield / 100) * 100);

  let billboardContentHtml = '';
  if (main.hasOwner) {
    billboardContentHtml = `
      <div class="billboard-headline">${escapeHtml(main.title)}</div>
      <div class="billboard-body">${escapeHtml(main.body)}</div>
    `;
  } else {
    billboardContentHtml = `
      <div class="billboard-empty-text">현재 비어있는 전광판입니다. 미션을 완료하고 50자 문구를 등록하세요!</div>
    `;
  }

  const mainSlotHtml = `
    <div class="billboard-main-slot ${isGolden ? 'golden' : ''}">
      <div class="billboard-status-row">
        <div class="owner-info">
          ${main.hasOwner ? `${getFactionBadge(main.owner.factionId)} ${escapeHtml(main.owner.nickname)}` : '무주공산'}
          ${isGolden ? '✨ [골든타임 무적]' : isProtected ? `🛡️ [보호막 ${main.protectRemainingSec}s]` : ''}
        </div>
        <div class="shield-bar-wrap">
          <span style="font-size:10px; color:#8b949e">방어막 ${main.shield}</span>
          <div class="shield-track">
            <div class="shield-fill" style="width: ${shieldPercent}%"></div>
          </div>
        </div>
      </div>
      ${billboardContentHtml}
      <div class="billboard-actions">
        <button class="btn-like" data-st="${st.id}" data-dir="${currentActiveDirection}">
          <span>❤️ 공감</span>
          <span class="like-count">${main.likes}</span>
        </button>
        <div>
          ${main.hasOwner ? `
            <button class="btn-slot-action btn-attack" data-st="${st.id}" data-dir="${currentActiveDirection}">
              ⚔️ 방어막 공격
            </button>
          ` : `
            <button class="btn-slot-action btn-claim" data-st="${st.id}" data-dir="${currentActiveDirection}">
              🚩 즉시 점령
            </button>
          `}
        </div>
      </div>
    </div>
  `;

  const subSlotsHtml = `
    <div class="sub-slots-wrap">
      ${currentDirData.subSlots.map((s) => `
        <div class="sub-slot-item">
          <span class="sub-text">${s.hasOwner ? escapeHtml(s.subText) : '서브 슬롯 비어있음'}</span>
          <span class="sub-owner">${s.hasOwner ? `${escapeHtml(s.owner.nickname)} (${s.remainingSec}s)` : '미점령'}</span>
        </div>
      `).join('')}
    </div>
  `;

  card.innerHTML = headerHtml + dirTabsHtml + mainSlotHtml + subSlotsHtml;

  card.querySelectorAll('.dir-tab-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentActiveDirection = parseInt(btn.dataset.dir);
      renderStationCards();
    });
  });

  const likeBtn = card.querySelector('.btn-like');
  if (likeBtn) {
    likeBtn.addEventListener('click', async (e) => {
      e.stopPropagation();
      await handleLike(st.id, currentActiveDirection);
    });
  }

  const actionBtn = card.querySelector('.btn-slot-action');
  if (actionBtn) {
    actionBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      currentTargetStationId = st.id;
      if (subwayMapRenderer) subwayMapRenderer.setActiveStation(st.id);
      updateQuickActionBar();
      handleQuickCheckin();
    });
  }

  card.addEventListener('click', () => {
    currentTargetStationId = st.id;
    if (subwayMapRenderer) subwayMapRenderer.setActiveStation(st.id);
    updateQuickActionBar();
    updateTransitBanner();
  });

  return card;
}

// 5. 공감(좋아요) 처리
async function handleLike(stationId, dirIdx) {
  if (window.isGitHubPages) {
    const res = window.clientEngine.likeSlot(stationId, dirIdx);
    if (res.success) {
      userState.addPoints(5);
      updateUserHeader();
      showToast(`❤️ ${res.message} (+5 P 획득)`);
      refreshSnapshot();
    } else {
      showToast(`⚠️ ${res.message}`);
    }
    return;
  }

  try {
    const res = await fetch('./api/stations/like', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        uuid: userState.user.uuid,
        token: userState.user.token,
        stationId,
        directionIdx: dirIdx
      })
    });
    const data = await res.json();
    if (data.success) {
      userState.addPoints(5);
      updateUserHeader();
      showToast(`❤️ ${data.message} (+5 P 획득)`);
      refreshSnapshot();
    } else {
      showToast(`⚠️ ${data.message}`);
    }
  } catch (err) {
    const res = window.clientEngine.likeSlot(stationId, dirIdx);
    showToast(res.message);
    refreshSnapshot();
  }
}

// 6. 상단 탑승 배너 & 퀵 액션바 갱신 (가상 vs 실제 GPS 분기)
function updateTransitBanner() {
  const stName = getStationName(currentTargetStationId);

  if (currentGameMode === 'virtual') {
    if (transitStatusText) transitStatusText.textContent = `[가상 주행] 현재 정차: [${stName}]`;
    if (gpsDistanceText) gpsDistanceText.textContent = '🎮 가상 연습 모드: 시뮬레이션 주행 및 제동 미션 연습';
    if (quickStationName) quickStationName.textContent = stName;
    if (quickStationState) quickStationState.textContent = '가상 모의 정차 중 (미션 연습 가능)';
  } else {
    // 실제 모드
    if (transitStatusText) transitStatusText.textContent = `[실제 실전] 타겟 정차역: [${stName}]`;
    if (window.gpsManager && window.gpsManager.currentCoords) {
      const prox = window.gpsManager.checkStationProximity(currentTargetStationId);
      if (prox.distanceMeters !== null) {
        const distStr = prox.distanceMeters >= 1000 ? `${(prox.distanceMeters / 1000).toFixed(1)}km` : `${prox.distanceMeters}m`;
        if (gpsDistanceText) {
          gpsDistanceText.textContent = prox.isMatch
            ? `📍 현재 위치 일치 (${distStr} 거리) - 정차역 체크인 가능!`
            : `⚠️ 정차역 불일치 (${distStr} 거리) - 실제로 ${stName}역에 도착해야 합니다.`;
          gpsDistanceText.style.color = prox.isMatch ? '#00ff66' : '#f85149';
        }
        if (quickStationState) {
          quickStationState.textContent = prox.isMatch ? '📍 정차역 위치 일치 (체크인 가능)' : `거리: ${distStr} (실제 정차 필요)`;
        }
      }
    } else {
      if (gpsDistanceText) {
        gpsDistanceText.textContent = '📍 GPS 위치 확인 중... (스마트폰 위치 권한 필요)';
        gpsDistanceText.style.color = 'var(--color-neon-blue)';
      }
    }
    if (quickStationName) quickStationName.textContent = stName;
  }

  if (btnQuickCheckin) btnQuickCheckin.disabled = false;
}

function updateQuickActionBar() {
  const stName = getStationName(currentTargetStationId);
  if (quickStationName) quickStationName.textContent = stName;
}

// 7. 정차역 체크인 & GPS 검증 (실제모드 vs 가상모드)
async function handleQuickCheckin() {
  if (btnQuickCheckin) btnQuickCheckin.disabled = true;

  if (currentGameMode === 'real') {
    // [실제 모드 검증]: 스마트폰 GPS와 정차역 좌표 일치 확인 (800m 이내)
    if (!window.gpsManager) {
      showToast('GPS 모듈을 초기화할 수 없습니다.');
      if (btnQuickCheckin) btnQuickCheckin.disabled = false;
      return;
    }

    const proximity = window.gpsManager.checkStationProximity(currentTargetStationId);
    if (!proximity.hasGps) {
      showToast('⚠️ GPS 신호 수신 중입니다. 스마트폰의 위치 서비스(GPS)를 켜주세요.');
      if (btnQuickCheckin) btnQuickCheckin.disabled = false;
      return;
    }

    if (!proximity.isMatch) {
      showToast(`⚠️ [체크인 실패] ${proximity.message}`);
      if (btnQuickCheckin) btnQuickCheckin.disabled = false;
      return;
    }

    showToast(`📍 [실제 정차 확인] ${proximity.message}`);
  } else {
    // [가상 연습 모드]: 자유로운 모의 테스트
    showToast(`🎮 [가상 연습] [${getStationName(currentTargetStationId)}] 모의 정차 미션을 시작합니다.`);
  }

  openMissionModal();
  if (btnQuickCheckin) btnQuickCheckin.disabled = false;
}

function openMissionModal() {
  const modePrefix = (currentGameMode === 'real') ? '📍 [실전]' : '🎮 [연습]';
  const modalTitle = document.getElementById('modalMissionTitle');
  if (modalTitle) modalTitle.textContent = `${modePrefix} [${getStationName(currentTargetStationId)}] 제동 미션`;

  if (minigameContainer) minigameContainer.classList.remove('hidden');
  if (claimFormContainer) claimFormContainer.classList.add('hidden');
  if (modalMission) modalMission.classList.remove('hidden');

  updatePresetSelector();
  if (miniGameInstance) miniGameInstance.start();
}

function updatePresetSelector() {
  if (!selectPreset) return;
  selectPreset.innerHTML = '<option value="">-- 프리셋 선택 --</option>';
  userState.user.presets.forEach((p, idx) => {
    const opt = document.createElement('option');
    opt.value = idx;
    opt.textContent = `${p.title} (${p.body.slice(0, 15)}...)`;
    selectPreset.appendChild(opt);
  });
}

// 8. 전광판 점령 제출 (메인 50자 / 서브 25자)
async function submitClaim() {
  if (btnSubmitClaim) btnSubmitClaim.disabled = true;
  try {
    const isVirtualNotice = (currentGameMode === 'virtual') ? '[연습] ' : '';

    if (activeClaimSlotType === 'main') {
      const title = (inputMainTitle ? inputMainTitle.value : '').trim();
      const body = (inputMainBody ? inputMainBody.value : '').trim();

      if (!title && !body) {
        showToast('헤드라인이나 상세 문구를 입력하세요.');
        if (btnSubmitClaim) btnSubmitClaim.disabled = false;
        return;
      }

      const finalTitle = isVirtualNotice ? `[연습] ${title}`.slice(0, 15) : title;

      if (window.isGitHubPages) {
        const data = window.clientEngine.claimMainSlot(currentTargetStationId, currentActiveDirection, userState.user, finalTitle, body);
        if (data.success) {
          userState.addPoints(50);
          updateUserHeader();
          showToast(`🎉 ${data.message} (+50 P 획득)`);
          if (modalMission) modalMission.classList.add('hidden');
          refreshSnapshot();
        } else {
          showToast(`⚠️ ${data.message}`);
        }
        if (btnSubmitClaim) btnSubmitClaim.disabled = false;
        return;
      }

      const res = await fetch('./api/stations/claim/main', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uuid: userState.user.uuid,
          token: userState.user.token,
          nickname: userState.user.nickname,
          factionId: userState.user.factionId,
          stationId: currentTargetStationId,
          directionIdx: currentActiveDirection,
          title: finalTitle,
          body
        })
      });
      const data = await res.json();
      if (data.success) {
        userState.addPoints(50);
        updateUserHeader();
        showToast(`🎉 ${data.message} (+50 P 획득)`);
        if (modalMission) modalMission.classList.add('hidden');
        refreshSnapshot();
      } else {
        showToast(`⚠️ ${data.message}`);
      }
    } else {
      const subText = (inputSubText ? inputSubText.value : '').trim();
      if (!subText) {
        showToast('서브 문구를 입력하세요.');
        if (btnSubmitClaim) btnSubmitClaim.disabled = false;
        return;
      }

      const finalSub = isVirtualNotice ? `[연습] ${subText}`.slice(0, 25) : subText;

      if (window.isGitHubPages) {
        const data = window.clientEngine.claimSubSlot(currentTargetStationId, currentActiveDirection, userState.user, finalSub);
        if (data.success) {
          userState.addPoints(20);
          updateUserHeader();
          showToast(`🎉 ${data.message} (+20 P 획득)`);
          if (modalMission) modalMission.classList.add('hidden');
          refreshSnapshot();
        } else {
          showToast(`⚠️ ${data.message}`);
        }
        if (btnSubmitClaim) btnSubmitClaim.disabled = false;
        return;
      }

      const res = await fetch('./api/stations/claim/sub', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          uuid: userState.user.uuid,
          token: userState.user.token,
          nickname: userState.user.nickname,
          factionId: userState.user.factionId,
          stationId: currentTargetStationId,
          directionIdx: currentActiveDirection,
          subText: finalSub
        })
      });
      const data = await res.json();
      if (data.success) {
        userState.addPoints(20);
        updateUserHeader();
        showToast(`🎉 ${data.message} (+20 P 획득)`);
        if (modalMission) modalMission.classList.add('hidden');
        refreshSnapshot();
      } else {
        showToast(`⚠️ ${data.message}`);
      }
    }
  } catch (err) {
    showToast('점령 처리 중 오류가 발생했습니다.');
  } finally {
    if (btnSubmitClaim) btnSubmitClaim.disabled = false;
  }
}

// 9. 프로필 모달 & 진영 & 복구코드 & 프리셋
function renderFactionSelector() {
  if (!globalMeta || !globalMeta.factions) return;
  const list = document.getElementById('factionSelectorList');
  if (!list) return;
  list.innerHTML = '';

  globalMeta.factions.forEach(f => {
    const item = document.createElement('div');
    item.className = `faction-item ${f.id === userState.user.factionId ? 'selected' : ''}`;
    item.innerHTML = `
      <div>
        <strong>${f.badge} ${f.name}</strong>
        <div style="font-size:11px; color:#8b949e">${f.slogan}</div>
      </div>
      <button class="btn-sm btn-outline">${f.id === userState.user.factionId ? '선택됨' : '선택'}</button>
    `;
    item.addEventListener('click', () => {
      userState.setFaction(f.id);
      updateUserHeader();
      renderFactionSelector();
      showToast(`진영이 [${f.name}]으로 변경되었습니다.`);
    });
    list.appendChild(item);
  });
}

function renderPresetManageList() {
  const container = document.getElementById('presetManageList');
  if (!container) return;
  container.innerHTML = '';

  userState.user.presets.forEach(p => {
    const div = document.createElement('div');
    div.className = 'preset-item';
    div.innerHTML = `
      <div>
        <strong>${escapeHtml(p.title)}</strong>
        <div style="color:#8b949e; font-size:11px;">${escapeHtml(p.body)}</div>
      </div>
      <button class="btn-sm btn-outline" style="color:#f85149" data-del="${p.id}">삭제</button>
    `;
    const delBtn = div.querySelector('button');
    if (delBtn) {
      delBtn.addEventListener('click', () => {
        userState.removePreset(p.id);
        renderPresetManageList();
        showToast('프리셋이 삭제되었습니다.');
      });
    }
    container.appendChild(div);
  });
}

// 10. 모드 전환 & 뷰 전환 & 이벤트 바인딩
function bindEventListeners() {
  // 모드 전환 (가상 연습 모드)
  if (btnModeVirtual) {
    btnModeVirtual.addEventListener('click', () => {
      currentGameMode = 'virtual';
      btnModeVirtual.classList.add('active');
      if (btnModeReal) btnModeReal.classList.remove('active');
      if (btnVirtualTransit) btnVirtualTransit.classList.remove('hidden');
      if (btnRefreshGps) btnRefreshGps.classList.add('hidden');
      if (window.gpsManager) window.gpsManager.stopTracking();
      updateTransitBanner();
      renderStationCards();
      showToast('🎮 [가상 연습 모드]로 전환되었습니다. 모의 주행과 미션을 연습하세요!');
    });
  }

  // 모드 전환 (실전 GPS 모드)
  if (btnModeReal) {
    btnModeReal.addEventListener('click', () => {
      currentGameMode = 'real';
      btnModeReal.classList.add('active');
      if (btnModeVirtual) btnModeVirtual.classList.remove('active');
      if (btnVirtualTransit) btnVirtualTransit.classList.add('hidden');
      if (btnRefreshGps) btnRefreshGps.classList.remove('hidden');

      showToast('📍 [실전 GPS 모드] 위치 정보를 추적합니다...');
      if (window.gpsManager) {
        window.gpsManager.startTracking((coords) => {
          // 가장 가까운 역 감지 시 해당 역 자동 포커스
          const nearest = window.gpsManager.findNearestStation();
          if (nearest && nearest.station) {
            if (subwayMapRenderer) subwayMapRenderer.setUserGpsStation(nearest.station.id);
            if (nearest.distance <= 800) {
              currentTargetStationId = nearest.station.id;
            }
          }
          updateTransitBanner();
          renderStationCards();
        });
      }
      updateTransitBanner();
    });
  }

  // GPS 즉시 갱신 버튼
  if (btnRefreshGps) {
    btnRefreshGps.addEventListener('click', () => {
      if (window.gpsManager) {
        showToast('🔄 GPS 위치를 다시 측정합니다...');
        window.gpsManager.startTracking(() => {
          updateTransitBanner();
          renderStationCards();
        });
      }
    });
  }

  // 뷰 전환 (전광판 목록 vs 노선도 맵)
  if (tabViewList && tabViewMap) {
    tabViewList.addEventListener('click', () => {
      currentViewMode = 'list';
      tabViewList.classList.add('active');
      tabViewMap.classList.remove('active');
      if (stationListContainer) stationListContainer.classList.remove('hidden');
      if (subwayMapWrap) subwayMapWrap.classList.add('hidden');
    });

    tabViewMap.addEventListener('click', () => {
      currentViewMode = 'map';
      tabViewMap.classList.add('active');
      tabViewList.classList.remove('active');
      if (stationListContainer) stationListContainer.classList.add('hidden');
      if (subwayMapWrap) {
        subwayMapWrap.classList.remove('hidden');
        if (subwayMapRenderer) subwayMapRenderer.render();
      }
    });
  }

  if (btnCloseNotice && pwaNotice) {
    btnCloseNotice.addEventListener('click', () => {
      pwaNotice.style.display = 'none';
    });
  }

  if (stationSearchInput) {
    stationSearchInput.addEventListener('input', () => {
      renderStationCards();
    });
  }

  if (btnQuickCheckin) {
    btnQuickCheckin.addEventListener('click', handleQuickCheckin);
  }

  if (btnVirtualTransit) {
    btnVirtualTransit.addEventListener('click', () => {
      if (simulatorInstance) {
        simulatorInstance.nextStation();
      }
    });
  }

  if (btnCloseMission && modalMission) {
    btnCloseMission.addEventListener('click', () => {
      if (miniGameInstance) miniGameInstance.stop();
      modalMission.classList.add('hidden');
    });
  }

  if (btnCloseProfile && modalProfile) {
    btnCloseProfile.addEventListener('click', () => {
      modalProfile.classList.add('hidden');
    });
  }

  if (btnOpenProfile && modalProfile) {
    btnOpenProfile.addEventListener('click', () => {
      const inputNick = document.getElementById('inputNickname');
      if (inputNick) inputNick.value = userState.user.nickname;
      renderFactionSelector();
      renderPresetManageList();
      modalProfile.classList.remove('hidden');
    });
  }

  const btnSaveNick = document.getElementById('btnSaveNickname');
  if (btnSaveNick) {
    btnSaveNick.addEventListener('click', () => {
      const inputNick = document.getElementById('inputNickname');
      const newName = inputNick ? inputNick.value : '';
      if (newName.trim()) {
        userState.setNickname(newName);
        updateUserHeader();
        showToast('닉네임이 저장되었습니다.');
      }
    });
  }

  if (tabMainSlot) {
    tabMainSlot.addEventListener('click', () => {
      activeClaimSlotType = 'main';
      tabMainSlot.classList.add('active');
      if (tabSubSlot) tabSubSlot.classList.remove('active');
      if (mainSlotInputs) mainSlotInputs.classList.remove('hidden');
      if (subSlotInputs) subSlotInputs.classList.add('hidden');
    });
  }

  if (tabSubSlot) {
    tabSubSlot.addEventListener('click', () => {
      activeClaimSlotType = 'sub';
      tabSubSlot.classList.add('active');
      if (tabMainSlot) tabMainSlot.classList.remove('active');
      if (subSlotInputs) subSlotInputs.classList.remove('hidden');
      if (mainSlotInputs) mainSlotInputs.classList.add('hidden');
    });
  }

  if (inputMainTitle) {
    inputMainTitle.addEventListener('input', () => {
      const val = inputMainTitle.value;
      if (countMainTitle) countMainTitle.textContent = `${val.length}/15`;
      if (previewNeonTitle) previewNeonTitle.textContent = val || '헤드라인이 노출됩니다';
    });
  }

  if (inputMainBody) {
    inputMainBody.addEventListener('input', () => {
      const val = inputMainBody.value;
      if (countMainBody) countMainBody.textContent = `${val.length}/35`;
      if (previewSubBody) previewSubBody.textContent = val || '상세 내용이 노출됩니다';
    });
  }

  if (inputSubText) {
    inputSubText.addEventListener('input', () => {
      const val = inputSubText.value;
      if (countSubText) countSubText.textContent = `${val.length}/25`;
    });
  }

  if (selectPreset) {
    selectPreset.addEventListener('change', () => {
      const idx = selectPreset.value;
      if (idx !== '' && userState.user.presets[idx]) {
        const p = userState.user.presets[idx];
        if (inputMainTitle) inputMainTitle.value = p.title;
        if (inputMainBody) inputMainBody.value = p.body;
        if (countMainTitle) countMainTitle.textContent = `${p.title.length}/15`;
        if (countMainBody) countMainBody.textContent = `${p.body.length}/35`;
        if (previewNeonTitle) previewNeonTitle.textContent = p.title;
        if (previewSubBody) previewSubBody.textContent = p.body;
      }
    });
  }

  if (btnSubmitClaim) {
    btnSubmitClaim.addEventListener('click', submitClaim);
  }

  const btnExport = document.getElementById('btnExportCode');
  const textBackup = document.getElementById('textBackupCode');
  if (btnExport && textBackup) {
    btnExport.addEventListener('click', async () => {
      try {
        const code = await userState.exportBackupCode();
        textBackup.value = code;
        textBackup.classList.remove('hidden');
        navigator.clipboard.writeText(code).then(() => {
          showToast('복구 코드가 클립보드에 복사되었습니다!');
        });
      } catch (err) {
        showToast('복구 코드 생성 실패');
      }
    });
  }

  const btnImport = document.getElementById('btnImportCode');
  if (btnImport) {
    btnImport.addEventListener('click', async () => {
      const code = prompt('복구 코드를 붙여넣으세요:');
      if (code && code.trim()) {
        try {
          const ok = await userState.importBackupCode(code.trim());
          if (ok) {
            updateUserHeader();
            renderPresetManageList();
            showToast('성공적으로 데이터를 복원했습니다!');
          }
        } catch (err) {
          showToast('유효하지 않은 복구 코드입니다.');
        }
      }
    });
  }

  const btnAddP = document.getElementById('btnAddPreset');
  if (btnAddP) {
    btnAddP.addEventListener('click', () => {
      const t = prompt('헤드라인(최대 15자):');
      if (!t) return;
      const b = prompt('상세 내용(최대 35자):');
      if (!b) return;
      userState.addPreset(t, b);
      renderPresetManageList();
      showToast('프리셋이 추가되었습니다.');
    });
  }
}

// 11. PWA 서비스 워커 등록
function setupPwa() {
  if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
      navigator.serviceWorker.register('./sw.js').then(() => {
        // console.log('SW registered');
      }).catch(() => {});
    });
  }
}

function getLineColor(lineId) {
  if (globalMeta && globalMeta.lines && globalMeta.lines[lineId]) {
    return globalMeta.lines[lineId].color;
  }
  return '#388bfd';
}

function getLineShortName(lineId) {
  if (globalMeta && globalMeta.lines && globalMeta.lines[lineId]) {
    return globalMeta.lines[lineId].name;
  }
  return lineId;
}

function escapeHtml(str) {
  if (!str) return '';
  return str.replace(/[&<>'"]/g, tag => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    "'": '&#39;',
    '"': '&quot;'
  }[tag] || tag));
}

document.addEventListener('DOMContentLoaded', initApp);
