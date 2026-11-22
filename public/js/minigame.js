/**
 * Minigame.js - 정차 제동 타이밍 미션 (10~15초 소요)
 * 지하철 이동 중 가볍고 재미있게 수행하는 직관적 타이밍 미니게임
 */

class TransitMiniGame {
  constructor(onSuccess, onFail) {
    this.onSuccess = onSuccess;
    this.onFail = onFail;
    
    this.track = document.getElementById('gameTrack');
    this.cursor = document.getElementById('gameTrainCursor');
    this.targetZone = document.getElementById('gameTargetZone');
    this.timerText = document.getElementById('gameTimerText');
    this.brakeBtn = document.getElementById('btnBrakeAction');

    this.position = 0;
    this.speed = 2.5;
    this.direction = 1;
    this.animId = null;
    this.remainingSec = 10;
    this.timerInterval = null;
    this.isPlaying = false;

    this.bindEvents();
  }

  bindEvents() {
    this.brakeBtn.addEventListener('click', () => {
      if (!this.isPlaying) return;
      this.checkResult();
    });
  }

  start() {
    this.isPlaying = true;
    this.position = 5;
    this.speed = 1.8 + Math.random() * 1.2; // 약간의 랜덤 속도
    this.direction = 1;
    this.remainingSec = 10;
    this.brakeBtn.disabled = false;
    this.brakeBtn.textContent = '제동 브레이크 걸기!';

    // 목표 존 랜덤 배치 (50% ~ 80% 사이)
    const targetLeft = 45 + Math.floor(Math.random() * 30);
    this.targetZone.style.left = targetLeft + '%';
    this.targetLeft = targetLeft;
    this.targetWidth = 25; // 25% 폭

    this.timerText.textContent = `남은 시간: ${this.remainingSec}초`;

    // 타이머
    clearInterval(this.timerInterval);
    this.timerInterval = setInterval(() => {
      this.remainingSec--;
      this.timerText.textContent = `남은 시간: ${this.remainingSec}초`;
      if (this.remainingSec <= 0) {
        this.stop();
        if (this.onFail) this.onFail('시간 초과! 다음 역에서 다시 도전하세요.');
      }
    }, 1000);

    // 애니메이션 루프
    const loop = () => {
      if (!this.isPlaying) return;
      this.position += this.speed * this.direction;
      if (this.position >= 95) {
        this.position = 95;
        this.direction = -1;
      } else if (this.position <= 5) {
        this.position = 5;
        this.direction = 1;
      }

      this.cursor.style.left = this.position + '%';
      this.animId = requestAnimationFrame(loop);
    };
    this.animId = requestAnimationFrame(loop);
  }

  stop() {
    this.isPlaying = false;
    cancelAnimationFrame(this.animId);
    clearInterval(this.timerInterval);
  }

  checkResult() {
    this.stop();
    this.brakeBtn.disabled = true;

    // 타겟 존 내에 커서가 들어왔는지 검사
    const targetRight = this.targetLeft + this.targetWidth;
    const isSuccess = (this.position >= this.targetLeft - 2 && this.position <= targetRight + 2);

    if (isSuccess) {
      this.brakeBtn.textContent = '🎉 정차 성공 (PERFECT!)';
      setTimeout(() => {
        if (this.onSuccess) this.onSuccess();
      }, 500);
    } else {
      this.brakeBtn.textContent = '💥 제동 실패 (정차 존 이탈)';
      setTimeout(() => {
        if (this.onFail) this.onFail('목표 구역에 안착하지 못했습니다. 다시 시도해보세요!');
      }, 700);
    }
  }
}
