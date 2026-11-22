/**
 * 서울 지하철 주요 노선 및 대표 역 데이터 (위경도 GPS & 노선도 좌표 포함)
 */

const LINES = {
  'line2': { id: 'line2', name: '2호선', color: '#00A84D', type: 'circular', directions: ['내선순환', '외선순환'] },
  'line1': { id: 'line1', name: '1호선', color: '#0052A4', type: 'linear', directions: ['상행 (청량리/소요산)', '하행 (신도림/인천/수원)'] },
  'line3': { id: 'line3', name: '3호선', color: '#EF7C1C', type: 'linear', directions: ['상행 (대화/구파발)', '하행 (양재/오금)'] },
  'line4': { id: 'line4', name: '4호선', color: '#00A5DE', type: 'linear', directions: ['상행 (당고개/진접)', '하행 (사당/오이도)'] },
  'line5': { id: 'line5', name: '5호선', color: '#996CAC', type: 'linear', directions: ['상행 (방화)', '하행 (하남검단산/마천)'] },
  'line7': { id: 'line7', name: '7호선', color: '#747F00', type: 'linear', directions: ['상행 (장암/도봉산)', '하행 (부평구청/석남)'] },
  'line9': { id: 'line9', name: '9호선', color: '#BDB092', type: 'linear', directions: ['상행 (개화/김포공항)', '하행 (여의도/중앙보훈병원)'] },
  'shinbundang': { id: 'shinbundang', name: '신분당선', color: '#D4003B', type: 'linear', directions: ['상행 (신사/강남)', '하행 (판교/광교)'] }
};

