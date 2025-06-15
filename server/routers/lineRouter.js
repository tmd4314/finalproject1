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

// ========== 프론트엔드용 메인 API ==========

// 전체 라인 목록 조회 (통합: 마스터 + 최신 상태)
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

// 🔥 현재 로그인 사원 정보 조회 API 추가
router.get('/current-employee', extractEmployeeInfo, async (req, res) => {
  try {
    res.json({
      success: true,
      data: req.currentEmployee,
      message: '현재 로그인 사원 정보 조회 성공'
    });
  } catch (err) {
    res.status(500).json({
      success: false,
      message: '사원 정보 조회 실패'
    });
  }
});

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

// 라인 상세 조회
router.get('/:lineId', async (req, res) => {
  try {
    const { lineId } = req.params;
    console.log('🔍 라인 상세 조회 API 호출:', lineId);
    
    const lineDetail = await lineService.getLineMasterByLineId(lineId);
    
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

// 🔥 라인 수정 (로그인 사원 정보 추가)
router.put('/:lineId', extractEmployeeInfo, async (req, res) => {
  try {
    const { lineId } = req.params;
    console.log('✏️ 라인 수정 API 호출:', lineId);
    console.log('수정 데이터:', req.body);
    console.log('현재 사원:', req.currentEmployee);
    
    // 🔥 로그인 사원 정보를 요청 데이터에 추가
    const requestData = {
      ...req.body,
      employee_id: req.currentEmployee.employee_id,
      employee_name: req.currentEmployee.employee_name
    };
    
    const result = await lineService.updateIntegratedLine(lineId, requestData);
    
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

// 라인 삭제 (통합: 마스터 + 상태 동시 삭제)
router.delete('/:lineId', async (req, res) => {
  try {
    const { lineId } = req.params;
    console.log('🗑️ 라인 삭제 API 호출:', lineId);
    
    const result = await lineService.deleteIntegratedLine(lineId);
    
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

// 라인 일괄 삭제
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
    
    const result = await lineService.bulkDeleteLines(lineIds);
    
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

module.exports = router;