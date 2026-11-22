/**
 * Simulator.js - 가상 지하철 탑승 & 이동 시뮬레이터
 * 실제 지하철 탑승뿐만 아니라 모의 주행을 통해 출퇴근 미션을 테스트할 수 있도록 지원
 */

class SubwaySimulator {
  constructor(onStationChange) {
    this.onStationChange = onStationChange;
    this.isRunning = false;
    this.currentLineId = 'line2';
    this.directionIdx = 0;
    this.stationSequence = ['222', '221', '220', '219', '218', '216', '214', '212', '211', '208', '206', '205', '204', '203', '202', '201', '243', '241', '240', '239', '238', '237', '236', '235', '234', '232', '230', '228', '226', '224', '223']; // 2호선 순환
    this.currentIndex = 0; // 강남역 시작
    this.intervalId = null;
  }

  getCurrentStationId() {
    return this.stationSequence[this.currentIndex];
  }

  // 다음 역으로 수동/자동 이동
  nextStation() {
    this.currentIndex = (this.currentIndex + 1) % this.stationSequence.length;
    const stId = this.getCurrentStationId();
    if (this.onStationChange) {
      this.onStationChange(stId);
    }
    return stId;
  }

  startAutoTransit(intervalSec = 25) {
    this.isRunning = true;
    this.intervalId = setInterval(() => {
      this.nextStation();
    }, intervalSec * 1000);
  }

  stopAutoTransit() {
    this.isRunning = false;
    clearInterval(this.intervalId);
  }
}
