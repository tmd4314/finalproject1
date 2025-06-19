// server/routers/lineRouter.js
const express = require('express');
const router = express.Router();
const lineService = require('../services/lineService.js');

// 로그인 사원 정보 추출 미들웨어
const extractEmployeeInfo = (req, res, next) => {
  try {
    // 세션 방식
    if (req.session && req.session.user) {
      req.currentEmployee = {
        employee_id: req.session.user.employee_id,
        employee_name: req.session.user.employee_name
      };
    }
    // JWT 토큰 방식 (예시)
    else if (req.headers.authorization) {
      const token = req.headers.authorization.split(' ')[1];
      // 임시로 기본값 설정 (실제 JWT 디코딩 로직으로 교체 필요)
      req.currentEmployee = {
        employee_id: 2,
        employee_name: '관리자'
      };
    }
    // 쿠키 방식 (예시)
    else if (req.cookies && req.cookies.user_info) {
      try {
        const userInfo = JSON.parse(req.cookies.user_info);
        req.currentEmployee = {
          employee_id: userInfo.employee_id,
          employee_name: userInfo.employee_name
        };
      } catch (cookieError) {
        console.warn('쿠키 파싱 실패:', cookieError);
      }
    }
    // 개발용 기본값 (실제 운영에서는 제거)
    else {
      console.warn('로그인 정보 없음 - 개발용 기본값 사용');
      req.currentEmployee = {
        employee_id: 2,
        employee_name: '관리자'
      };
    }
    
    console.log('추출된 사원 정보:', req.currentEmployee);
    next();
  } catch (error) {
    console.error('사원 정보 추출 실패:', error);
    // 에러 시에도 기본값으로 계속 진행
    req.currentEmployee = {
      employee_id: 2,
      employee_name: '관리자'
    };
    next();
  }
};

// ========== GET 라우터들 (구체적인 경로 먼저) ==========

// 전체 라인 목록 조회 (통합: 마스터 + 최신 상태 + 제품정보 + 공통코드)
router.get('/list', async (req, res) => {
  try {
    console.log('라인 목록 조회 API 호출');
    const lineList = await lineService.getLineList();
    
    res.json({
      success: true,
      data: lineList,
      total: lineList.length,
      message: '라인 목록 조회 성공'
    });
    
  } catch (err) {
    console.error('라인 목록 조회 실패:', err);
    res.status(500).json({
      success: false,
      data: [],
      message: '라인 목록을 불러올 수 없습니다.',
      error: err.message
    });
  }
});

// 사용 가능한 라인 ID 목록 조회
router.get('/available-ids', async (req, res) => {
  try {
    console.log('사용 가능한 라인 ID 조회 API 호출');
    const availableIds = await lineService.getAvailableLineIds();
    
    res.json({
      success: true,
      data: availableIds,
      message: '사용 가능한 라인 ID 조회 성공'
    });
    
  } catch (err) {
    console.error('사용 가능한 라인 ID 조회 실패:', err);
    
    // 에러 시 기본 라인 ID 목록 반환
    const defaultIds = ['F', 'G', 'H', 'I', 'J', 'K', 'L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S', 'T', 'U', 'V', 'W', 'X', 'Y', 'Z'];
    res.json({
      success: true,
      data: defaultIds,
      message: '기본 라인 ID 목록 조회 (API 에러로 인한 기본값)'
    });
  }
});

