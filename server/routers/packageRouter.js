// routers/packageRouter.js (mapper 방식에 맞춘 안전한 버전)
const express = require('express');
const router = express.Router();
const packageService = require('../services/packageService');

// 🔥 헬스체크
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Package API is running',
    timestamp: new Date().toISOString()
  });
});

// 🔥 작업번호 목록 조회 => 라인이 가지고 있는 제품코드를 기반으로 
router.get('/works', async (req, res) => {
  try {
    const { package_type } = req.query;
    
    console.log('📡 작업번호 목록 조회 API 호출됨');
    console.log('포장타입 필터:', package_type);
    
    const workList = await packageService.getWorkList(package_type);
    
    console.log(`✅ 작업 목록 조회 성공: ${workList.length}건`);
    
    // 조인 통계 계산
    const joinStats = packageService.calculateWorkStats(workList);
    
    res.json({
      success: true,
      message: '작업번호 목록 조회 성공',
      data: workList,
      count: workList.length,
      package_type: package_type || 'ALL',
      timestamp: new Date().toISOString(),
      
      // 조인 메타데이터
      join_metadata: {
        total_works: workList.length,
        join_success_rates: joinStats.join_success_rate,
        data_quality: {
          with_real_product_names: workList.filter(w => 
            w.product_name && w.product_name !== '제품정보없음'
          ).length,
          with_order_data: workList.filter(w => 
            w.join_info?.has_order
          ).length,
          with_employee_data: workList.filter(w => 
            w.join_info?.has_employee
          ).length
        }
      }
    });
    
  } catch (err) {
    console.error('❌ 작업번호 목록 조회 실패:', err);
    res.status(500).json({
      success: false,
      message: '작업번호 목록 조회 실패',
      error: err.message,
      data: []
    });
  }
});

