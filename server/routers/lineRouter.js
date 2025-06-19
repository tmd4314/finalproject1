// server/routers/lineRouter.js - 아이콘 제거, 필드명 수정, 내포장/외포장 개별 수정, 폴백 데이터 제거

const express = require('express');
const router = express.Router();
const lineService = require('../services/lineService.js');

// 로그인 사원 정보 추출 미들웨어
const extractEmployeeInfo = (req, res, next) => {
  try {
    if (req.session && req.session.user) {
      req.currentEmployee = {
        employee_id: req.session.user.employee_id,
        employee_name: req.session.user.employee_name
      };
    } else if (req.headers.authorization) {
      const token = req.headers.authorization.split(' ')[1];
      req.currentEmployee = {
        employee_id: 2,
        employee_name: '관리자'
      };
    } else if (req.cookies && req.cookies.user_info) {
      try {
        const userInfo = JSON.parse(req.cookies.user_info);
        req.currentEmployee = {
          employee_id: userInfo.employee_id,
          employee_name: userInfo.employee_name
        };
      } catch (cookieError) {
        console.warn('쿠키 파싱 실패:', cookieError);
      }
    } else {
      req.currentEmployee = {
        employee_id: 2,
        employee_name: '관리자'
      };
    }
    
    console.log('추출된 사원 정보:', req.currentEmployee);
    next();
  } catch (error) {
    console.error('사원 정보 추출 실패:', error);
    req.currentEmployee = {
      employee_id: 2,
      employee_name: '관리자'
    };
    next();
  }
};

// ========== GET 라우터들 ==========