// 사용 가능한 제품코드 목록 조회 API (라인별 격리 적용) - 개선된 에러 처리
router.get('/available-products', async (req, res) => {
  try {
    console.log('사용 가능한 제품코드 조회 API 호출');
    
    // 쿼리 파라미터로 라인 코드 받기
    const lineCode = req.query.lineCode;
    
    if (lineCode) {
      console.log(`${lineCode}라인 전용 제품코드 조회`);
    } else {
      console.log('전체 제품코드 조회 (관리자 모드)');
    }
    
    const products = await lineService.getAvailableProducts(lineCode);
    
    res.json({
      success: true,
      data: products,
      total: products.length,
      lineCode: lineCode || null,
      message: lineCode ? 
        `${lineCode}라인 제품코드 조회 성공` : 
        '전체 제품코드 조회 성공'
    });
    
  } catch (err) {
    console.error('사용 가능한 제품코드 조회 실패:', err);
    
    // 에러 시 기본 제품코드 목록 반환
    const defaultProducts = [
      { product_code: 'BJA-DR-10', product_name: '10정 블리스터 포장', product_type: 'TABLET', package_type: 'BLISTER' },
      { product_code: 'BJA-DR-30', product_name: '30정 블리스터 포장', product_type: 'TABLET', package_type: 'BLISTER' },
      { product_code: 'BJA-DR-60', product_name: '60정 블리스터 포장', product_type: 'TABLET', package_type: 'BLISTER' },
      { product_code: 'BJA-BT-100', product_name: '100정 병 포장', product_type: 'TABLET', package_type: 'BOTTLE' }
    ];
    
    res.json({
      success: true,
      data: defaultProducts,
      total: defaultProducts.length,
      message: '기본 제품코드 목록 조회 (API 에러로 인한 기본값)'
    });
  }
});

// 사용 가능한 담당자 목록 조회 API - 개선된 에러 처리
router.get('/available-employees', async (req, res) => {
  try {
    console.log('사용 가능한 담당자 목록 조회 API 호출');
    const employees = await lineService.getAvailableEmployees();
    
    res.json({
      success: true,
      data: employees,
      total: employees.length,
      message: '담당자 목록 조회 성공'
    });
    
  } catch (err) {
    console.error('담당자 목록 조회 실패:', err);
    
    // 에러 시 기본 담당자 목록 반환
    const defaultEmployees = [
      { employee_id: 2, employee_name: '김홍인' },
      { employee_id: 3, employee_name: '김다산' },
      { employee_id: 4, employee_name: '최현석' },
      { employee_id: 5, employee_name: '이승민' }
    ];
    
    res.json({
      success: true,
      data: defaultEmployees,
      total: defaultEmployees.length,
      message: '기본 담당자 목록 조회 (API 에러로 인한 기본값)'
    });
  }
});

// 사용 가능한 설비명 목록 조회 API (설비명 중복 방지) - 개선된 에러 처리
router.get('/available-equipments', async (req, res) => {
  try {
    console.log('사용 가능한 설비명 목록 조회 API 호출');
    
    // 쿼리 파라미터로 제외할 라인 ID 받기 (라인 수정 시 사용)
    const excludeLineId = req.query.excludeLineId;
    
    if (excludeLineId) {
      console.log('라인 수정 모드 - 제외할 라인 ID:', excludeLineId);
    }
    
    const equipments = await lineService.getAvailableEquipments(excludeLineId);
    
    res.json({
      success: true,
      data: equipments,
      total: equipments.length,
      message: '설비명 목록 조회 성공',
      excludedLine: excludeLineId || null
    });
    
  } catch (err) {
    console.error('설비명 목록 조회 실패:', err);
    
    // 에러 시 기본 설비명 목록 반환
    const defaultEquipments = [
      { eq_name: '10정 블리스터 포장기', line_type: 'INNER', eq_type: 'INNER' },
      { eq_name: '30정 블리스터 포장기', line_type: 'INNER', eq_type: 'INNER' },
      { eq_name: '소형 카톤포장기', line_type: 'OUTER', eq_type: 'OUTER' },
      { eq_name: '중형 카톤포장기', line_type: 'OUTER', eq_type: 'OUTER' }
    ];
    
    res.json({
      success: true,
      data: defaultEquipments,
      total: defaultEquipments.length,
      message: '기본 설비명 목록 조회 (API 에러로 인한 기본값)'
    });
  }
});

