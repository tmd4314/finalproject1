// server/routers/lineRouter.js
const express = require('express');
const router = express.Router();
const lineService = require('../services/lineService.js');

// 🔥 로그인 사원 정보 추출 미들웨어
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
      // JWT 디코딩 로직 (실제 구현에 맞게 수정)
      const token = req.headers.authorization.split(' ')[1];
      // const decoded = jwt.verify(token, process.env.JWT_SECRET);
      // req.currentEmployee = decoded.user;
      
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
      console.warn('⚠️ 로그인 정보 없음 - 개발용 기본값 사용');
      req.currentEmployee = {
        employee_id: 2,
        employee_name: '관리자'
      };
    }
    
    console.log('🔍 추출된 사원 정보:', req.currentEmployee);
    next();
  } catch (error) {
    console.error('사원 정보 추출 실패:', error);
    res.status(401).json({
      success: false,
      message: '로그인이 필요합니다.'
    });
  }
};

// ========== GET 라우터들 (구체적인 경로 먼저) ==========

// 전체 라인 목록 조회 (통합: 마스터 + 최신 상태 + 작업결과)
router.get('/list', async (req, res) => {
  try {
    console.log('📋 라인 목록 조회 API 호출');
    const lineList = await lineService.getLineList();
    
    res.json({
      success: true,
      data: lineList,
      total: lineList.length,
      message: '라인 목록 조회 성공'
    });
    
  } catch (err) {
    console.error('❌ 라인 목록 조회 실패:', err);
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
    console.log('🔤 사용 가능한 라인 ID 조회 API 호출');
    const availableIds = await lineService.getAvailableLineIds();
    
    res.json({
      success: true,
      data: availableIds,
      message: '사용 가능한 라인 ID 조회 성공'
    });
    
  } catch (err) {
    console.error('❌ 사용 가능한 라인 ID 조회 실패:', err);
    res.status(500).json({
      success: false,
      data: [],
      message: '사용 가능한 라인 ID를 조회할 수 없습니다.',
      error: err.message
    });
  }
});

// 🔥 사용 가능한 작업 결과 목록 조회 API (라인별 격리 적용)
router.get('/available-work-results', async (req, res) => {
  try {
    console.log('📋 사용 가능한 작업 결과 조회 API 호출');
    
    // 🔥 쿼리 파라미터로 라인 코드 받기
    const lineCode = req.query.lineCode;
    
    if (lineCode) {
      console.log(`🔄 ${lineCode}라인 전용 작업 결과 조회`);
    } else {
      console.log('🔄 전체 작업 결과 조회 (관리자 모드)');
    }
    
    const workResults = await lineService.getAvailableWorkResults(lineCode);
    
    res.json({
      success: true,
      data: workResults,
      total: workResults.length,
      lineCode: lineCode || null,
      message: lineCode ? 
        `${lineCode}라인 작업 결과 조회 성공` : 
        '전체 작업 결과 조회 성공'
    });
    
  } catch (err) {
    console.error('❌ 사용 가능한 작업 결과 조회 실패:', err);
    res.status(500).json({
      success: false,
      data: [],
      message: '작업 결과를 조회할 수 없습니다.',
      error: err.message
    });
  }
});

// 🔥 사용 가능한 담당자 목록 조회 API
router.get('/available-employees', async (req, res) => {
  try {
    console.log('👥 사용 가능한 담당자 목록 조회 API 호출');
    const employees = await lineService.getAvailableEmployees();
    
    res.json({
      success: true,
      data: employees,
      total: employees.length,
      message: '담당자 목록 조회 성공'
    });
    
  } catch (err) {
    console.error('❌ 담당자 목록 조회 실패:', err);
    res.status(500).json({
      success: false,
      data: [],
      message: '담당자 목록을 조회할 수 없습니다.',
      error: err.message
    });
  }
});

