/**
 * SubwayMap.js - 최신 서울 지하철 노선도 인터랙티브 SVG 렌더러
 * 모바일 최적화 벡터 노선도 & 역 노드 터치 인터랙션 & 실시간 GPS 위치 핑
 */

class SubwayMapRenderer {
  constructor(containerId, onStationSelect) {
    this.container = document.getElementById(containerId);
    this.onStationSelect = onStationSelect;
    this.activeStationId = '222'; // 기본 강남역
    this.userGpsStationId = null;
  }

  render() {
    if (!this.container) return;
    const { LINES, STATIONS } = window.SUBWAY_DATA;

    // SVG 기본 구조 생성
    const svgNs = 'http://www.w3.org/2000/svg';
    const svg = document.createElementNS(svgNs, 'svg');
    svg.setAttribute('viewBox', '100 200 800 750');
    svg.setAttribute('class', 'subway-svg-map');

    // 1. 노선 배경 트랙 라인 그리기
    const defs = document.createElementNS(svgNs, 'defs');
    defs.innerHTML = `
      <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feMerge>
          <feMergeNode in="blur" />
          <feMergeNode in="SourceGraphic" />
        </feMerge>
      </filter>
    `;
    svg.appendChild(defs);

    const trackGroup = document.createElementNS(svgNs, 'g');
    trackGroup.setAttribute('class', 'track-group');

    // 2호선 순환 루프 경로
    const line2Stations = STATIONS.filter(s => s.line === 'line2' && s.mx && s.my);
    if (line2Stations.length > 2) {
      let d = `M ${line2Stations[0].mx} ${line2Stations[0].my} `;
      for (let i = 1; i < line2Stations.length; i++) {
        d += `L ${line2Stations[i].mx} ${line2Stations[i].my} `;
      }
      d += 'Z';
      const path2 = document.createElementNS(svgNs, 'path');
      path2.setAttribute('d', d);
      path2.setAttribute('stroke', '#00A84D');
      path2.setAttribute('stroke-width', '8');
      path2.setAttribute('fill', 'rgba(0, 168, 77, 0.05)');
      path2.setAttribute('stroke-linejoin', 'round');
      path2.setAttribute('filter', 'url(#glow)');
      trackGroup.appendChild(path2);
    }

    // 기타 주요 노선 선분
    const otherLines = ['line1', 'line3', 'line4', 'line5', 'line7', 'line9', 'shinbundang'];
    otherLines.forEach(lineId => {
      const lineSts = STATIONS.filter(s => s.line === lineId && s.mx && s.my);
      if (lineSts.length >= 2) {
        let d = `M ${lineSts[0].mx} ${lineSts[0].my} `;
        for (let i = 1; i < lineSts.length; i++) {
          d += `L ${lineSts[i].mx} ${lineSts[i].my} `;
        }
        const p = document.createElementNS(svgNs, 'path');
        p.setAttribute('d', d);
        p.setAttribute('stroke', LINES[lineId] ? LINES[lineId].color : '#555');
        p.setAttribute('stroke-width', '5');
        p.setAttribute('fill', 'none');
        p.setAttribute('stroke-linecap', 'round');
        p.setAttribute('stroke-linejoin', 'round');
        trackGroup.appendChild(p);
      }
    });
    svg.appendChild(trackGroup);

    // 2. 역 노드 및 라벨 그리기
    const nodesGroup = document.createElementNS(svgNs, 'g');
    nodesGroup.setAttribute('class', 'nodes-group');

    STATIONS.forEach(st => {
      if (!st.mx || !st.my) return;

      const g = document.createElementNS(svgNs, 'g');
      g.setAttribute('class', `station-node ${st.id === this.activeStationId ? 'active' : ''}`);
      g.setAttribute('data-id', st.id);
      g.style.cursor = 'pointer';

      // GPS 내 위치 핑 레이더 애니메이션 (내 근처 역일 때)
      if (st.id === this.userGpsStationId) {
        const pingCircle = document.createElementNS(svgNs, 'circle');
        pingCircle.setAttribute('cx', st.mx);
        pingCircle.setAttribute('cy', st.my);
        pingCircle.setAttribute('r', '18');
        pingCircle.setAttribute('class', 'gps-radar-ring');
        g.appendChild(pingCircle);
      }

      // 외부 링 (선택 시 네온 발광)
      if (st.id === this.activeStationId) {
        const activeRing = document.createElementNS(svgNs, 'circle');
        activeRing.setAttribute('cx', st.mx);
        activeRing.setAttribute('cy', st.my);
        activeRing.setAttribute('r', '12');
        activeRing.setAttribute('class', 'active-selection-ring');
        g.appendChild(activeRing);
      }

      // 역 원형 심볼
      const circle = document.createElementNS(svgNs, 'circle');
      circle.setAttribute('cx', st.mx);
      circle.setAttribute('cy', st.my);
      circle.setAttribute('r', st.isHub ? '7' : '5');
      circle.setAttribute('fill', '#ffffff');
      circle.setAttribute('stroke', LINES[st.line] ? LINES[st.line].color : '#333');
      circle.setAttribute('stroke-width', st.isHub ? '3.5' : '2.5');
      g.appendChild(circle);

      // 역 이름 텍스트
      const text = document.createElementNS(svgNs, 'text');
      text.setAttribute('x', st.mx);
      text.setAttribute('y', st.my + (st.isHub ? 16 : 14));
      text.setAttribute('text-anchor', 'middle');
      text.setAttribute('class', 'station-map-label');
      text.textContent = st.name;
      g.appendChild(text);

      // 클릭 시 해당 역 선택
      g.addEventListener('click', (e) => {
        e.stopPropagation();
        this.setActiveStation(st.id);
        if (this.onStationSelect) {
          this.onStationSelect(st.id);
        }
      });

      nodesGroup.appendChild(g);
    });

    svg.appendChild(nodesGroup);
    this.container.innerHTML = '';
    this.container.appendChild(svg);
  }

  setActiveStation(stationId) {
    this.activeStationId = stationId;
    this.render();
  }

  setUserGpsStation(stationId) {
    this.userGpsStationId = stationId;
    this.render();
  }
}

window.SubwayMapRenderer = SubwayMapRenderer;