// 제품코드 사용 현황 조회 API
router.get('/product-code-usage', async (req, res) => {
  try {
    console.log('제품코드 사용 현황 조회 API 호출');
    
    const usageStats = await lineService.getProductCodeUsageStats();
    
    res.json({
      success: true,
      data: usageStats,
      total: usageStats.length,
      message: '제품코드 사용 현황 조회 성공'
    });
    
  } catch (err) {
    console.error('제품코드 사용 현황 조회 실패:', err);
    res.json({
      success: true,
      data: [],
      total: 0,
      message: '제품코드 사용 현황 조회 실패 (빈 목록 반환)'
    });
  }
});

// 라인 상태 통계 조회
router.get('/stats/status', async (req, res) => {
  try {
    console.log('라인 상태 통계 조회 API 호출');
    const stats = await lineService.getLineStatusStats();
    
    res.json({
      success: true,
      data: stats,
      message: '라인 상태 통계 조회 성공'
    });
    
  } catch (err) {
    console.error('라인 상태 통계 조회 실패:', err);
    res.json({
      success: true,
      data: { statusStats: [], workingLines: [], totalLines: 0 },
      message: '라인 상태 통계 조회 실패 (기본값 반환)'
    });
  }
});

// 특정 제품코드 상세 조회 API (사용현황 포함)
router.get('/product/:productCode', async (req, res) => {
  try {
    const { productCode } = req.params;
    console.log('제품코드 상세 조회 API 호출:', productCode);
    
    const product = await lineService.getProductDetail(productCode);
    
    if (!product) {
      return res.status(404).json({
        success: false,
        message: '제품코드를 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      data: product,
      message: '제품코드 상세 조회 성공'
    });
    
  } catch (err) {
    console.error('제품코드 상세 조회 실패:', err);
    res.status(500).json({
      success: false,
      message: '제품코드 상세 정보를 불러올 수 없습니다.',
      error: err.message
    });
  }
});

// 공정흐름도 조회 API
router.get('/process-flow/:productCode', async (req, res) => {
  try {
    const { productCode } = req.params;
    console.log('공정흐름도 조회 API 호출:', productCode);
    
    const processFlow = await lineService.getProcessFlowByProduct(productCode);
    
    res.json({
      success: true,
      data: processFlow,
      total: processFlow.length,
      message: '공정흐름도 조회 성공'
    });
    
  } catch (err) {
    console.error('공정흐름도 조회 실패:', err);
    
    // 에러 시 기본 공정흐름도 반환
    const defaultProcessFlow = [
      { 공정그룹코드: `${req.params.productCode}-Process`, 순서: 1, 공정코드: `${req.params.productCode}Process1`, 공정유형코드: 'p2', 공정명: '내포장', 공정유형명: '포장', 공정시간: '30분', 공정비고: '기본 내포장 공정' },
      { 공정그룹코드: `${req.params.productCode}-Process`, 순서: 2, 공정코드: `${req.params.productCode}Process2`, 공정유형코드: 'p2', 공정명: '외포장', 공정유형명: '포장', 공정시간: '20분', 공정비고: '기본 외포장 공정' }
    ];
    
    res.json({
      success: true,
      data: defaultProcessFlow,
      total: defaultProcessFlow.length,
      message: '기본 공정흐름도 조회 (API 에러로 인한 기본값)'
    });
  }
});

// 내포장 완료된 건 조회 API
router.get('/completed-inner/:lineId', async (req, res) => {
  try {
    const { lineId } = req.params;
    console.log('내포장 완료된 건 조회 API 호출:', lineId);
    
    const completed = await lineService.getCompletedInnerPackaging(lineId);
    
    res.json({
      success: true,
      data: completed,
      message: completed ? '내포장 완료된 건 조회 성공' : '내포장 완료된 건이 없습니다.'
    });
    
  } catch (err) {
    console.error('내포장 완료된 건 조회 실패:', err);
    res.json({
      success: true,
      data: null,
      message: '내포장 완료된 건 조회 실패'
    });
  }
});

// 현재 사용자 정보 조회 API - 새로 추가
router.get('/current-employee', extractEmployeeInfo, async (req, res) => {
  try {
    console.log('현재 사용자 정보 조회 API 호출');
    
    res.json({
      success: true,
      data: req.currentEmployee,
      message: '현재 사용자 정보 조회 성공'
    });
    
  } catch (err) {
    console.error('현재 사용자 정보 조회 실패:', err);
    res.json({
      success: true,
      data: { employee_id: 2, employee_name: '기본사용자' },
      message: '기본 사용자 정보 반환'
    });
  }
});

// ========== 라인 마스터 관리 API ==========

// 라인 마스터 목록 조회
router.get('/master/list', async (req, res) => {
  try {
    console.log('라인 마스터 목록 조회 API');
    const masterList = await lineService.getLineMasterList();
    res.json({
      success: true,
      data: masterList,
      total: masterList.length
    });
  } catch (err) {
    console.error('라인 마스터 목록 조회 실패:', err);
    res.status(500).json({
      success: false,
      message: '라인 마스터 목록 조회 실패',
      error: err.message
    });
  }
});

// 라인 마스터 상세 조회
router.get('/master/:masterId', async (req, res) => {
  try {
    console.log('라인 마스터 상세 조회 API:', req.params.masterId);
    const masterDetail = await lineService.getLineMasterDetail(req.params.masterId);
    
    if (masterDetail) {
      res.json({
        success: true,
        data: masterDetail
      });
    } else {
      res.status(404).json({
        success: false,
        message: '라인 마스터를 찾을 수 없습니다.'
      });
    }
  } catch (err) {
    console.error('라인 마스터 상세 조회 실패:', err);
    res.status(500).json({
      success: false,
      message: '라인 마스터 상세 조회 실패',
      error: err.message
    });
  }
});

// ========== 기존 API (하위 호환성 유지) ==========

// 단일 라인 상세 (상태 + 마스터 join) - 기존 API 유지
router.get('/line/:line_id', async (req, res) => {
  try {
    console.log('기존 라인 상세 조회 API:', req.params.line_id);
    const lineDetail = await lineService.getLineWithMaster(req.params.line_id);
    
    if (lineDetail) {
      res.send(lineDetail);
    } else {
      res.status(404).send({ message: 'Line Not Found' });
    }
  } catch (err) {
    console.error('기존 라인 상세 조회 실패:', err);
    res.status(500).send({ message: '서버 오류' });
  }
});

// 라인 상세 조회 (동적 경로는 마지막에 배치)
router.get('/:lineId', async (req, res) => {
  try {
    const { lineId } = req.params;
    console.log('라인 상세 조회 API 호출:', lineId);
    
    // A-INNER, A-OUTER 형식의 ID 처리
    let actualLineId = lineId;
    if (lineId.includes('-')) {
      // "A-INNER" -> "A"로 변환
      actualLineId = lineId.split('-')[0];
      console.log('라인 ID 변환:', lineId, '->', actualLineId);
    }
    
    const lineDetail = await lineService.getLineMasterByLineId(actualLineId);
    
    if (!lineDetail) {
      return res.status(404).json({
        success: false,
        message: '라인을 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      data: lineDetail,
      message: '라인 상세 조회 성공'
    });
    
  } catch (err) {
    console.error('라인 상세 조회 실패:', err);
    res.status(500).json({
      success: false,
      message: '라인 상세 정보를 불러올 수 없습니다.',
      error: err.message
    });
  }
});

// ========== POST 라우터들 ==========

// 라인 등록 (로그인 사원 정보 추가) - 제품코드 기반
router.post('/', extractEmployeeInfo, async (req, res) => {
  try {
    console.log('라인 등록 API 호출');
    console.log('요청 데이터:', req.body);
    console.log('현재 사원:', req.currentEmployee);
    
    // 로그인 사원 정보를 요청 데이터에 추가
    const requestData = {
      ...req.body,
      employee_id: req.currentEmployee.employee_id,
      employee_name: req.currentEmployee.employee_name
    };
    
    const result = await lineService.insertIntegratedLine(requestData);
    
    res.status(201).json({
      success: true,
      data: result,
      message: result.message
    });
    
  } catch (err) {
    console.error('라인 등록 실패:', err);
    
    if (err.message.includes('이미 존재하는 라인')) {
      res.status(409).json({
        success: false,
        message: err.message,
        error: 'DUPLICATE_LINE_ID'
      });
    } else {
      res.status(500).json({
        success: false,
        message: '라인 등록에 실패했습니다.',
        error: err.message
      });
    }
  }
});

// 내포장/외포장 동시 등록 API (로그인 사원 정보 추가) - 제품코드 기반
router.post('/dual', extractEmployeeInfo, async (req, res) => {
  try {
    console.log('내포장/외포장 동시 등록 API 호출');
    console.log('요청 데이터:', req.body);
    console.log('현재 사원:', req.currentEmployee);
    
    // 로그인 사원 정보를 요청 데이터에 추가
    const requestData = {
      ...req.body,
      employee_id: req.currentEmployee.employee_id,
      employee_name: req.currentEmployee.employee_name
    };
    
    const result = await lineService.insertDualPackagingLine(requestData);
    
    res.status(201).json({
      success: true,
      data: result,
      message: result.message
    });
    
  } catch (err) {
    console.error('내포장/외포장 동시 등록 실패:', err);
    
    if (err.message.includes('이미 존재하는 라인')) {
      res.status(409).json({
        success: false,
        message: err.message,
        error: 'DUPLICATE_LINE_ID'
      });
    } else {
      res.status(500).json({
        success: false,
        message: '라인 동시 등록에 실패했습니다.',
        error: err.message
      });
    }
  }
});

// 제품코드 할당 검증 API
router.post('/validate-product-code', async (req, res) => {
  try {
    const { productCode, lineCode } = req.body;
    console.log('제품코드 할당 검증 API 호출:', productCode, '→', lineCode);
    
    if (!productCode || !lineCode) {
      return res.status(400).json({
        success: false,
        message: '제품코드와 라인 코드를 입력해주세요.'
      });
    }
    
    const validation = await lineService.validateProductCodeAssignment(productCode, lineCode);
    
    res.json({
      success: true,
      data: validation,
      message: validation.canAssign ? '할당 가능' : '할당 불가'
    });
    
  } catch (err) {
    console.error('제품코드 할당 검증 실패:', err);
    res.json({
      success: false,
      data: { canAssign: false, reason: '검증 실패: ' + err.message },
      message: '제품코드 할당 검증에 실패했습니다.'
    });
  }
});

// 라인 작업 시작 API (공정흐름도 기반 처리)
router.post('/start-work', extractEmployeeInfo, async (req, res) => {
  try {
    const { lineId, productCode } = req.body;
    console.log('라인 작업 시작 API 호출:', lineId, '→', productCode);
    
    if (!lineId || !productCode) {
      return res.status(400).json({
        success: false,
        message: '라인 ID와 제품코드를 입력해주세요.'
      });
    }
    
    const result = await lineService.startLineWork(lineId, productCode, req.currentEmployee);
    
    res.json({
      success: true,
      data: result,
      message: '라인 작업이 시작되었습니다.'
    });
    
  } catch (err) {
    console.error('라인 작업 시작 실패:', err);
    res.status(500).json({
      success: false,
      message: '라인 작업 시작에 실패했습니다.',
      error: err.message
    });
  }
});

// 내포장 작업 완료 API - 새로 추가
router.post('/complete-inner-work', extractEmployeeInfo, async (req, res) => {
  try {
    const { lineId, workOrderNo, outputQty } = req.body;
    console.log('내포장 작업 완료 API 호출:', lineId, '→', workOrderNo);
    
    if (!lineId) {
      return res.status(400).json({
        success: false,
        message: '라인 ID를 입력해주세요.'
      });
    }
    
    const result = await lineService.completeInnerPackagingWork(lineId, workOrderNo, outputQty);
    
    res.json({
      success: true,
      data: result,
      message: '내포장 작업이 완료되었습니다.'
    });
    
  } catch (err) {
    console.error('내포장 작업 완료 실패:', err);
    res.status(500).json({
      success: false,
      message: '내포장 작업 완료에 실패했습니다.',
      error: err.message
    });
  }
});

// 외포장 작업 완료 API
router.post('/complete-outer-work', extractEmployeeInfo, async (req, res) => {
  try {
    const { lineId, workOrderNo, outputQty } = req.body;
    console.log('외포장 작업 완료 API 호출:', lineId, '→', workOrderNo);
    
    if (!lineId) {
      return res.status(400).json({
        success: false,
        message: '라인 ID를 입력해주세요.'
      });
    }
    
    const result = await lineService.completeOuterPackagingWork(lineId, workOrderNo, outputQty);
    
    res.json({
      success: true,
      data: result,
      message: '외포장 작업이 완료되었습니다.'
    });
    
  } catch (err) {
    console.error('외포장 작업 완료 실패:', err);
    res.status(500).json({
      success: false,
      message: '외포장 작업 완료에 실패했습니다.',
      error: err.message
    });
  }
});

// 라인 마스터 등록
router.post('/master', async (req, res) => {
  try {
    console.log('라인 마스터 등록 API');
    const result = await lineService.insertLineMaster(req.body);
    res.status(201).json({
      success: true,
      data: result,
      message: '라인 마스터 등록 성공'
    });
  } catch (err) {
    console.error('라인 마스터 등록 실패:', err);
    res.status(500).json({
      success: false,
      message: '라인 마스터 등록 실패',
      error: err.message
    });
  }
});

// 라인 실적 등록 - 기존 API 유지
router.post('/line', async (req, res) => {
  try {
    console.log('기존 라인 실적 등록 API');
    const result = await lineService.insertLine(req.body);
    res.send(result);
  } catch (err) {
    console.error('기존 라인 실적 등록 실패:', err);
    res.status(500).send({ isSuccessed: false, message: '서버 오류' });
  }
});

// ========== PUT 라우터들 ==========

// 라인 마스터 수정
router.put('/master/:masterId', async (req, res) => {
  try {
    console.log('라인 마스터 수정 API:', req.params.masterId);
    const result = await lineService.updateLineMaster(req.params.masterId, req.body);
    res.json({
      success: true,
      data: result,
      message: '라인 마스터 수정 성공'
    });
  } catch (err) {
    console.error('라인 마스터 수정 실패:', err);
    res.status(500).json({
      success: false,
      message: '라인 마스터 수정 실패',
      error: err.message
    });
  }
});

// 라인 실적 수정 - 기존 API 유지
router.put('/line/:line_id', async (req, res) => {
  try {
    console.log('기존 라인 실적 수정 API:', req.params.line_id);
    const result = await lineService.updateLine(req.params.line_id, req.body);
    res.send(result);
  } catch (err) {
    console.error('기존 라인 실적 수정 실패:', err);
    res.status(500).send({ isUpdated: false, message: '서버 오류' });
  }
});

// 라인 수정 (동적 경로는 마지막에) - 제품코드 기반
router.put('/:lineId', extractEmployeeInfo, async (req, res) => {
  try {
    const { lineId } = req.params;
    console.log('라인 수정 API 호출:', lineId);
    console.log('수정 데이터:', req.body);
    console.log('현재 사원:', req.currentEmployee);
    
    // A-INNER, A-OUTER 형식의 ID 처리
    let actualLineId = lineId;
    if (lineId.includes('-')) {
      // "A-INNER" -> "A"로 변환
      actualLineId = lineId.split('-')[0];
      console.log('라인 ID 변환:', lineId, '->', actualLineId);
    }
    
    // 로그인 사원 정보를 요청 데이터에 추가
    const requestData = {
      ...req.body,
      employee_id: req.currentEmployee.employee_id,
      employee_name: req.currentEmployee.employee_name
    };
    
    const result = await lineService.updateIntegratedLine(actualLineId, requestData);
    
    res.json({
      success: true,
      data: result,
      message: result.message
    });
    
  } catch (err) {
    console.error('라인 수정 실패:', err);
    
    if (err.message.includes('찾을 수 없습니다')) {
      res.status(404).json({
        success: false,
        message: err.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: '라인 수정에 실패했습니다.',
        error: err.message
      });
    }
  }
});

// ========== DELETE 라우터들 ==========

// 라인 일괄 삭제 (구체적인 경로 먼저)
router.delete('/bulk/delete', async (req, res) => {
  try {
    const { lineIds } = req.body;
    console.log('라인 일괄 삭제 API 호출:', lineIds);
    
    if (!Array.isArray(lineIds) || lineIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '삭제할 라인 ID를 선택해주세요.'
      });
    }
    
    // A-INNER, A-OUTER 형식의 ID들을 실제 라인 코드로 변환
    const actualLineIds = lineIds.map(lineId => {
      if (lineId.includes('-')) {
        return lineId.split('-')[0]; // "A-INNER" -> "A"
      }
      return lineId;
    });
    
    // 중복 제거 (A-INNER, A-OUTER -> A 하나만)
    const uniqueLineIds = [...new Set(actualLineIds)];
    console.log('변환된 라인 ID들:', lineIds, '->', uniqueLineIds);
    
    const result = await lineService.bulkDeleteLines(uniqueLineIds);
    
    res.json({
      success: true,
      data: result,
      message: result.message
    });
    
  } catch (err) {
    console.error('라인 일괄 삭제 실패:', err);
    res.status(500).json({
      success: false,
      message: '라인 일괄 삭제에 실패했습니다.',
      error: err.message
    });
  }
});

