// routers/dashboardRouter.js - 대시보드 라우터 (완전 공개)
const express = require('express');
const router = express.Router();
const dashboardService = require('../services/dashboardService');

// ================================
//  모든 대시보드 엔드포인트는 완전 공개
// 로그인 없이 누구나 접근 가능
// ================================

/**
 *  대시보드 통계 데이터 조회 (공개)
 * GET /dashboard/summary
 */
router.get('/summary', async (req, res) => {
  try {
    console.log(' 대시보드 API 호출 (공개):', {
      timestamp: new Date().toISOString(),
      ip: req.ip,
      userAgent: req.get('User-Agent')
    });
    
    const dashboardData = await dashboardService.getDashboardSummary();
    
    console.log(' 대시보드 API 응답 성공 (공개):', {
      timestamp: new Date().toISOString(),
      dataKeys: Object.keys(dashboardData)
    });
    
    //  공개 접근 헤더 추가
    res.header('Access-Control-Allow-Origin', '*');
    res.header('Access-Control-Allow-Methods', 'GET');
    res.header('Cache-Control', 'no-cache, no-store, must-revalidate');
    
    res.json(dashboardData);
    
  } catch (error) {
    console.error(' 대시보드 API 에러:', {
      message: error.message,
      stack: error.stack,
      timestamp: new Date().toISOString(),
      ip: req.ip
    });
    
    res.status(500).json({ 
      error: '대시보드 데이터 조회 실패',
      message: process.env.NODE_ENV === 'development' ? error.message : '서버 내부 오류',
      timestamp: new Date().toISOString(),
      code: 'DASHBOARD_ERROR'
    });
  }
});

/**
 *  헬스체크 엔드포인트 (공개)
 * GET /dashboard/health
 */
router.get('/health', (req, res) => {
  console.log(' 헬스체크 요청 (공개):', new Date().toISOString());
  
  res.json({
    status: 'OK',
    service: 'Dashboard API (Public)',
    version: '1.0.0',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    access: 'PUBLIC - No Authentication Required',
    endpoints: {
      summary: '/dashboard/summary',
      health: '/dashboard/health',
      orders: '/dashboard/orders',
      equipment: '/dashboard/equipment',
      products: '/dashboard/products',
      packaging: '/dashboard/packaging',
      production: '/dashboard/production',
      materials: '/dashboard/materials',
      quality: '/dashboard/quality'
    },
    database: {
      status: 'connected',
      queries: [
        'dashboardOrderStats',
        'dashboardEquipmentEfficiency',
        'dashboardProductionMonthly',
        'dashboardQualityPassRate',
        'dashboardProcessStatus',
        'dashboardPackagingStatus',
        'dashboardProductRatios'
      ]
    }
  });
});

// ================================
//  개별 통계 조회 엔드포인트들 (모두 공개)
// ================================

//  주문 통계만 조회 (공개)
router.get('/orders', async (req, res) => {
  try {
    console.log(' 주문 통계 개별 조회 요청 (공개)');
    const orderStats = await dashboardService.getOrderStats();
    res.json({
      data: orderStats,
      timestamp: new Date().toISOString(),
      type: 'order_statistics',
      access: 'public'
    });
  } catch (error) {
    console.error(' 주문 통계 조회 실패:', error.message);
    res.status(500).json({ 
      error: '주문 통계 조회 실패',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

//  설비 효율만 조회 (공개)
router.get('/equipment', async (req, res) => {
  try {
    console.log(' 설비 효율 개별 조회 요청 (공개)');
    const equipmentStats = await dashboardService.getEquipmentEfficiency();
    const equipmentMonthly = await dashboardService.getEquipmentMonthly();
    
    res.json({
      data: {
        current: equipmentStats,
        monthly: equipmentMonthly
      },
      timestamp: new Date().toISOString(),
      type: 'equipment_statistics',
      access: 'public'
    });
  } catch (error) {
    console.error(' 설비 효율 조회 실패:', error.message);
    res.status(500).json({ 
      error: '설비 효율 조회 실패',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

//  제품 비율만 조회 (공개)
router.get('/products', async (req, res) => {
  try {
    console.log(' 제품 비율 개별 조회 요청 (공개)');
    const productRatios = await dashboardService.getProductRatios();
    const formattedRatios = dashboardService.formatProductRatios(productRatios);
    
    res.json({
      data: formattedRatios,
      timestamp: new Date().toISOString(),
      type: 'product_ratios',
      access: 'public'
    });
  } catch (error) {
    console.error(' 제품 비율 조회 실패:', error.message);
    res.status(500).json({ 
      error: '제품 비율 조회 실패',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

//  포장 현황만 조회 (공개)
router.get('/packaging', async (req, res) => {
  try {
    console.log(' 포장 현황 개별 조회 요청 (공개)');
    const packagingStatus = await dashboardService.getPackagingStatus();
    
    res.json({
      data: packagingStatus,
      timestamp: new Date().toISOString(),
      type: 'packaging_status',
      access: 'public'
    });
  } catch (error) {
    console.error(' 포장 현황 조회 실패:', error.message);
    res.status(500).json({ 
      error: '포장 현황 조회 실패',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

//  생산량만 조회 (공개)
router.get('/production', async (req, res) => {
  try {
    console.log(' 생산량 개별 조회 요청 (공개)');
    const productionMonthly = await dashboardService.getProductionMonthly();
    const validatedData = dashboardService.validateProductionData(productionMonthly);
    
    res.json({
      data: validatedData,
      timestamp: new Date().toISOString(),
      type: 'production_statistics',
      access: 'public',
      summary: {
        totalMonths: validatedData.length,
        totalProduction: validatedData.reduce((sum, item) => sum + item.value, 0),
        averageMonthly: validatedData.length > 0 
          ? Math.round(validatedData.reduce((sum, item) => sum + item.value, 0) / validatedData.length)
          : 0
      }
    });
  } catch (error) {
    console.error(' 생산량 조회 실패:', error.message);
    res.status(500).json({ 
      error: '생산량 조회 실패',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

//  자재 및 공정 현황 조회 (공개)
router.get('/materials', async (req, res) => {
  try {
    console.log(' 자재 및 공정 현황 개별 조회 요청 (공개)');
    const processStatus = await dashboardService.getProcessStatus();
    const formattedStatus = dashboardService.formatProcessStatus(processStatus);
    
    res.json({
      data: {
        processStatus: formattedStatus,
        details: {
          material: formattedStatus.material,
          production: formattedStatus.production,
          quality: formattedStatus.quality,
          packaging: formattedStatus.packaging,
          shipping: formattedStatus.shipping
        }
      },
      timestamp: new Date().toISOString(),
      type: 'materials_and_process_status',
      access: 'public'
    });
  } catch (error) {
    console.error(' 자재 및 공정 현황 조회 실패:', error.message);
    res.status(500).json({ 
      error: '자재 및 공정 현황 조회 실패',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

//  품질 현황만 조회 (공개)
router.get('/quality', async (req, res) => {
  try {
    console.log(' 품질 현황 개별 조회 요청 (공개)');
    const qualityStats = await dashboardService.getQualityStats();
    
    res.json({
      data: qualityStats,
      timestamp: new Date().toISOString(),
      type: 'quality_statistics',
      access: 'public'
    });
  } catch (error) {
    console.error(' 품질 현황 조회 실패:', error.message);
    res.status(500).json({ 
      error: '품질 현황 조회 실패',
      message: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;