// 🔥 사용 가능한 설비명 목록 조회 API (설비명 중복 방지)
router.get('/available-equipments', async (req, res) => {
  try {
    console.log('🔧 사용 가능한 설비명 목록 조회 API 호출');
    
    // 🔥 쿼리 파라미터로 제외할 라인 ID 받기 (라인 수정 시 사용)
    const excludeLineId = req.query.excludeLineId;
    
    if (excludeLineId) {
      console.log('🔄 라인 수정 모드 - 제외할 라인 ID:', excludeLineId);
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
    console.error('❌ 설비명 목록 조회 실패:', err);
    res.status(500).json({
      success: false,
      data: [],
      message: '설비명 목록을 조회할 수 없습니다.',
      error: err.message
    });
  }
});

// 🔥 작업번호 사용 현황 조회 API (새로 추가)
router.get('/work-order-usage', async (req, res) => {
  try {
    console.log('📊 작업번호 사용 현황 조회 API 호출');
    
    const usageStats = await lineService.getWorkOrderUsageStats();
    
    res.json({
      success: true,
      data: usageStats,
      total: usageStats.length,
      message: '작업번호 사용 현황 조회 성공'
    });
    
  } catch (err) {
    console.error('❌ 작업번호 사용 현황 조회 실패:', err);
    res.status(500).json({
      success: false,
      data: [],
      message: '작업번호 사용 현황을 조회할 수 없습니다.',
      error: err.message
    });
  }
});

// 라인 상태 통계 조회
router.get('/stats/status', async (req, res) => {
  try {
    console.log('📊 라인 상태 통계 조회 API 호출');
    const stats = await lineService.getLineStatusStats();
    
    res.json({
      success: true,
      data: stats,
      message: '라인 상태 통계 조회 성공'
    });
    
  } catch (err) {
    console.error('❌ 라인 상태 통계 조회 실패:', err);
    res.status(500).json({
      success: false,
      message: '라인 상태 통계를 불러올 수 없습니다.',
      error: err.message
    });
  }
});

// 🔥 특정 작업 결과 상세 조회 API (사용현황 포함)
router.get('/work-result/:workOrderNo', async (req, res) => {
  try {
    const { workOrderNo } = req.params;
    console.log('🔍 작업 결과 상세 조회 API 호출:', workOrderNo);
    
    const workResult = await lineService.getWorkResultDetail(workOrderNo);
    
    if (!workResult) {
      return res.status(404).json({
        success: false,
        message: '작업 결과를 찾을 수 없습니다.'
      });
    }
    
    res.json({
      success: true,
      data: workResult,
      message: '작업 결과 상세 조회 성공'
    });
    
  } catch (err) {
    console.error('❌ 작업 결과 상세 조회 실패:', err);
    res.status(500).json({
      success: false,
      message: '작업 결과 상세 정보를 불러올 수 없습니다.',
      error: err.message
    });
  }
});

// ========== 라인 마스터 관리 API ==========

// 라인 마스터 목록 조회
router.get('/master/list', async (req, res) => {
  try {
    console.log('📋 라인 마스터 목록 조회 API');
    const masterList = await lineService.getLineMasterList();
    res.json({
      success: true,
      data: masterList,
      total: masterList.length
    });
  } catch (err) {
    console.error('❌ 라인 마스터 목록 조회 실패:', err);
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
    console.log('🔍 라인 마스터 상세 조회 API:', req.params.masterId);
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
    console.error('❌ 라인 마스터 상세 조회 실패:', err);
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
    console.log('🔍 기존 라인 상세 조회 API:', req.params.line_id);
    const lineDetail = await lineService.getLineWithMaster(req.params.line_id);
    
    if (lineDetail) {
      res.send(lineDetail);
    } else {
      res.status(404).send({ message: 'Line Not Found' });
    }
  } catch (err) {
    console.error('❌ 기존 라인 상세 조회 실패:', err);
    res.status(500).send({ message: '서버 오류' });
  }
});

// 🔥 라인 상세 조회 (동적 경로는 마지막에 배치)
router.get('/:lineId', async (req, res) => {
  try {
    const { lineId } = req.params;
    console.log('🔍 라인 상세 조회 API 호출:', lineId);
    
    // 🔥 A-INNER, A-OUTER 형식의 ID 처리
    let actualLineId = lineId;
    if (lineId.includes('-')) {
      // "A-INNER" -> "A"로 변환
      actualLineId = lineId.split('-')[0];
      console.log('🔄 라인 ID 변환:', lineId, '->', actualLineId);
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
    console.error('❌ 라인 상세 조회 실패:', err);
    res.status(500).json({
      success: false,
      message: '라인 상세 정보를 불러올 수 없습니다.',
      error: err.message
    });
  }
});

// ========== POST 라우터들 ==========

// 🔥 라인 등록 (로그인 사원 정보 추가)
router.post('/', extractEmployeeInfo, async (req, res) => {
  try {
    console.log('➕ 라인 등록 API 호출');
    console.log('요청 데이터:', req.body);
    console.log('현재 사원:', req.currentEmployee);
    
    // 🔥 로그인 사원 정보를 요청 데이터에 추가
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
    console.error('❌ 라인 등록 실패:', err);
    
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

// 🔥 내포장/외포장 동시 등록 API (로그인 사원 정보 추가)
router.post('/dual', extractEmployeeInfo, async (req, res) => {
  try {
    console.log('➕ 내포장/외포장 동시 등록 API 호출');
    console.log('요청 데이터:', req.body);
    console.log('현재 사원:', req.currentEmployee);
    
    // 🔥 로그인 사원 정보를 요청 데이터에 추가
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
    console.error('❌ 내포장/외포장 동시 등록 실패:', err);
    
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

// 🔥 작업번호 할당 검증 API (새로 추가)
router.post('/validate-work-order', async (req, res) => {
  try {
    const { workOrderNo, lineCode } = req.body;
    console.log('🔍 작업번호 할당 검증 API 호출:', workOrderNo, '→', lineCode);
    
    if (!workOrderNo || !lineCode) {
      return res.status(400).json({
        success: false,
        message: '작업번호와 라인 코드를 입력해주세요.'
      });
    }
    
    const validation = await lineService.validateWorkOrderAssignment(workOrderNo, lineCode);
    
    res.json({
      success: true,
      data: validation,
      message: validation.canAssign ? '할당 가능' : '할당 불가'
    });
    
  } catch (err) {
    console.error('❌ 작업번호 할당 검증 실패:', err);
    res.status(500).json({
      success: false,
      message: '작업번호 할당 검증에 실패했습니다.',
      error: err.message
    });
  }
});

// 라인 마스터 등록
router.post('/master', async (req, res) => {
  try {
    console.log('➕ 라인 마스터 등록 API');
    const result = await lineService.insertLineMaster(req.body);
    res.status(201).json({
      success: true,
      data: result,
      message: '라인 마스터 등록 성공'
    });
  } catch (err) {
    console.error('❌ 라인 마스터 등록 실패:', err);
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
    console.log('➕ 기존 라인 실적 등록 API');
    const result = await lineService.insertLine(req.body);
    res.send(result);
  } catch (err) {
    console.error('❌ 기존 라인 실적 등록 실패:', err);
    res.status(500).send({ isSuccessed: false, message: '서버 오류' });
  }
});

// ========== PUT 라우터들 ==========

// 라인 마스터 수정
router.put('/master/:masterId', async (req, res) => {
  try {
    console.log('✏️ 라인 마스터 수정 API:', req.params.masterId);
    const result = await lineService.updateLineMaster(req.params.masterId, req.body);
    res.json({
      success: true,
      data: result,
      message: '라인 마스터 수정 성공'
    });
  } catch (err) {
    console.error('❌ 라인 마스터 수정 실패:', err);
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
    console.log('✏️ 기존 라인 실적 수정 API:', req.params.line_id);
    const result = await lineService.updateLine(req.params.line_id, req.body);
    res.send(result);
  } catch (err) {
    console.error('❌ 기존 라인 실적 수정 실패:', err);
    res.status(500).send({ isUpdated: false, message: '서버 오류' });
  }
});

// 🔥 라인 수정 (동적 경로는 마지막에)
router.put('/:lineId', extractEmployeeInfo, async (req, res) => {
  try {
    const { lineId } = req.params;
    console.log('✏️ 라인 수정 API 호출:', lineId);
    console.log('수정 데이터:', req.body);
    console.log('현재 사원:', req.currentEmployee);
    
    // 🔥 A-INNER, A-OUTER 형식의 ID 처리
    let actualLineId = lineId;
    if (lineId.includes('-')) {
      // "A-INNER" -> "A"로 변환
      actualLineId = lineId.split('-')[0];
      console.log('🔄 라인 ID 변환:', lineId, '->', actualLineId);
    }
    
    // 🔥 로그인 사원 정보를 요청 데이터에 추가
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
    console.error('❌ 라인 수정 실패:', err);
    
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
    console.log('🗑️ 라인 일괄 삭제 API 호출:', lineIds);
    
    if (!Array.isArray(lineIds) || lineIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: '삭제할 라인 ID를 선택해주세요.'
      });
    }
    
    // 🔥 A-INNER, A-OUTER 형식의 ID들을 실제 라인 코드로 변환
    const actualLineIds = lineIds.map(lineId => {
      if (lineId.includes('-')) {
        return lineId.split('-')[0]; // "A-INNER" -> "A"
      }
      return lineId;
    });
    
    // 🔥 중복 제거 (A-INNER, A-OUTER -> A 하나만)
    const uniqueLineIds = [...new Set(actualLineIds)];
    console.log('🔄 변환된 라인 ID들:', lineIds, '->', uniqueLineIds);
    
    const result = await lineService.bulkDeleteLines(uniqueLineIds);
    
    res.json({
      success: true,
      data: result,
      message: result.message
    });
    
  } catch (err) {
    console.error('❌ 라인 일괄 삭제 실패:', err);
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
    console.log('🗑️ 라인 마스터 삭제 API:', req.params.masterId);
    const result = await lineService.deleteLineMaster(req.params.masterId);
    res.json({
      success: true,
      data: result,
      message: '라인 마스터 삭제 성공'
    });
  } catch (err) {
    console.error('❌ 라인 마스터 삭제 실패:', err);
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
    console.log('🗑️ 기존 라인 실적 삭제 API:', req.params.line_id);
    const result = await lineService.deleteLine(req.params.line_id);
    res.send(result);
  } catch (err) {
    console.error('❌ 기존 라인 실적 삭제 실패:', err);
    res.status(500).send({ isDeleted: false, message: '서버 오류' });
  }
});

// 라인 삭제 (동적 경로는 마지막에)
router.delete('/:lineId', async (req, res) => {
  try {
    const { lineId } = req.params;
    console.log('🗑️ 라인 삭제 API 호출:', lineId);
    
    // 🔥 A-INNER, A-OUTER 형식의 ID 처리
    let actualLineId = lineId;
    if (lineId.includes('-')) {
      // "A-INNER" -> "A"로 변환
      actualLineId = lineId.split('-')[0];
      console.log('🔄 라인 ID 변환:', lineId, '->', actualLineId);
    }
    
    const result = await lineService.deleteIntegratedLine(actualLineId);
    
    res.json({
      success: true,
      data: result,
      message: result.message
    });
    
  } catch (err) {
    console.error('❌ 라인 삭제 실패:', err);
    
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