// 라인 마스터 삭제
router.delete('/master/:masterId', async (req, res) => {
  try {
    console.log('라인 마스터 삭제 API:', req.params.masterId);
    const result = await lineService.deleteLineMaster(req.params.masterId);
    res.json({
      success: true,
      data: result,
      message: '라인 마스터 삭제 성공'
    });
  } catch (err) {
    console.error('라인 마스터 삭제 실패:', err);
    res.status(500).json({
      success: false,
      message: '라인 마스터 삭제 실패',
      error: err.message
    });
  }
});

// 라인 실적 삭제 - 기존 API 유지
router.delete('/line/:line_id', async (req, res) => {
  try {
    console.log('기존 라인 실적 삭제 API:', req.params.line_id);
    const result = await lineService.deleteLine(req.params.line_id);
    res.send(result);
  } catch (err) {
    console.error('기존 라인 실적 삭제 실패:', err);
    res.status(500).send({ isDeleted: false, message: '서버 오류' });
  }
});

// 라인 삭제 (동적 경로는 마지막에)
router.delete('/:lineId', async (req, res) => {
  try {
    const { lineId } = req.params;
    console.log('라인 삭제 API 호출:', lineId);
    
    // A-INNER, A-OUTER 형식의 ID 처리
    let actualLineId = lineId;
    if (lineId.includes('-')) {
      // "A-INNER" -> "A"로 변환
      actualLineId = lineId.split('-')[0];
      console.log('라인 ID 변환:', lineId, '->', actualLineId);
    }
    
    const result = await lineService.deleteIntegratedLine(actualLineId);
    
    res.json({
      success: true,
      data: result,
      message: result.message
    });
    
  } catch (err) {
    console.error('라인 삭제 실패:', err);
    
    if (err.message.includes('찾을 수 없습니다')) {
      res.status(404).json({
        success: false,
        message: err.message
      });
    } else {
      res.status(500).json({
        success: false,
        message: '라인 삭제에 실패했습니다.',
        error: err.message
      });
    }
  }
});

module.exports = router;