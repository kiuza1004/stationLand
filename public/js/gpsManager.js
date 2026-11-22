/**
 * GpsManager.js - 실제 승객용 실시간 GPS 위치 추적 & 정차역 일치 판정 모듈
 * HTML5 Geolocation API 기반 (비용 0원)
 */

class GpsLocationManager {
  constructor() {
    this.currentCoords = null; // { latitude, longitude, accuracy }
    this.watchId = null;
    this.isTracking = false;
    this.lastCheckedTime = 0;
    this.onLocationUpdate = null;
    this.permissionState = 'prompt'; // 'granted', 'denied', 'prompt'
  }

  // GPS 추적 시작 (실제 모드 진입 시)
  startTracking(onUpdate) {
    this.onLocationUpdate = onUpdate;
    if (!('geolocation' in navigator)) {
      console.warn('이 브라우저는 Geolocation을 지원하지 않습니다.');
      return false;
    }

    this.isTracking = true;
    
    // 1회 즉시 조회
    navigator.geolocation.getCurrentPosition(
      (pos) => this.handleSuccess(pos),
      (err) => this.handleError(err),
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 5000 }
    );

    // 실시간 이동 추적
    this.watchId = navigator.geolocation.watchPosition(
      (pos) => this.handleSuccess(pos),
      (err) => this.handleError(err),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );

    return true;
  }

  stopTracking() {
    if (this.watchId !== null) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
    this.isTracking = false;
  }

  handleSuccess(position) {
    this.currentCoords = {
      latitude: position.coords.latitude,
      longitude: position.coords.longitude,
      accuracy: Math.round(position.coords.accuracy)
    };
    this.permissionState = 'granted';
    this.lastCheckedTime = Date.now();

    if (this.onLocationUpdate) {
      this.onLocationUpdate(this.currentCoords);
    }
  }

  handleError(error) {
    if (error.code === 1) { // PERMISSION_DENIED
      this.permissionState = 'denied';
    }
    console.warn('GPS 수신 에러:', error.message);
  }

  // 특정 역과의 거리 계산 및 일치 여부 판정 (임계치 800m 이내)
  checkStationProximity(stationId) {
    if (!this.currentCoords) {
      return {
        hasGps: false,
        isMatch: false,
        distanceMeters: null,
        message: 'GPS 신호를 수신하는 중입니다. 스마트폰 위치 권한을 확인해주세요.'
      };
    }

    const { STATIONS, STATION_GPS_THRESHOLD_METERS, calculateGpsDistanceMeters } = window.SUBWAY_DATA;
    const target = STATIONS.find(s => s.id === stationId);
    if (!target || !target.lat || !target.lng) {
      return {
        hasGps: true,
        isMatch: true, // 좌표 미등록 시 통과
        distanceMeters: 0,
        message: '해당 역의 GPS 좌표 정보가 없습니다.'
      };
    }

    const dist = calculateGpsDistanceMeters(
      this.currentCoords.latitude,
      this.currentCoords.longitude,
      target.lat,
      target.lng
    );

    const isMatch = (dist <= STATION_GPS_THRESHOLD_METERS);
    return {
      hasGps: true,
      isMatch,
      distanceMeters: dist,
      stationName: target.name,
      threshold: STATION_GPS_THRESHOLD_METERS,
      message: isMatch
        ? `📍 현재 위치 일치 (${target.name}역에서 ${dist}m 거리) - 체크인 가능!`
        : `⚠️ 정차역 불일치 (${target.name}역에서 ${dist >= 1000 ? (dist/1000).toFixed(1) + 'km' : dist + 'm'} 거리) - ${target.name}역에 실제로 접근해야 체크인할 수 있습니다.`
    };
  }

  // 현재 내 위치에서 가장 가까운 지하철역 자동 탐색
  findNearestStation() {
    if (!this.currentCoords) return null;
    const { STATIONS, calculateGpsDistanceMeters } = window.SUBWAY_DATA;

    let nearest = null;
    let minDistance = Infinity;

    for (const st of STATIONS) {
      if (!st.lat || !st.lng) continue;
      const d = calculateGpsDistanceMeters(
        this.currentCoords.latitude,
        this.currentCoords.longitude,
        st.lat,
        st.lng
      );
      if (d < minDistance) {
        minDistance = d;
        nearest = st;
      }
    }

    return nearest ? { station: nearest, distance: minDistance } : null;
  }
}

window.gpsManager = new GpsLocationManager();
