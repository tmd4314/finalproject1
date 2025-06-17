// services/dashboardService.js - 대시보드 비즈니스 로직
const mapper = require('../database/mapper');

// 실제 제품별 색상 매핑
const productColors = {
  // 타이레놀 계열 (빨간색 계열)
  '타이레놀정8시간 ER': '#FF6B9D',
  '타이레놀정500mg': '#FF4757',
  '타이레놀우먼스정': '#FF3838',
  
  // 게보린 계열 (파란색 계열)
  '게보린정': '#4ECDC4',
  '게보린브이정': '#45B7D1',
  
  // 훼스탈 계열 (초록/보라색 계열)
  '훼스탈플러스정': '#96CEB4',
  '훼스탈골드정': '#6C5CE7',
  
  // 베아제 계열 (보라색 계열)
  '베아제정': '#A29BFE',
  '닥터베아제정': '#B19CD9',
  
  // 판크레아정 (주황색 계열)
  '판크레아정': '#FECA57',
  
  // 그날엔 계열 (분홍색 계열)
  '그날엔큐정': '#FF9FF3',
  '그날엔정': '#FDA7DF',
  
  // 기타
  '기타': '#C7ECEE'
};

class DashboardService {
  
  /**
   * 대시보드 전체 데이터 조회 (최적화된 버전)
   */
  async getDashboardSummary() {
    try {
      console.log('대시보드 데이터 조회 시작...', new Date().toISOString());
      
      // 병렬로 모든 데이터 조회 (포장 현황 제거 - 이미 processStatus에 포함)
      const [
        orderStats,
        equipmentEfficiency,
        equipmentMonthly,
        productionMonthly,
        qualityStats,
        processStatus,
        productRatios
      ] = await Promise.all([
        this.getOrderStats(),
        this.getEquipmentEfficiency(),
        this.getEquipmentMonthly(),
        this.getProductionMonthly(),
        this.getQualityStats(),
        this.getProcessStatus(),
        this.getProductRatios()
      ]);

      // 조회 결과 로깅
      console.log('대시보드 데이터 조회 결과:');
      console.log('  - 주문 통계:', orderStats);
      console.log('  - 설비 효율:', equipmentEfficiency);
      console.log('  - 생산량 데이터:', productionMonthly?.length || 0, '건');
      console.log('  - 제품 비율:', productRatios?.length || 0, '건');
      console.log('  - 공정 현황:', processStatus?.length || 0, '건');

      const result = {
        stats: {
          totalOrders: Number(orderStats?.totalOrders) || 0,
          equipmentEfficiency: Number(equipmentEfficiency?.efficiency) || 0,
          avgDeliveryDays: Number(orderStats?.avgDeliveryDays) || 0,
          qualityPassRate: Number(qualityStats?.passRate) || 0
        },
        productionData: this.validateProductionData(productionMonthly),
        equipmentData: this.validateEquipmentData(equipmentMonthly),
        productRatios: this.formatProductRatios(productRatios),
        processStatus: this.formatProcessStatus(processStatus)
      };

      console.log('대시보드 데이터 조회 완료');
      return result;

    } catch (error) {
      console.error('대시보드 데이터 조회 실패:', error.message);
      console.error('Stack:', error.stack);
      throw new Error('대시보드 데이터 조회 중 오류가 발생했습니다.');
    }
  }

  /**
   * 주문 통계 조회
   */
  async getOrderStats() {
    try {
      const result = await mapper.query('dashboardOrderStats');
      console.log('주문 통계 조회 결과:', result);
      return result[0] || { totalOrders: 0, avgDeliveryDays: 0 };
    } catch (error) {
      console.error('주문 통계 조회 실패:', error.message);
      return { totalOrders: 0, avgDeliveryDays: 0 };
    }
  }

  /**
   * 설비 효율 조회
   */
  async getEquipmentEfficiency() {
    try {
      const result = await mapper.query('dashboardEquipmentEfficiency');
      console.log('설비 효율 조회 결과:', result);
      return result[0] || { efficiency: 0 };
    } catch (error) {
      console.error('설비 효율 조회 실패:', error.message);
      return { efficiency: 0 };
    }
  }