// 🔥 개별 작업 상세 조회 (안전 처리)
router.get('/:workNo', async (req, res) => {
  try {
    const { workNo } = req.params;
    
    console.log(`📡 개별 작업 조회: ${workNo}`);
    
    // 🔥 부분완료 처리 포함 상세 조회 사용
    const workDetail = await packageService.getWorkDetailWithPartialHandling(workNo);
    
    if (!workDetail) {
      console.log(`❌ 작업번호 ${workNo}를 찾을 수 없습니다.`);
      return res.status(404).json({
        success: false,
        message: `작업번호 ${workNo}를 찾을 수 없습니다.`,
        error: '데이터베이스에 해당 작업이 존재하지 않습니다.',
        data: null
      });
    }
    
    console.log(`✅ 작업 상세 조회 성공: ${workNo}`);
    
    res.json({
      success: true,
      message: `작업번호 ${workNo} 상세 조회 성공`,
      data: workDetail,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error(`❌ 작업 상세 조회 실패 (${req.params.workNo}):`, err);
    res.status(500).json({
      success: false,
      message: `작업번호 ${req.params.workNo} 상세 조회 실패`,
      error: err.message,
      data: null
    });
  }
});

// 🔥 작업 등록
router.post('/works', async (req, res) => {
  try {
    console.log('📡 작업 등록 요청:', req.body);
    
    const workData = await packageService.createWork(req.body);
    
    console.log('✅ 작업 등록 성공:', workData.work_no);
    
    res.json({
      success: true,
      message: '작업 등록 성공',
      data: workData,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('❌ 작업 등록 실패:', err);
    res.status(500).json({
      success: false,
      message: '작업 등록 실패',
      error: err.message,
      data: null
    });
  }
});

// 🔥 작업 업데이트 (service.js 함수 사용)
router.put('/:workNo', async (req, res) => {
  try {
    const { workNo } = req.params;
    
    console.log(`📡 ===== PUT 작업 업데이트 시작: ${workNo} =====`);
    console.log('요청 데이터:', JSON.stringify(req.body, null, 2));
    
    // 🔥 service.js의 안전한 업데이트 함수 사용
    const updateResult = await packageService.updateWorkSafe(workNo, req.body);
    
    console.log(`✅ 작업 업데이트 성공: ${workNo}`);
    console.log(`📡 ===== PUT 작업 업데이트 완료: ${workNo} =====`);
    
    res.json({
      success: true,
      message: '작업 업데이트 성공',
      data: updateResult,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error(`❌ ===== PUT 작업 업데이트 실패: ${req.params.workNo} =====`);
    console.error('에러 상세:', err);
    
    res.status(500).json({
      success: false,
      message: `작업번호 ${req.params.workNo} 업데이트 실패`,
      error: err.message,
      timestamp: new Date().toISOString()
    });
  }
});

// 🔥 작업 완료
router.put('/:workNo/complete', async (req, res) => {
  try {
    const { workNo } = req.params;
    
    console.log(`📡 작업 완료 처리: ${workNo}`, req.body);
    
    // 🔥 packageService의 안전한 업데이트 사용 (시간 형식 자동 변환)
    const completeData = {
      step_status: '완료',
      output_qty: req.body.output_qty || 0,
      end_time: new Date().toISOString(), // ISO 형식으로 전달 (service에서 변환됨)
      employee_id: req.body.employee_id || 2
    };
    
    const result = await packageService.updateWorkSafe(workNo, completeData);
    
    console.log(`✅ 작업 완료 처리 성공: ${workNo}`);
    
    res.json({
      success: true,
      message: '작업 완료 처리 성공',
      data: { work_no: workNo, status: '완료', ...result },
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error(`❌ 작업 완료 처리 실패 (${req.params.workNo}):`, err);
    res.status(500).json({
      success: false,
      message: `작업번호 ${req.params.workNo} 완료 처리 실패`,
      error: err.message,
      data: null
    });
  }
});

// 🔥 부분완료 처리 (service.js 함수 사용)
router.put('/:workNo/partial-complete', async (req, res) => {
  try {
    const { workNo } = req.params;
    
    console.log(`📡 부분완료 처리: ${workNo}`, req.body);
    
    // 🔥 service.js 함수 사용
    const result = await packageService.updateWorkPartialComplete(workNo, req.body);
    
    console.log(`✅ 부분완료 처리 성공: ${workNo}`);
    
    res.json({
      success: true,
      message: '부분완료 처리 성공',
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error(`❌ 부분완료 처리 실패 (${req.params.workNo}):`, err);
    res.status(500).json({
      success: false,
      message: `작업번호 ${req.params.workNo} 부분완료 처리 실패`,
      error: err.message,
      data: null
    });
  }
});

// 🔥 일시정지 처리 (service.js 함수 사용)
router.put('/:workNo/pause', async (req, res) => {
  try {
    const { workNo } = req.params;
    
    console.log(`📡 일시정지 처리: ${workNo}`, req.body);
    
    // 🔥 service.js 함수 사용
    const result = await packageService.updateWorkPause(workNo, req.body);
    
    console.log(`✅ 일시정지 처리 성공: ${workNo}`);
    
    res.json({
      success: true,
      message: '일시정지 처리 성공',
      data: result,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error(`❌ 일시정지 처리 실패 (${req.params.workNo}):`, err);
    res.status(500).json({
      success: false,
      message: `작업번호 ${req.params.workNo} 일시정지 처리 실패`,
      error: err.message,
      data: null
    });
  }
});

// 🔥 내포장 완료 정보 조회
router.get('/workflow/inner-completed', async (req, res) => {
  try {
    const { base_line_name } = req.query;
    
    console.log(`📡 내포장 완료 정보 조회: ${base_line_name}`);
    
    if (!base_line_name) {
      return res.status(400).json({
        success: false,
        message: 'base_line_name 파라미터가 필요합니다.',
        data: null
      });
    }
    
    // 🔥 새 쿼리 사용
    const db = require('../database/mapper');
    const result = await db.query('selectInnerCompletionByLineCode', [base_line_name]);
    
    if (result.length === 0) {
      console.log(`⚠️ ${base_line_name}의 내포장 완료 정보 없음`);
      return res.json({
        success: false,
        message: `${base_line_name}의 내포장 완료 정보를 찾을 수 없습니다.`,
        data: null
      });
    }
    
    console.log(`✅ 내포장 완료 정보 조회 성공: ${base_line_name}`);
    
    res.json({
      success: true,
      message: '내포장 완료 정보 조회 성공',
      data: result[0],
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('❌ 내포장 완료 정보 조회 실패:', err);
    res.status(500).json({
      success: false,
      message: '내포장 완료 정보 조회 실패',
      error: err.message,
      data: null
    });
  }
});

// 🔥 외포장 연계 업데이트 API
router.post('/workflow/update-outer-linkage', async (req, res) => {
  try {
    const {
      base_line_name,
      inner_work_no,
      inner_output_qty,
      inner_completion_time,
      completion_type = 'complete',
      completed_by
    } = req.body;
    
    console.log(`📡 외포장 연계 업데이트: ${base_line_name}`, req.body);
    
    if (!base_line_name || !inner_work_no || !inner_output_qty) {
      return res.status(400).json({
        success: false,
        message: '필수 파라미터가 누락되었습니다. (base_line_name, inner_work_no, inner_output_qty)',
        data: null
      });
    }
    
    const db = require('../database/mapper');
    
    // 🔥 시간 형식 변환
    const formattedCompletionTime = inner_completion_time ? 
      packageService.formatDateTimeForDB(inner_completion_time) : 
      packageService.formatDateTimeForDB(new Date());
    
    // 🔥 1단계: 외포장 라인에 내포장 완료수량 연계
    try {
      await db.query('linkInnerToOuter', [inner_output_qty, base_line_name]);
      console.log(`✅ 외포장 라인에 수량 연계 완료: ${inner_output_qty}개`);
    } catch (linkError) {
      console.log(`⚠️ linkInnerToOuter 쿼리 실패, 직접 UPDATE 시도:`, linkError.message);
      
      // 🔥 직접 UPDATE 시도
      await db.query(`
        UPDATE tablets.package_work w
        INNER JOIN tablets.package_line l ON w.work_no = l.curr_work_no
        SET 
          w.input_qty = ?,
          w.upd_date = NOW()
        WHERE 
          l.pkg_type = 'OUTER'
          AND l.line_code = ?
          AND w.step_status IN ('READY', '준비')
      `, [inner_output_qty, base_line_name]);
      
      console.log(`✅ 직접 UPDATE로 외포장 연계 완료`);
    }
    
    // 🔥 2단계: 워크플로우 상태 기록 (선택사항 - 테이블이 없으면 스킵)
    try {
      await db.query('updateWorkflowStatus', [
        base_line_name,
        base_line_name,
        inner_work_no,
        null, // outer_work_no는 나중에 업데이트
        inner_output_qty,
        formattedCompletionTime, // 🔥 변환된 시간 사용
        'inner_completed',
        completed_by || 2
      ]);
      console.log(`✅ 워크플로우 상태 기록 완료`);
    } catch (statusError) {
      console.log(`⚠️ 워크플로우 상태 기록 실패 (무시): ${statusError.message}`);
      // workflow_linkage 테이블이 없을 수 있으므로 무시
    }
    
    res.json({
      success: true,
      message: '외포장 연계 업데이트 성공',
      data: {
        base_line_name,
        inner_work_no,
        inner_output_qty,
        completion_type,
        linked_at: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('❌ 외포장 연계 업데이트 실패:', err);
    res.status(500).json({
      success: false,
      message: '외포장 연계 업데이트 실패',
      error: err.message,
      data: null
    });
  }
});

// 🔥 워크플로우 상태 조회 API (디버깅용)
router.get('/workflow/status/:lineCode', async (req, res) => {
  try {
    const { lineCode } = req.params;
    
    console.log(`📡 워크플로우 상태 조회: ${lineCode}`);
    
    const db = require('../database/mapper');
    const result = await db.query('selectWorkflowByLineCode', [lineCode]);
    
    if (result.length === 0) {
      return res.json({
        success: false,
        message: `${lineCode}의 워크플로우 정보를 찾을 수 없습니다.`,
        data: null
      });
    }
    
    res.json({
      success: true,
      message: '워크플로우 상태 조회 성공',
      data: result[0],
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('❌ 워크플로우 상태 조회 실패:', err);
    res.status(500).json({
      success: false,
      message: '워크플로우 상태 조회 실패',
      error: err.message,
      data: null
    });
  }
});

module.exports = router;