// 역 데이터: lat(위도), lng(경도), mx/my(노선도 SVG 상대 좌표 0~1000)
const STATIONS = [
  // 2호선 순환
  { id: '201', name: '시청', line: 'line2', transfers: ['line1'], isHub: true, lat: 37.5657, lng: 126.9770, mx: 470, my: 320 },
  { id: '202', name: '을지로입구', line: 'line2', transfers: [], lat: 37.5660, lng: 126.9822, mx: 510, my: 320 },
  { id: '203', name: '을지로3가', line: 'line2', transfers: ['line3'], isHub: true, lat: 37.5663, lng: 126.9918, mx: 550, my: 320 },
  { id: '204', name: '을지로4가', line: 'line2', transfers: ['line5'], isHub: true, lat: 37.5666, lng: 126.9980, mx: 590, my: 320 },
  { id: '205', name: '동대문역사문화공원', line: 'line2', transfers: ['line4', 'line5'], isHub: true, lat: 37.5651, lng: 127.0079, mx: 630, my: 320 },
  { id: '206', name: '신당', line: 'line2', transfers: ['line6'], lat: 37.5656, lng: 127.0195, mx: 670, my: 340 },
  { id: '208', name: '왕십리', line: 'line2', transfers: ['line5', 'suin'], isHub: true, lat: 37.5615, lng: 127.0374, mx: 720, my: 380 },
  { id: '211', name: '성수', line: 'line2', transfers: [], isHub: true, lat: 37.5445, lng: 127.0560, mx: 760, my: 440 },
  { id: '212', name: '건대입구', line: 'line2', transfers: ['line7'], isHub: true, lat: 37.5404, lng: 127.0692, mx: 780, my: 500 },
  { id: '214', name: '강변', line: 'line2', transfers: [], lat: 37.5351, lng: 127.0947, mx: 800, my: 560 },
  { id: '216', name: '잠실', line: 'line2', transfers: ['line8'], isHub: true, crowded: true, lat: 37.5133, lng: 127.1001, mx: 780, my: 620 },
  { id: '218', name: '종합운동장', line: 'line2', transfers: ['line9'], isHub: true, lat: 37.5110, lng: 127.0736, mx: 740, my: 670 },
  { id: '219', name: '삼성', line: 'line2', transfers: [], isHub: true, crowded: true, lat: 37.5088, lng: 127.0631, mx: 700, my: 710 },
  { id: '220', name: '선릉', line: 'line2', transfers: ['suin'], isHub: true, lat: 37.5045, lng: 127.0490, mx: 660, my: 740 },
  { id: '221', name: '역삼', line: 'line2', transfers: [], lat: 37.5006, lng: 127.0365, mx: 620, my: 750 },
  { id: '222', name: '강남', line: 'line2', transfers: ['shinbundang'], isHub: true, crowded: true, lat: 37.4979, lng: 127.0276, mx: 580, my: 750 },
  { id: '223', name: '교대', line: 'line2', transfers: ['line3'], isHub: true, lat: 37.4934, lng: 127.0142, mx: 540, my: 750 },
  { id: '224', name: '서초', line: 'line2', transfers: [], lat: 37.4919, lng: 127.0079, mx: 500, my: 750 },
  { id: '226', name: '사당', line: 'line2', transfers: ['line4'], isHub: true, crowded: true, lat: 37.4765, lng: 126.9816, mx: 440, my: 740 },
  { id: '228', name: '서울대입구', line: 'line2', transfers: [], lat: 37.4812, lng: 126.9527, mx: 380, my: 720 },
  { id: '230', name: '신림', line: 'line2', transfers: [], isHub: true, crowded: true, lat: 37.4843, lng: 126.9298, mx: 330, my: 680 },
  { id: '232', name: '구로디지털단지', line: 'line2', transfers: [], crowded: true, lat: 37.4853, lng: 126.9015, mx: 280, my: 630 },
  { id: '234', name: '신도림', line: 'line2', transfers: ['line1'], isHub: true, crowded: true, lat: 37.5088, lng: 126.8913, mx: 240, my: 570 },
  { id: '235', name: '문래', line: 'line2', transfers: [], lat: 37.5179, lng: 126.8948, mx: 230, my: 510 },
  { id: '236', name: '영등포구청', line: 'line2', transfers: ['line5'], isHub: true, lat: 37.5250, lng: 126.8960, mx: 240, my: 450 },
  { id: '237', name: '당산', line: 'line2', transfers: ['line9'], isHub: true, lat: 37.5349, lng: 126.9027, mx: 260, my: 400 },
  { id: '238', name: '합정', line: 'line2', transfers: ['line6'], isHub: true, lat: 37.5495, lng: 126.9138, mx: 290, my: 360 },
  { id: '239', name: '홍대입구', line: 'line2', transfers: ['arex', 'gyeongui'], isHub: true, crowded: true, lat: 37.5575, lng: 126.9245, mx: 330, my: 330 },
  { id: '240', name: '신촌', line: 'line2', transfers: [], isHub: true, lat: 37.5551, lng: 126.9369, mx: 370, my: 320 },
  { id: '241', name: '이대', line: 'line2', transfers: [], lat: 37.5567, lng: 126.9460, mx: 405, my: 320 },
  { id: '243', name: '충정로', line: 'line2', transfers: ['line5'], lat: 37.5597, lng: 126.9634, mx: 440, my: 320 },

  // 1호선
  { id: '101', name: '서울역', line: 'line1', transfers: ['line4', 'arex', 'gyeongui'], isHub: true, crowded: true, lat: 37.5562, lng: 126.9723, mx: 470, my: 365 },
  { id: '102', name: '시청(1호선)', line: 'line1', transfers: ['line2'], isHub: true, lat: 37.5657, lng: 126.9770, mx: 470, my: 300 },
  { id: '103', name: '종각', line: 'line1', transfers: [], isHub: true, lat: 37.5702, lng: 126.9829, mx: 520, my: 280 },
  { id: '104', name: '종로3가', line: 'line1', transfers: ['line3', 'line5'], isHub: true, lat: 37.5716, lng: 126.9918, mx: 560, my: 280 },
  { id: '105', name: '동대문', line: 'line1', transfers: ['line4'], isHub: true, lat: 37.5714, lng: 127.0097, mx: 650, my: 280 },
  { id: '106', name: '신설동', line: 'line1', transfers: ['line2'], lat: 37.5760, lng: 127.0245, mx: 700, my: 260 },
  { id: '107', name: '청량리', line: 'line1', transfers: ['suin', 'gyeongui'], isHub: true, lat: 37.5802, lng: 127.0468, mx: 760, my: 240 },
  { id: '108', name: '용산', line: 'line1', transfers: ['gyeongui'], isHub: true, lat: 37.5298, lng: 126.9647, mx: 460, my: 450 },
  { id: '109', name: '노량진', line: 'line1', transfers: ['line9'], isHub: true, lat: 37.5142, lng: 126.9425, mx: 380, my: 520 },
  { id: '110', name: '영등포', line: 'line1', transfers: [], isHub: true, crowded: true, lat: 37.5156, lng: 126.9076, mx: 270, my: 540 },
  { id: '111', name: '신도림(1호선)', line: 'line1', transfers: ['line2'], isHub: true, crowded: true, lat: 37.5088, lng: 126.8913, mx: 220, my: 590 },

  // 3호선
  { id: '301', name: '경복궁', line: 'line3', transfers: [], lat: 37.5758, lng: 126.9736, mx: 480, my: 240 },
  { id: '302', name: '안국', line: 'line3', transfers: [], lat: 37.5765, lng: 126.9854, mx: 525, my: 240 },
  { id: '303', name: '을지로3가(3호선)', line: 'line3', transfers: ['line2'], isHub: true, lat: 37.5663, lng: 126.9918, mx: 550, my: 300 },
  { id: '304', name: '충무로', line: 'line3', transfers: ['line4'], isHub: true, lat: 37.5612, lng: 126.9942, mx: 570, my: 350 },
  { id: '305', name: '동대입구', line: 'line3', transfers: [], lat: 37.5590, lng: 127.0050, mx: 600, my: 400 },
  { id: '306', name: '약수', line: 'line3', transfers: ['line6'], isHub: true, lat: 37.5521, lng: 127.0112, mx: 620, my: 440 },
  { id: '307', name: '옥수', line: 'line3', transfers: ['gyeongui'], isHub: true, lat: 37.5414, lng: 127.0177, mx: 630, my: 490 },
  { id: '308', name: '압구정', line: 'line3', transfers: [], isHub: true, lat: 37.5270, lng: 127.0284, mx: 630, my: 550 },
  { id: '309', name: '신사', line: 'line3', transfers: ['shinbundang'], isHub: true, lat: 37.5163, lng: 127.0205, mx: 580, my: 610 },
  { id: '310', name: '고속터미널', line: 'line3', transfers: ['line7', 'line9'], isHub: true, crowded: true, lat: 37.5049, lng: 127.0049, mx: 520, my: 670 },
  { id: '311', name: '교대(3호선)', line: 'line3', transfers: ['line2'], isHub: true, lat: 37.4934, lng: 127.0142, mx: 540, my: 730 },
  { id: '312', name: '양재', line: 'line3', transfers: ['shinbundang'], isHub: true, lat: 37.4842, lng: 127.0347, mx: 610, my: 800 },

  // 4호선
  { id: '401', name: '혜화', line: 'line4', transfers: [], lat: 37.5823, lng: 127.0018, mx: 630, my: 230 },
  { id: '402', name: '명동', line: 'line4', transfers: [], isHub: true, crowded: true, lat: 37.5609, lng: 126.9863, mx: 530, my: 350 },
  { id: '403', name: '회현', line: 'line4', transfers: [], lat: 37.5585, lng: 126.9782, mx: 495, my: 355 },
  { id: '404', name: '삼각지', line: 'line4', transfers: ['line6'], isHub: true, lat: 37.5347, lng: 126.9731, mx: 470, my: 480 },
  { id: '405', name: '이촌', line: 'line4', transfers: ['gyeongui'], isHub: true, lat: 37.5222, lng: 126.9744, mx: 470, my: 540 },
  { id: '406', name: '동작', line: 'line4', transfers: ['line9'], isHub: true, lat: 37.5028, lng: 126.9778, mx: 460, my: 620 },
  { id: '407', name: '사당(4호선)', line: 'line4', transfers: ['line2'], isHub: true, crowded: true, lat: 37.4765, lng: 126.9816, mx: 440, my: 760 },

  // 5호선
  { id: '501', name: '여의도', line: 'line5', transfers: ['line9'], isHub: true, crowded: true, lat: 37.5216, lng: 126.9242, mx: 330, my: 460 },
  { id: '502', name: '마포', line: 'line5', transfers: [], lat: 37.5396, lng: 126.9459, mx: 390, my: 420 },
  { id: '503', name: '공덕', line: 'line5', transfers: ['line6', 'arex', 'gyeongui'], isHub: true, crowded: true, lat: 37.5444, lng: 126.9515, mx: 420, my: 390 },
  { id: '504', name: '광화문', line: 'line5', transfers: [], isHub: true, crowded: true, lat: 37.5716, lng: 126.9765, mx: 490, my: 270 },

  // 7호선
  { id: '701', name: '건대입구(7호선)', line: 'line7', transfers: ['line2'], isHub: true, lat: 37.5404, lng: 127.0692, mx: 800, my: 500 },
  { id: '702', name: '청담', line: 'line7', transfers: [], lat: 37.5194, lng: 127.0537, mx: 720, my: 570 },
  { id: '703', name: '강남구청', line: 'line7', transfers: ['suin'], isHub: true, lat: 37.5172, lng: 127.0412, mx: 670, my: 600 },
  { id: '704', name: '논현', line: 'line7', transfers: ['shinbundang'], isHub: true, lat: 37.5111, lng: 127.0215, mx: 580, my: 650 },
  { id: '705', name: '학동', line: 'line7', transfers: [], lat: 37.5143, lng: 127.0316, mx: 630, my: 630 },
  { id: '706', name: '고속터미널(7호선)', line: 'line7', transfers: ['line3', 'line9'], isHub: true, crowded: true, lat: 37.5049, lng: 127.0049, mx: 500, my: 670 },
  { id: '707', name: '총신대입구(이수)', line: 'line7', transfers: ['line4'], isHub: true, lat: 37.4862, lng: 126.9822, mx: 440, my: 710 },

  // 9호선
  { id: '901', name: '김포공항', line: 'line9', transfers: ['line5', 'arex'], isHub: true, lat: 37.5623, lng: 126.8013, mx: 120, my: 380 },
  { id: '902', name: '당산(9호선)', line: 'line9', transfers: ['line2'], isHub: true, lat: 37.5349, lng: 126.9027, mx: 240, my: 400 },
  { id: '903', name: '국회의사당', line: 'line9', transfers: [], lat: 37.5281, lng: 126.9174, mx: 300, my: 440 },
  { id: '904', name: '여의도(9호선)', line: 'line9', transfers: ['line5'], isHub: true, crowded: true, lat: 37.5216, lng: 126.9242, mx: 350, my: 460 },
  { id: '905', name: '노량진(9호선)', line: 'line9', transfers: ['line1'], isHub: true, lat: 37.5142, lng: 126.9425, mx: 400, my: 520 },
  { id: '906', name: '고속터미널(9호선)', line: 'line9', transfers: ['line3', 'line7'], isHub: true, crowded: true, lat: 37.5049, lng: 127.0049, mx: 520, my: 650 },
  { id: '907', name: '신논현', line: 'line9', transfers: ['shinbundang'], isHub: true, crowded: true, lat: 37.5045, lng: 127.0253, mx: 580, my: 710 },
  { id: '908', name: '선정릉', line: 'line9', transfers: ['suin'], isHub: true, lat: 37.5109, lng: 127.0439, mx: 660, my: 690 },
  { id: '909', name: '봉은사', line: 'line9', transfers: [], lat: 37.5144, lng: 127.0602, mx: 710, my: 670 },
  { id: '910', name: '종합운동장(9호선)', line: 'line9', transfers: ['line2'], isHub: true, lat: 37.5110, lng: 127.0736, mx: 760, my: 670 },

  // 신분당선
  { id: 'S01', name: '신사(신분당)', line: 'shinbundang', transfers: ['line3'], isHub: true, lat: 37.5163, lng: 127.0205, mx: 580, my: 590 },
  { id: 'S02', name: '논현(신분당)', line: 'shinbundang', transfers: ['line7'], isHub: true, lat: 37.5111, lng: 127.0215, mx: 580, my: 630 },
  { id: 'S03', name: '신논현(신분당)', line: 'shinbundang', transfers: ['line9'], isHub: true, lat: 37.5045, lng: 127.0253, mx: 580, my: 690 },
  { id: 'S04', name: '강남(신분당)', line: 'shinbundang', transfers: ['line2'], isHub: true, crowded: true, lat: 37.4979, lng: 127.0276, mx: 580, my: 770 },
  { id: 'S05', name: '양재(신분당)', line: 'shinbundang', transfers: ['line3'], isHub: true, lat: 37.4842, lng: 127.0347, mx: 600, my: 820 },
  { id: 'S06', name: '판교', line: 'shinbundang', transfers: [], isHub: true, crowded: true, lat: 37.3948, lng: 127.1112, mx: 680, my: 920 }
];