  /**
   * 설비 월별 가동률 조회
   */
  async getEquipmentMonthly() {
    try {
      const result = await mapper.query('dashboardEquipmentMonthly');
      console.log('설비 월별 데이터:', result);
      return result || [];
    } catch (error) {
      console.error('설비 월별 데이터 조회 실패:', error.message);
      return [];
    }
  }

  /**
   * 월별 생산량 조회
   */
  async getProductionMonthly() {
    try {
      const result = await mapper.query('dashboardProductionMonthly');
      console.log('생산량 월별 데이터:', result);
      return result || [];
    } catch (error) {
      console.error('생산량 월별 데이터 조회 실패:', error.message);
      return [];
    }
  }

  /**
   * 품질 합격률 조회
   */
  async getQualityStats() {
    try {
      const result = await mapper.query('dashboardQualityPassRate');
      console.log('품질 통계 조회 결과:', result);
      return result[0] || { passRate: 0 };
    } catch (error) {
      console.error('품질 통계 조회 실패:', error.message);
      return { passRate: 0 };
    }
  }

  /**
   * 공정별 현황 조회 (포장 포함)
   */
  async getProcessStatus() {
    try {
      const result = await mapper.query('dashboardProcessStatus');
      console.log('공정 현황 조회 결과:', result);
      return result || [];
    } catch (error) {
      console.error('공정 현황 조회 실패:', error.message);
      return [];
    }
  }

  /**
   * 포장 현황 조회 (개별 조회용)
   */
  async getPackagingStatus() {
    try {
      const result = await mapper.query('dashboardPackagingStatus');
      console.log('포장 현황 조회 결과:', result);
      return result[0] || { packagingRate: 0 };
    } catch (error) {
      console.error('포장 현황 조회 실패:', error.message);
      return { packagingRate: 0 };
    }
  }

  /**
   * 제품별 주문 비율 조회
   */
  async getProductRatios() {
    try {
      const result = await mapper.query('dashboardProductRatios');
      console.log('제품 비율 조회 결과:', result);
      return result || [];
    } catch (error) {
      console.error('제품 비율 조회 실패:', error.message);
      return [];
    }
  }

  /**
   * 생산량 데이터 검증
   */
  validateProductionData(data) {
    if (!Array.isArray(data)) return [];
    
    return data.map(item => ({
      month: String(item.month).padStart(2, '0'),
      value: Number(item.value) || 0
    }));
  }

  /**
   * 설비 데이터 검증 
   */
  validateEquipmentData(data) {
    if (!Array.isArray(data)) return [];
    
    return data.map(item => Number(item.efficiency) || 0);
  }

  /**
   * 제품 비율 데이터 포맷팅 (색상 추가)
   */
  formatProductRatios(data) {
    if (!Array.isArray(data)) return [];
    
    return data.map((item, index) => ({
      name: String(item.name || '제품명없음'),
      value: Number(item.value) || 0,
      color: productColors[item.name] || this.getRandomColor(index)
    }));
  }

  /**
   * 공정 현황 데이터 포맷팅 (수정된 버전 - 포장 포함)
   */
  formatProcessStatus(data) {
    const processMap = {
      'MATERIAL': 'material',
      'PRODUCTION': 'production', 
      'QUALITY': 'quality',
      'PACKAGING': 'packaging',  
      'SHIPPING': 'shipping'
    };

    const result = {
      material: 0,
      production: 0,
      quality: 0,
      packaging: 0,
      shipping: 0
    };

    if (Array.isArray(data)) {
      data.forEach(item => {
        const key = processMap[item.process_type];
        if (key) {
          result[key] = Number(item.rate) || 0;
        }
      });
    }

    console.log('공정 현황 포맷팅 결과:', result);
    return result;
  }

  /**
   * 랜덤 색상 생성
   */
  getRandomColor(index) {
    const colors = [
      '#FF6B9D', '#4ECDC4', '#45B7D1', '#96CEB4', 
      '#FECA57', '#FF9FF3', '#C7ECEE', '#B19CD9',
      '#6C5CE7', '#FDA7DF', '#FF4757', '#FF3838'
    ];
    return colors[index % colors.length];
  }
}

module.exports = new DashboardService();