// 전체 라인 목록 조회
router.get('/list', async (req, res) => {
  try {
    console.log('라인 목록 조회 API 호출');
    const lineList = await lineService.getLineList();
    
    const innerCount = lineList.filter(line => line.line_type === 'INNER').length;
    const outerCount = lineList.filter(line => line.line_type === 'OUTER').length;
    
    console.log('라인 목록 조회 결과:');
    console.log(`  - 전체: ${lineList.length}개`);
    console.log(`  - 내포장: ${innerCount}개`);
    console.log(`  - 외포장: ${outerCount}개`);
    
    res.json({
      success: true,
      data: lineList,
      total: lineList.length,
      summary: {
        total: lineList.length,
        inner: innerCount,
        outer: outerCount
      },
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

// 사용 가능한 라인 코드 목록 조회
router.get('/available-codes', async (req, res) => {
  try {
    console.log('사용 가능한 라인 코드 조회 API 호출');
    const availableCodes = await lineService.getAvailableLineCodes();
    
    res.json({
      success: true,
      data: availableCodes,
      total: availableCodes.length,
      message: '사용 가능한 라인 코드 조회 성공'
    });
    
  } catch (err) {
    console.error('사용 가능한 라인 코드 조회 실패:', err);
    res.status(500).json({
      success: false,
      data: [],
      message: '사용 가능한 라인 코드 조회 실패',
      error: err.message
    });
  }
});

// 사용 가능한 제품코드 목록 조회 API
router.get('/available-products', async (req, res) => {
  try {
    console.log('사용 가능한 제품코드 조회 API 호출');
    
    const lineCode = req.query.lineCode;
    const products = await lineService.getAvailableProducts(lineCode);
    
    res.json({
      success: true,
      data: products,
      total: products.length,
      lineCode: lineCode || null,
      message: '제품코드 조회 성공'
    });
    
  } catch (err) {
    console.error('제품코드 조회 실패:', err);
    res.status(500).json({
      success: false,
      data: [],
      message: '제품코드 조회 실패',
      error: err.message
    });
  }
});

// 사용 가능한 담당자 목록 조회 API
router.get('/available-employees', async (req, res) => {
  try {
    console.log('사용 가능한 담당자 목록 조회 API 호출');
    const employees = await lineService.getAvailableEmployees();
    
    console.log('담당자 목록 조회 성공:', employees.length, '명');
    
    res.json({
      success: true,
      data: employees,
      total: employees.length,
      message: '담당자 목록 조회 성공'
    });
    
  } catch (err) {
    console.error('담당자 목록 조회 실패:', err);
    res.status(500).json({
      success: false,
      data: [],
      message: '담당자 목록 조회 실패',
      error: err.message
    });
  }
});

// 사용 가능한 설비명 목록 조회 API
router.get('/available-equipments', async (req, res) => {
  try {
    console.log('사용 가능한 설비명 목록 조회 API 호출');
    
    const excludeLineCode = req.query.excludeLineCode;
    
    if (excludeLineCode) {
      console.log('라인 수정 모드 - 제외할 라인 코드:', excludeLineCode);
    }
    
    const equipments = await lineService.getAvailableEquipments(excludeLineCode);
    
    const innerCount = equipments.filter(eq => eq.line_type === 'INNER').length;
    const outerCount = equipments.filter(eq => eq.line_type === 'OUTER').length;
    
    console.log('설비 분류 현황:');
    console.log(`  - 전체: ${equipments.length}개`);
    console.log(`  - 내포장: ${innerCount}개`);
    console.log(`  - 외포장: ${outerCount}개`);
    
    const innerEquipments = equipments.filter(eq => eq.line_type === 'INNER');
    const outerEquipments = equipments.filter(eq => eq.line_type === 'OUTER');
    
    res.json({
      success: true,
      data: equipments,
      total: equipments.length,
      summary: {
        total: equipments.length,
        inner: innerCount,
        outer: outerCount,
        inner_equipments: innerEquipments.map(eq => ({
          name: eq.eq_name,
          type_code: eq.eq_type_code
        })),
        outer_equipments: outerEquipments.map(eq => ({
          name: eq.eq_name,
          type_code: eq.eq_type_code
        }))
      },
      classification: {
        inner_names: innerEquipments.map(eq => eq.eq_name),
        outer_names: outerEquipments.map(eq => eq.eq_name)
      },
      message: '설비명 목록 조회 성공',
      eq_group_code: 'e3',
      excludedLine: excludeLineCode || null
    });
    
  } catch (err) {
    console.error('설비명 목록 조회 실패:', err);
    res.status(500).json({
      success: false,
      data: [],
      message: '설비명 목록 조회 실패',
      error: err.message
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
    res.status(500).json({
      success: false,
      data: [],
      message: '제품코드 사용 현황 조회 실패',
      error: err.message
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
    res.status(500).json({
      success: false,
      data: { statusStats: [], workingLines: [], totalLines: 0 },
      message: '라인 상태 통계 조회 실패',
      error: err.message
    });
  }
});

// 최신 실적 ID 조회 API
router.get('/latest-result-id', async (req, res) => {
  try {
    const productCode = req.query.productCode;
    console.log('최신 실적 ID 조회 API 호출, 제품코드:', productCode);
    
    const resultId = await lineService.getLatestResultId(productCode);
    
    res.json({
      success: true,
      data: {
        result_id: resultId,
        product_code: productCode || null,
        timestamp: new Date().toISOString()
      },
      message: productCode ? 
        `${productCode} 제품의 최신 실적 ID 조회 성공` : 
        '전체 최신 실적 ID 조회 성공'
    });
    
  } catch (err) {
    console.error('최신 실적 ID 조회 실패:', err);
    res.status(500).json({
      success: false,
      message: '최신 실적 ID 조회 실패',
      error: err.message
    });
  }
});

// 특정 제품코드 상세 조회 API
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

// 현재 사용자 정보 조회 API
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
    res.status(500).json({
      success: false,
      message: '현재 사용자 정보 조회 실패',
      error: err.message
    });
  }
});

// ========== 라인 마스터 관리 API ==========

// 라인 마스터 목록 조회
router.get('/master/list', async (req, res) => {
  try {
    console.log('라인 마스터 목록 조회 API');
    const masterList = await lineService.getLineMasterList();
    
    const innerCount = masterList.filter(master => master.line_type === 'INNER').length;
    const outerCount = masterList.filter(master => master.line_type === 'OUTER').length;
    
    res.json({
      success: true,
      data: masterList,
      total: masterList.length,
      summary: {
        total: masterList.length,
        inner: innerCount,
        outer: outerCount
      },
      eq_group_code: 'e3'
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
        data: {
          ...masterDetail,
          eq_group_code: 'e3'
        }
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

// 라인 상세 조회 (라인 코드로) - 맨 마지막에 배치
router.get('/:lineCode', async (req, res) => {
  try {
    const { lineCode } = req.params;
    console.log('라인 상세 조회 API 호출:', lineCode);
    
    // A-INNER, A-OUTER 형식의 코드 처리
    let actualLineCode = lineCode;
    if (lineCode.includes('-')) {
      actualLineCode = lineCode.split('-')[0];
      console.log('라인 코드 변환:', lineCode, '->', actualLineCode);
    }
    
    const lineDetails = await lineService.getLineMasterByLineCode(actualLineCode);
    
    if (!lineDetails || lineDetails.length === 0) {
      return res.status(404).json({
        success: false,
        message: '라인을 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      data: lineDetails,
      total: lineDetails.length,
      message: '라인 상세 조회 성공',
      eq_group_code: 'e3'
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

// 라인 등록
router.post('/', extractEmployeeInfo, async (req, res) => {
  try {
    console.log('라인 등록 API 호출');
    console.log('요청 데이터:', req.body);
    console.log('현재 사원:', req.currentEmployee);
    
    const requestData = {
      ...req.body,
      employee_id: req.currentEmployee.employee_id,
      employee_name: req.currentEmployee.employee_name,
      eq_group_code: 'e3'
    };
    
    const result = await lineService.insertIntegratedLine(requestData);
    
    res.status(201).json({
      success: true,
      data: result,
      message: result.message,
      eq_group_code: 'e3'
    });
    
  } catch (err) {
    console.error('라인 등록 실패:', err);
    
    if (err.message.includes('이미 존재하는 라인')) {
      res.status(409).json({
        success: false,
        message: err.message,
        error: 'DUPLICATE_LINE_CODE'
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

// 내포장/외포장 동시 등록 API
router.post('/dual', extractEmployeeInfo, async (req, res) => {
  try {
    console.log('내포장/외포장 동시 등록 API 호출');
    console.log('요청 데이터:', JSON.stringify(req.body, null, 2));
    console.log('현재 사원:', req.currentEmployee);
    
    // 필수 필드 검증
    const requiredFields = ['line_code', 'inner_eq_name', 'outer_eq_name', 'inner_employee_id', 'outer_employee_id'];
    const missingFields = requiredFields.filter(field => !req.body[field]);
    
    if (missingFields.length > 0) {
      return res.status(400).json({
        success: false,
        message: `필수 필드가 누락되었습니다: ${missingFields.join(', ')}`,
        error: 'MISSING_REQUIRED_FIELDS',
        missingFields: missingFields
      });
    }
    
    const requestData = {
      ...req.body,
      current_employee_id: req.currentEmployee.employee_id,
      current_employee_name: req.currentEmployee.employee_name,
      eq_group_code: 'e3'
    };
    
    const result = await lineService.dualRegisterLine(requestData);
    
    res.status(201).json({
      success: true,
      data: result,
      message: result.message || '내포장/외포장 라인이 성공적으로 등록되었습니다.',
      registered_types: ['INNER', 'OUTER'],
      registered_types_text: ['내포장', '외포장'],
      total_registered: result.total_registered || 2,
      eq_group_code: 'e3'
    });
    
  } catch (err) {
    console.error('동시 등록 실패:', err);
    
    if (err.message.includes('이미 존재하는 라인')) {
      res.status(409).json({
        success: false,
        message: err.message,
        error: 'DUPLICATE_LINE_CODE',
        line_code: req.body.line_code
      });
    } else if (err.message.includes('필수입니다')) {
      res.status(400).json({
        success: false,
        message: err.message,
        error: 'VALIDATION_ERROR'
      });
    } else {
      res.status(500).json({
        success: false,
        message: '내포장/외포장 동시 등록에 실패했습니다.',
        error: err.message
      });
    }
  }
});

// ========== PUT 라우터들 ==========

// 라인 수정 (전체 수정)
router.put('/:lineCode', extractEmployeeInfo, async (req, res) => {
  try {
    const { lineCode } = req.params;
    console.log('라인 전체 수정 API 호출:', lineCode);
    console.log('수정 데이터:', JSON.stringify(req.body, null, 2));
    console.log('현재 사원:', req.currentEmployee);
    
    // A-INNER, A-OUTER 형식의 코드 처리
    let actualLineCode = lineCode;
    let actualLineType = null;
    
    if (lineCode.includes('-')) {
      const parts = lineCode.split('-');
      actualLineCode = parts[0];
      actualLineType = parts[1];
      console.log('라인 코드 파싱:', lineCode, '->', actualLineCode, actualLineType);
    }
    
    // 라인 존재 여부 확인
    const existingMasters = await lineService.getLineMasterByLineCode(actualLineCode);
    if (!existingMasters || existingMasters.length === 0) {
      return res.status(404).json({
        success: false,
        message: `라인을 찾을 수 없습니다: ${actualLineCode}`,
        error: 'LINE_NOT_FOUND'
      });
    }
    
    console.log(`발견된 ${actualLineCode}라인:`, existingMasters.length, '개');
    
    const requestData = {
      ...req.body,
      employee_id: req.currentEmployee.employee_id,
      employee_name: req.currentEmployee.employee_name,
      eq_group_code: 'e3',
      modified_by: req.currentEmployee.employee_name,
      modified_at: new Date().toISOString()
    };
    
    console.log('처리할 수정 데이터:', JSON.stringify(requestData, null, 2));
    
    const result = await lineService.updateIntegratedLine(actualLineCode, actualLineType, requestData);
    
    console.log('수정 성공 결과:', JSON.stringify(result, null, 2));
    
    res.json({
      success: true,
      data: result,
      message: result.message,
      updated_line: actualLineCode,
      updated_type: actualLineType || 'ALL',
      updated_types: result.updated_types || [],
      updated_types_text: result.updated_types_text || [],
      update_count: result.update_count || 1,
      eq_group_code: 'e3'
    });
    
  } catch (err) {
    console.error('라인 수정 실패:', err);
    
    if (err.message.includes('찾을 수 없습니다')) {
      res.status(404).json({
        success: false,
        message: err.message,
        error: 'LINE_NOT_FOUND'
      });
    } else {
      res.status(500).json({
        success: false,
        message: '라인 수정에 실패했습니다.',
        error: err.message,
        line_code: req.params.lineCode
      });
    }
  }
});

// 라인 수정 (특정 타입만)
router.put('/:lineCode/:lineType', extractEmployeeInfo, async (req, res) => {
  try {
    const { lineCode, lineType } = req.params;
    console.log('\n=== 개별 라인 수정 API 호출 ===');
    console.log('파라미터:');
    console.log('  lineCode:', lineCode);
    console.log('  lineType:', lineType);
    console.log('요청 본문:', JSON.stringify(req.body, null, 2));
    console.log('현재 사원:', req.currentEmployee);
    
    // 타입 검증 강화
    if (!lineType || !['INNER', 'OUTER'].includes(lineType.toUpperCase())) {
      console.error('유효하지 않은 라인 타입:', lineType);
      return res.status(400).json({
        success: false,
        message: `유효하지 않은 라인 타입입니다: ${lineType}. INNER 또는 OUTER만 가능합니다.`,
        error: 'INVALID_LINE_TYPE',
        received_type: lineType,
        valid_types: ['INNER', 'OUTER']
      });
    }
    
    // 라인 코드 검증
    if (!lineCode || lineCode.trim() === '') {
      console.error('라인 코드가 없음:', lineCode);
      return res.status(400).json({
        success: false,
        message: '라인 코드는 필수입니다.',
        error: 'MISSING_LINE_CODE'
      });
    }
    
    // 라인 존재 여부 확인
    const existingMasters = await lineService.getLineMasterByLineCode(lineCode);
    if (!existingMasters || existingMasters.length === 0) {
      console.error('라인을 찾을 수 없음:', lineCode);
      return res.status(404).json({
        success: false,
        message: `라인을 찾을 수 없습니다: ${lineCode}`,
        error: 'LINE_NOT_FOUND',
        line_code: lineCode
      });
    }
    
    // 해당 타입의 라인 존재 여부 확인
    const targetTypeMaster = existingMasters.find(master => master.line_type === lineType.toUpperCase());
    if (!targetTypeMaster) {
      console.error(`${lineType} 타입의 라인이 없음:`, lineCode);
      return res.status(404).json({
        success: false,
        message: `${lineCode}라인에 ${lineType} 타입이 존재하지 않습니다.`,
        error: 'LINE_TYPE_NOT_FOUND',
        line_code: lineCode,
        line_type: lineType,
        available_types: existingMasters.map(m => m.line_type)
      });
    }
    
    console.log(`발견된 ${lineCode}라인:`, existingMasters.length, '개');
    console.log(`수정할 ${lineType} 타입:`, targetTypeMaster.line_masterid);
    
    const requestData = {
      ...req.body,
      employee_id: req.currentEmployee.employee_id,
      employee_name: req.currentEmployee.employee_name,
      eq_group_code: 'e3',
      modified_by: req.currentEmployee.employee_name,
      modified_at: new Date().toISOString()
    };
    
    console.log('처리할 수정 데이터:', JSON.stringify(requestData, null, 2));
    
    // ★ 핵심: lineType을 명시적으로 대문자로 전달
    const normalizedLineType = lineType.toUpperCase();
    const result = await lineService.updateIntegratedLine(lineCode, normalizedLineType, requestData);
    
    console.log('수정 성공 결과:', JSON.stringify(result, null, 2));
    
    res.json({
      success: true,
      data: result,
      message: result.message,
      updated_line: lineCode,
      updated_type: normalizedLineType,
      updated_type_text: normalizedLineType === 'INNER' ? '내포장' : '외포장',
      updated_types: result.updated_types || [normalizedLineType],
      updated_types_text: result.updated_types_text || [normalizedLineType === 'INNER' ? '내포장' : '외포장'],
      update_count: result.update_count || 1,
      eq_group_code: 'e3',
      operation: 'INDIVIDUAL_UPDATE'
    });
    
  } catch (err) {
    console.error('개별 라인 수정 실패:', err);
    
    if (err.message.includes('찾을 수 없습니다')) {
      res.status(404).json({
        success: false,
        message: err.message,
        error: 'LINE_NOT_FOUND',
        line_code: req.params.lineCode,
        line_type: req.params.lineType
      });
    } else if (err.message.includes('유효하지 않은')) {
      res.status(400).json({
        success: false,
        message: err.message,
        error: 'VALIDATION_ERROR',
        line_code: req.params.lineCode,
        line_type: req.params.lineType
      });
    } else {
      res.status(500).json({
        success: false,
        message: `라인 수정에 실패했습니다: ${err.message}`,
        error: err.message,
        line_code: req.params.lineCode,
        line_type: req.params.lineType
      });
    }
  }
});

router.get('/:lineCode/debug', async (req, res) => {
  try {
    const { lineCode } = req.params;
    console.log('디버깅용 라인 정보 조회:', lineCode);
    
    const masterDetails = await lineService.getLineMasterByLineCode(lineCode);
    
    res.json({
      success: true,
      line_code: lineCode,
      masters: masterDetails,
      total_types: masterDetails.length,
      available_types: masterDetails.map(m => ({
        type: m.line_type,
        type_text: m.line_type === 'INNER' ? '내포장' : '외포장',
        master_id: m.line_masterid,
        line_name: m.line_name
      })),
      message: '라인 정보 조회 성공'
    });
    
  } catch (err) {
    console.error('디버깅용 라인 정보 조회 실패:', err);
    res.status(500).json({
      success: false,
      message: '라인 정보 조회 실패',
      error: err.message
    });
  }
});

// ========== DELETE 라우터들 ==========

// 라인 삭제 (전체 삭제)
router.delete('/:lineCode', extractEmployeeInfo, async (req, res) => {
  try {
    const { lineCode } = req.params;
    console.log('라인 전체 삭제 API 호출:', lineCode);
    console.log('현재 사원:', req.currentEmployee);
    
    // A-INNER, A-OUTER 형식의 코드 처리
    let actualLineCode = lineCode;
    let actualLineType = null;
    
    if (lineCode.includes('-')) {
      const parts = lineCode.split('-');
      actualLineCode = parts[0];
      actualLineType = parts[1];
      console.log('라인 코드 파싱:', lineCode, '->', actualLineCode, actualLineType);
    }
    
    // 라인 존재 여부 확인
    const existingMasters = await lineService.getLineMasterByLineCode(actualLineCode);
    if (!existingMasters || existingMasters.length === 0) {
      return res.status(404).json({
        success: false,
        message: `라인을 찾을 수 없습니다: ${actualLineCode}`,
        error: 'LINE_NOT_FOUND'
      });
    }
    
    console.log('삭제할 라인 정보:', existingMasters);
    
    const result = await lineService.deleteIntegratedLine(actualLineCode, actualLineType);
    
    console.log('삭제 성공 결과:', JSON.stringify(result, null, 2));
    
    res.json({
      success: true,
      data: result,
      message: result.message,
      deleted_line: actualLineCode,
      deleted_type: actualLineType || 'ALL',
      deleted_types: result.deleted_types || [],
      deleted_types_text: result.deleted_types_text || [],
      delete_count: result.delete_count || 1,
      deleted_by: req.currentEmployee.employee_name,
      deleted_at: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('라인 삭제 실패:', err);
    
    if (err.message.includes('찾을 수 없습니다')) {
      res.status(404).json({
        success: false,
        message: err.message,
        error: 'LINE_NOT_FOUND'
      });
    } else {
      res.status(500).json({
        success: false,
        message: '라인 삭제에 실패했습니다.',
        error: err.message,
        line_code: req.params.lineCode
      });
    }
  }
});

// 라인 삭제 (특정 타입만)
router.delete('/:lineCode/:lineType', extractEmployeeInfo, async (req, res) => {
  try {
    const { lineCode, lineType } = req.params;
    console.log('라인 개별 삭제 API 호출:', lineCode, lineType);
    console.log('현재 사원:', req.currentEmployee);
    
    // 타입 검증
    if (!['INNER', 'OUTER'].includes(lineType)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 라인 타입입니다. INNER 또는 OUTER만 가능합니다.',
        error: 'INVALID_LINE_TYPE'
      });
    }
    
    // 라인 존재 여부 확인
    const existingMasters = await lineService.getLineMasterByLineCode(lineCode);
    if (!existingMasters || existingMasters.length === 0) {
      return res.status(404).json({
        success: false,
        message: `라인을 찾을 수 없습니다: ${lineCode}`,
        error: 'LINE_NOT_FOUND'
      });
    }
    
    console.log('삭제할 라인 정보:', existingMasters);
    
    const result = await lineService.deleteIntegratedLine(lineCode, lineType);
    
    console.log('삭제 성공 결과:', JSON.stringify(result, null, 2));
    
    res.json({
      success: true,
      data: result,
      message: result.message,
      deleted_line: lineCode,
      deleted_type: lineType,
      deleted_types: result.deleted_types || [],
      deleted_types_text: result.deleted_types_text || [],
      delete_count: result.delete_count || 1,
      deleted_by: req.currentEmployee.employee_name,
      deleted_at: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('라인 삭제 실패:', err);
    
    if (err.message.includes('찾을 수 없습니다')) {
      res.status(404).json({
        success: false,
        message: err.message,
        error: 'LINE_NOT_FOUND'
      });
    } else {
      res.status(500).json({
        success: false,
        message: '라인 삭제에 실패했습니다.',
        error: err.message,
        line_code: req.params.lineCode
      });
    }
  }
});

module.exports = router;