const FACTIONS = [
  { id: 'line2_crew', name: '2호선 순환단', color: '#00A84D', badge: '🟢', slogan: '끝나지 않는 순환의 힘' },
  { id: 'line9_rush', name: '9호선 급행연합', color: '#BDB092', badge: '🟡', slogan: '빛보다 빠른 황금 급행' },
  { id: 'line1_pioneer', name: '1호선 개척자', color: '#0052A4', badge: '🔵', slogan: '대한민국 철도의 근본' },
  { id: 'night_escape', name: '야근탈출단', color: '#996CAC', badge: '🟣', slogan: '정시 퇴근은 우리의 권리' },
  { id: 'salaried_union', name: '직장인연합', color: '#EF7C1C', badge: '💼', slogan: '내일의 월급을 향하여' }
];

// 하버사인(Haversine) 공식을 활용한 두 좌표 간 거리 계산 함수 (단위: 미터)
function calculateGpsDistanceMeters(lat1, lon1, lat2, lon2) {
  const R = 6371e3; // 지구 반경 (미터)
  const phi1 = (lat1 * Math.PI) / 180;
  const phi2 = (lat2 * Math.PI) / 180;
  const deltaPhi = ((lat2 - lat1) * Math.PI) / 180;
  const deltaLambda = ((lon2 - lon1) * Math.PI) / 180;

  const a = Math.sin(deltaPhi / 2) * Math.sin(deltaPhi / 2) +
            Math.cos(phi1) * Math.cos(phi2) *
            Math.sin(deltaLambda / 2) * Math.sin(deltaLambda / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

  return Math.round(R * c);
}

module.exports = {
  LINES,
  STATIONS,
  FACTIONS,
  calculateGpsDistanceMeters,
  STATION_GPS_THRESHOLD_METERS: 800 // 정차역 도달 판정 거리 (800m)
};
