// routers/packageRouter.js - employees 테이블 연동 추가
const express = require('express');
const router = express.Router();
const packageService = require('../services/packageService');

// 헬스체크
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Package API is running (employees 테이블 연동)',
    timestamp: new Date().toISOString(),
    table_structure: 'work_order_master + work_result + work_result_detail + employees',
    join_relationship: 'work_order_master.work_order_no = work_result.work_order_no = work_result_detail.result_id, work_result_detail.manager_id = employees.employee_id'
  });
});

// ==============================================
// 라인실적등록.txt 기반 작업번호 조회 API (employees 테이블 연동)
// ==============================================

// 내포장 라인별 작업번호 조회 (employees 테이블 연동)
router.get('/works/inner/:lineId', async (req, res) => {
  try {
    const { lineId } = req.params;
    const { line_name, product_code } = req.query;
    
    console.log(`\n=== 내포장 작업번호 조회 API (employees 테이블 연동) ===`);
    console.log(`라인: ${lineId}, ${line_name}, 제품코드: ${product_code}`);
    
    const work = await packageService.getInnerWorkByLine(lineId, line_name);
    
    if (work) {
      console.log(`내포장 작업번호 조회 성공 (employees 연동): ${work.work_order_no}`);
      console.log(`담당자: ${work.employee_name || '담당자미정'}`);
      
      res.json({
        success: true,
        message: `내포장 작업번호 조회 성공 (employees 테이블 연동): ${work.work_order_no}`,
        data: work,
        line_id: lineId,
        line_name: line_name,
        product_code: work.product_code,
        employee_name: work.employee_name || '담당자미정',
        package_type: 'INNER',
        workflow_source: '라인실적등록.txt',
        table_structure: 'work_order_master + work_result + work_result_detail + employees',
        join_relationship: 'work_order_master.work_order_no = work_result.work_order_no, work_result.result_id = work_result_detail.result_id, work_result_detail.manager_id = employees.employee_id',
        workflow_steps: [
          '1) 제품코드 추출',
          '2) work_order_master와 work_result, work_result_detail 조인 조회',
          '3) employees 테이블 조인으로 실제 담당자명 조회',
          '4) p3(내포장) 공정코드로 필터링',
          '5) 대기중인 작업번호 반환'
        ],
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`${lineId} 라인의 내포장 작업번호가 없습니다.`);
      res.json({
        success: false,
        message: `${lineId} 라인의 내포장 작업번호가 없습니다 (employees 테이블 연동됨).`,
        data: null,
        line_id: lineId,
        package_type: 'INNER',
        workflow_source: '라인실적등록.txt',
        table_structure: 'work_order_master + work_result + work_result_detail + employees',
        attempted_steps: [
          '1) 라인명에서 제품코드 추출',
          '2) work_order_master.work_order_no = work_result.work_order_no 조인',
          '3) work_result.result_id = work_result_detail.result_id 조인',
          '4) work_result_detail.manager_id = employees.employee_id 조인',
          '5) process_code = p3 조건으로 내포장 작업 검색',
          '6) code_value IN (waiting, ready) 조건으로 대기중 작업 검색',
          '7) 신규 작업 생성 시도'
        ],
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (err) {
    console.error(`내포장 작업번호 조회 실패 (${req.params.lineId}):`, err);
    res.status(500).json({
      success: false,
      message: `내포장 작업번호 조회 실패: ${err.message}`,
      error: err.message,
      data: null,
      line_id: req.params.lineId,
      workflow_source: '라인실적등록.txt',
      table_structure: 'work_order_master + work_result + work_result_detail + employees',
      timestamp: new Date().toISOString()
    });
  }
});

// 외포장 라인별 작업번호 조회 (employees 테이블 연동)
router.get('/works/outer/:lineId', async (req, res) => {
  try {
    const { lineId } = req.params;
    const { line_name, product_code } = req.query;
    
    console.log(`\n=== 외포장 작업번호 조회 API (employees 테이블 연동) ===`);
    console.log(`라인: ${lineId}, ${line_name}, 제품코드: ${product_code}`);
    
    const work = await packageService.getOuterWorkByLine(lineId, line_name);
    
    if (work) {
      console.log(`외포장 작업번호 조회 성공 (employees 연동): ${work.work_order_no}`);
      console.log(`담당자: ${work.employee_name || '담당자미정'}`);
      
      res.json({
        success: true,
        message: `외포장 작업번호 조회 성공 (employees 테이블 연동): ${work.work_order_no}`,
        data: work,
        line_id: lineId,
        line_name: line_name,
        product_code: work.product_code,
        employee_name: work.employee_name || '담당자미정',
        package_type: 'OUTER',
        workflow_source: '라인실적등록.txt',
        table_structure: 'work_order_master + work_result + work_result_detail + employees',
        workflow_steps: [
          '3-1) 포장공정실적에서 내포장 완료된 건 가져오기',
          'employees 테이블 조인으로 실제 담당자명 조회',
          '외포장 작업 확인 또는 생성',
          'p5(외포장) 공정코드로 대기중인 작업번호 반환'
        ],
        timestamp: new Date().toISOString()
      });
    } else {
      console.log(`${lineId} 라인의 외포장 작업번호가 없습니다.`);
      res.json({
        success: false,
        message: `${lineId} 라인의 외포장 작업번호가 없습니다 (employees 테이블 연동됨).`,
        data: null,
        line_id: lineId,
        package_type: 'OUTER',
        workflow_source: '라인실적등록.txt',
        table_structure: 'work_order_master + work_result + work_result_detail + employees',
        attempted_steps: [
          '3-1) 완료된 내포장 작업 조회 (process_code = p3, code_value = completed)',
          'employees 테이블 조인으로 담당자 정보 확인',
          '외포장 작업 존재 여부 확인 (process_code = p5)',
          '새 외포장 작업 생성 시도',
          '일반 외포장 워크플로우 실행'
        ],
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (err) {
    console.error(`외포장 작업번호 조회 실패 (${req.params.lineId}):`, err);
    res.status(500).json({
      success: false,
      message: `외포장 작업번호 조회 실패: ${err.message}`,
      error: err.message,
      data: null,
      line_id: req.params.lineId,
      workflow_source: '라인실적등록.txt',
      table_structure: 'work_order_master + work_result + work_result_detail + employees',
      timestamp: new Date().toISOString()
    });
  }
});

// ==============================================
// employees 테이블 관련 API 추가
// ==============================================

// 활성 직원 목록 조회
router.get('/employees/active', async (req, res) => {
  try {
    console.log('활성 직원 목록 조회 API 호출');
    
    const activeEmployees = await packageService.executeRawQuery(`
      SELECT 
        employee_id,
        employee_name,
        position,
        hire_date,
        phone,
        email,
        employment_status
      FROM tablets.employees
      WHERE employment_status = 'ACTIVE'
      ORDER BY employee_name
    `);
    
    res.json({
      success: true,
      message: '활성 직원 목록 조회 성공',
      data: activeEmployees,
      count: activeEmployees.length,
      filters: {
        employment_status: 'ACTIVE'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('활성 직원 목록 조회 실패:', err);
    res.status(500).json({
      success: false,
      message: '활성 직원 목록 조회 실패',
      error: err.message,
      data: null,
      timestamp: new Date().toISOString()
    });
  }
});

// 직원별 작업 현황 조회
router.get('/employees/work-status', async (req, res) => {
  try {
    console.log('직원별 작업 현황 조회 API 호출');
    
    const employeeWorkStatus = await packageService.executeRawQuery(`
      SELECT 
        e.employee_id,
        e.employee_name,
        e.position,
        COUNT(wrd.result_detail) as 총담당작업수,
        COUNT(CASE WHEN wrd.code_value = 'waiting' THEN 1 END) as 대기중작업,
        COUNT(CASE WHEN wrd.code_value = 'in_progress' THEN 1 END) as 진행중작업,
        COUNT(CASE WHEN wrd.code_value = 'completed' THEN 1 END) as 완료작업,
        COUNT(CASE WHEN wrd.process_code = 'p3' THEN 1 END) as 내포장작업,
        COUNT(CASE WHEN wrd.process_code = 'p5' THEN 1 END) as 외포장작업
      FROM tablets.employees e
      LEFT JOIN tablets.work_result_detail wrd ON e.employee_id = wrd.manager_id
      WHERE e.employment_status = 'ACTIVE'
      GROUP BY e.employee_id, e.employee_name, e.position
      ORDER BY e.employee_name
    `);
    
    res.json({
      success: true,
      message: '직원별 작업 현황 조회 성공',
      data: employeeWorkStatus,
      count: employeeWorkStatus.length,
      summary: {
        total_active_employees: employeeWorkStatus.length,
        employees_with_work: employeeWorkStatus.filter(emp => emp.총담당작업수 > 0).length,
        employees_without_work: employeeWorkStatus.filter(emp => emp.총담당작업수 === 0).length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('직원별 작업 현황 조회 실패:', err);
    res.status(500).json({
      success: false,
      message: '직원별 작업 현황 조회 실패',
      error: err.message,
      data: null,
      timestamp: new Date().toISOString()
    });
  }
});

// 특정 직원 정보 및 담당 작업 조회
router.get('/employees/:employeeId', async (req, res) => {
  try {
    const { employeeId } = req.params;
    
    console.log(`직원 정보 조회: ${employeeId}`);
    
    // 직원 기본 정보
    const employeeInfo = await packageService.executeRawQuery(`
      SELECT 
        employee_id,
        employee_name,
        position,
        hire_date,
        phone,
        email,
        employment_status
      FROM tablets.employees
      WHERE employee_id = ?
    `, [employeeId]);
    
    if (employeeInfo.length === 0) {
      return res.status(404).json({
        success: false,
        message: `직원 ID ${employeeId}를 찾을 수 없습니다.`,
        data: null,
        timestamp: new Date().toISOString()
      });
    }
    
    // 해당 직원의 담당 작업 목록
    const employeeWorks = await packageService.executeRawQuery(`
      SELECT 
        wom.work_order_no as 작업번호,
        wom.plan_id as 제품코드,
        COALESCE(p.product_name, '제품명없음') as 제품명,
        wrd.process_code as 공정코드,
        CASE WHEN wrd.process_code = 'p3' THEN '내포장' ELSE '외포장' END as 공정명,
        wrd.code_value as 진행상태,
        wrd.work_start_time as 시작시간,
        wrd.work_end_time as 종료시간,
        wrd.pass_qty as 합격수량,
        wrd.process_defective_qty as 불량수량
      FROM tablets.work_result_detail wrd
      JOIN tablets.work_result wr ON wrd.result_id = wr.result_id
      JOIN tablets.work_order_master wom ON wr.work_order_no = wom.work_order_no
      LEFT JOIN tablets.product p ON wom.plan_id = p.product_code
      WHERE wrd.manager_id = ?
      ORDER BY wrd.work_start_time DESC
    `, [employeeId]);
    
    res.json({
      success: true,
      message: `직원 ${employeeInfo[0].employee_name} 정보 조회 성공`,
      data: {
        employee_info: employeeInfo[0],
        assigned_works: employeeWorks,
        work_summary: {
          total_works: employeeWorks.length,
          waiting_works: employeeWorks.filter(w => w.진행상태 === 'waiting').length,
          in_progress_works: employeeWorks.filter(w => w.진행상태 === 'in_progress').length,
          completed_works: employeeWorks.filter(w => w.진행상태 === 'completed').length,
          inner_packaging_works: employeeWorks.filter(w => w.공정코드 === 'p3').length,
          outer_packaging_works: employeeWorks.filter(w => w.공정코드 === 'p5').length
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error(`직원 정보 조회 실패 (${req.params.employeeId}):`, err);
    res.status(500).json({
      success: false,
      message: `직원 정보 조회 실패: ${err.message}`,
      error: err.message,
      data: null,
      timestamp: new Date().toISOString()
    });
  }
});

// ==============================================
// 디버깅 API - employees 테이블 연동 확인
// ==============================================

// employees 테이블 연동 정확성 확인
router.get('/debug/employees-integration-check', async (req, res) => {
  try {
    console.log('employees 테이블 연동 정확성 확인 시작');
    
    // employees 테이블 구조 확인
    const employeesStructure = await packageService.executeRawQuery(`
      SELECT 
        COLUMN_NAME, 
        DATA_TYPE, 
        IS_NULLABLE, 
        COLUMN_DEFAULT
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = DATABASE() 
      AND TABLE_NAME = 'employees'
      ORDER BY ORDINAL_POSITION
    `);
    
    // employees 테이블 데이터 확인
    const employeesData = await packageService.executeRawQuery(`
      SELECT 
        employee_id,
        employee_name,
        position,
        employment_status,
        COUNT(*) OVER() as total_count
      FROM tablets.employees
      LIMIT 10
    `);
    
    // work_result_detail과 employees 조인 테스트
    const joinTestWithEmployees = await packageService.executeRawQuery(`
      SELECT 
        wom.work_order_no as 작업번호,
        wom.plan_id as 제품코드,
        wrd.process_code as 공정코드,
        wrd.code_value as 진행상태,
        wrd.manager_id as 담당자ID,
        COALESCE(e.employee_name, '담당자미정') as 담당자명,
        COALESCE(e.position, '직급미정') as 담당자직급
      FROM tablets.work_order_master wom
      JOIN tablets.work_result wr ON wom.work_order_no = wr.work_order_no
      JOIN tablets.work_result_detail wrd ON wr.result_id = wrd.result_id
      LEFT JOIN tablets.employees e ON wrd.manager_id = e.employee_id
      LIMIT 10
    `);
    
    // 담당자별 작업 분포
    const workDistribution = await packageService.executeRawQuery(`
      SELECT 
        COALESCE(e.employee_name, '담당자미정') as 담당자명,
        COALESCE(e.position, '직급미정') as 직급,
        COUNT(*) as 담당작업수,
        COUNT(CASE WHEN wrd.process_code = 'p3' THEN 1 END) as 내포장작업,
        COUNT(CASE WHEN wrd.process_code = 'p5' THEN 1 END) as 외포장작업,
        COUNT(CASE WHEN wrd.code_value = 'waiting' THEN 1 END) as 대기중작업,
        COUNT(CASE WHEN wrd.code_value = 'in_progress' THEN 1 END) as 진행중작업,
        COUNT(CASE WHEN wrd.code_value = 'completed' THEN 1 END) as 완료작업
      FROM tablets.work_result_detail wrd
      LEFT JOIN tablets.employees e ON wrd.manager_id = e.employee_id
      GROUP BY e.employee_name, e.position, wrd.manager_id
      ORDER BY 담당작업수 DESC
    `);
    
    // manager_id가 NULL인 작업들 확인
    const nullManagerWorks = await packageService.executeRawQuery(`
      SELECT 
        COUNT(*) as null_manager_count,
        COUNT(CASE WHEN wrd.process_code = 'p3' THEN 1 END) as null_내포장,
        COUNT(CASE WHEN wrd.process_code = 'p5' THEN 1 END) as null_외포장
      FROM tablets.work_result_detail wrd
      WHERE wrd.manager_id IS NULL
    `);
    
    res.json({
      success: true,
      message: 'employees 테이블 연동 정확성 확인 완료',
      data: {
        employees_table_structure: {
          description: 'employees 테이블 구조',
          columns: employeesStructure,
          column_count: employeesStructure.length
        },
        employees_sample_data: {
          description: 'employees 테이블 샘플 데이터',
          data: employeesData,
          total_employees: employeesData.length > 0 ? employeesData[0].total_count : 0
        },
        join_test_with_employees: {
          description: 'work_result_detail과 employees 조인 테스트',
          data: joinTestWithEmployees,
          count: joinTestWithEmployees.length,
          success: joinTestWithEmployees.length > 0
        },
        work_distribution_by_employee: {
          description: '담당자별 작업 분포',
          data: workDistribution,
          count: workDistribution.length
        },
        null_manager_analysis: {
          description: 'manager_id가 NULL인 작업 분석',
          data: nullManagerWorks[0] || {},
          needs_attention: nullManagerWorks[0] && nullManagerWorks[0].null_manager_count > 0
        }
      },
      table_join_relationship: 'work_order_master.work_order_no = work_result.work_order_no, work_result.result_id = work_result_detail.result_id, work_result_detail.manager_id = employees.employee_id',
      integration_status: 'employees 테이블 연동 완료',
      key_improvements: [
        'employees 테이블과 work_result_detail 테이블 조인',
        '실제 직원명으로 하드코딩된 김포장 대체',
        'manager_id를 통한 담당자 정보 연결',
        '직급, 연락처 등 직원 상세 정보 제공',
        '담당자별 작업 현황 추적 가능'
      ],
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('employees 테이블 연동 정확성 확인 실패:', err);
    res.status(500).json({
      success: false,
      message: 'employees 테이블 연동 정확성 확인 실패',
      error: err.message,
      data: null,
      timestamp: new Date().toISOString()
    });
  }
});

// ==============================================
// 워크플로우 기반 API (employees 테이블 연동)
// ==============================================

// 내포장 작업 시작 (employees 테이블 연동)
router.post('/workflow/start-inner', async (req, res) => {
  try {
    const { work_order_no, product_code, process_group_code } = req.body;
    
    console.log('내포장 작업 시작 (employees 테이블 연동):', { work_order_no, product_code, process_group_code });
    
    const result = await packageService.startInnerPackagingWorkflow(work_order_no, product_code, process_group_code);
    
    // 담당자 정보 조회
    const employeeInfo = await packageService.executeRawQuery(`
      SELECT 
        e.employee_name,
        e.position
      FROM tablets.work_result_detail wrd
      JOIN tablets.work_result wr ON wrd.result_id = wr.result_id
      JOIN tablets.work_order_master wom ON wr.work_order_no = wom.work_order_no
      LEFT JOIN tablets.employees e ON wrd.manager_id = e.employee_id
      WHERE wom.work_order_no = ?
      AND wrd.process_code = 'p3'
      LIMIT 1
    `, [work_order_no]);
    
    res.json({
      success: result.success,
      message: result.success ? '내포장 작업이 시작되었습니다.' : '내포장 작업 시작 실패',
      data: result.data,
      employee_info: employeeInfo.length > 0 ? employeeInfo[0] : { employee_name: '담당자미정', position: '직급미정' },
      error: result.error || null,
      workflow_type: 'inner_packaging_start',
      workflow_step: '2-4) 작업시작 시 - 내포장시 진행상태 = 진행',
      table_join_used: 'work_order_master.work_order_no = work_result.work_order_no, work_result.result_id = work_result_detail.result_id, work_result_detail.manager_id = employees.employee_id',
      sql_executed: 'UPDATE work_result_detail SET code_value = in_progress (employees 테이블 연동)',
      workflow_source: '라인실적등록.txt',
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('내포장 작업 시작 실패:', err);
    res.status(500).json({
      success: false,
      message: '내포장 작업 시작 중 오류 발생',
      error: err.message,
      data: null,
      timestamp: new Date().toISOString()
    });
  }
});

// 내포장 작업 완료 (employees 테이블 연동)
router.post('/workflow/complete-inner', async (req, res) => {
  try {
    const { work_order_no, pass_qty, defective_qty } = req.body;
    
    console.log('내포장 작업 완료 (employees 테이블 연동):', { work_order_no, pass_qty, defective_qty });
    
    const result = await packageService.completeInnerPackagingWorkflow(work_order_no, pass_qty, defective_qty);
    
    // 담당자 정보 조회
    const employeeInfo = await packageService.executeRawQuery(`
      SELECT 
        e.employee_name,
        e.position
      FROM tablets.work_result_detail wrd
      JOIN tablets.work_result wr ON wrd.result_id = wr.result_id
      JOIN tablets.work_order_master wom ON wr.work_order_no = wom.work_order_no
      LEFT JOIN tablets.employees e ON wrd.manager_id = e.employee_id
      WHERE wom.work_order_no = ?
      AND wrd.process_code = 'p3'
      LIMIT 1
    `, [work_order_no]);
    
    res.json({
      success: result.success,
      message: result.success ? '내포장 작업이 완료되었습니다.' : '내포장 작업 완료 실패',
      data: result.data,
      employee_info: employeeInfo.length > 0 ? employeeInfo[0] : { employee_name: '담당자미정', position: '직급미정' },
      error: result.error || null,
      workflow_type: 'inner_packaging_complete',
      workflow_step: '내포장 완료시 실적 상세 테이블에 종료시간 업데이트',
      table_join_used: 'work_order_master.work_order_no = work_result.work_order_no, work_result.result_id = work_result_detail.result_id, work_result_detail.manager_id = employees.employee_id',
      sql_executed: 'UPDATE work_result_detail SET code_value = completed (employees 테이블 연동)',
      workflow_source: '라인실적등록.txt',
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('내포장 작업 완료 실패:', err);
    res.status(500).json({
      success: false,
      message: '내포장 작업 완료 중 오류 발생',
      error: err.message,
      data: null,
      timestamp: new Date().toISOString()
    });
  }
});

// 외포장 작업 시작 (employees 테이블 연동)
router.post('/workflow/start-outer', async (req, res) => {
  try {
    const { work_order_no, product_code, process_group_code, inner_output_qty } = req.body;
    
    console.log('외포장 작업 시작 (employees 테이블 연동):', { work_order_no, product_code, process_group_code, inner_output_qty });
    
    const result = await packageService.startOuterPackagingWorkflow(work_order_no, product_code, process_group_code, inner_output_qty);
    
    // 담당자 정보 조회
    const employeeInfo = await packageService.executeRawQuery(`
      SELECT 
        e.employee_name,
        e.position
      FROM tablets.work_result_detail wrd
      JOIN tablets.work_result wr ON wrd.result_id = wr.result_id
      JOIN tablets.work_order_master wom ON wr.work_order_no = wom.work_order_no
      LEFT JOIN tablets.employees e ON wrd.manager_id = e.employee_id
      WHERE wom.work_order_no = ?
      AND wrd.process_code = 'p5'
      LIMIT 1
    `, [work_order_no]);
    
    res.json({
      success: result.success,
      message: result.success ? '외포장 작업이 시작되었습니다.' : '외포장 작업 시작 실패',
      data: result.data,
      employee_info: employeeInfo.length > 0 ? employeeInfo[0] : { employee_name: '담당자미정', position: '직급미정' },
      error: result.error || null,
      workflow_type: 'outer_packaging_start',
      workflow_step: '외포장 작업 시작 - 내포장 완료수량 연계',
      table_join_used: 'work_order_master.work_order_no = work_result.work_order_no, work_result.result_id = work_result_detail.result_id, work_result_detail.manager_id = employees.employee_id',
      sql_executed: 'UPDATE work_result_detail SET code_value = in_progress (p5, employees 테이블 연동)',
      workflow_source: '라인실적등록.txt',
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('외포장 작업 시작 실패:', err);
    res.status(500).json({
      success: false,
      message: '외포장 작업 시작 중 오류 발생',
      error: err.message,
      data: null,
      timestamp: new Date().toISOString()
    });
  }
});

// 외포장 작업 완료 (employees 테이블 연동)
router.post('/workflow/complete-outer', async (req, res) => {
  try {
    const { work_order_no, pass_qty, defective_qty } = req.body;
    
    console.log('외포장 작업 완료 (employees 테이블 연동):', { work_order_no, pass_qty, defective_qty });
    
    const result = await packageService.completeOuterPackagingWorkflow(work_order_no, pass_qty, defective_qty);
    
    // 담당자 정보 조회
    const employeeInfo = await packageService.executeRawQuery(`
      SELECT 
        e.employee_name,
        e.position
      FROM tablets.work_result_detail wrd
      JOIN tablets.work_result wr ON wrd.result_id = wr.result_id
      JOIN tablets.work_order_master wom ON wr.work_order_no = wom.work_order_no
      LEFT JOIN tablets.employees e ON wrd.manager_id = e.employee_id
      WHERE wom.work_order_no = ?
      AND wrd.process_code = 'p5'
      LIMIT 1
    `, [work_order_no]);
    
    res.json({
      success: result.success,
      message: result.success ? '외포장 작업이 완료되었습니다. 모든 포장 단계가 완료되었습니다!' : '외포장 작업 완료 실패',
      data: result.data,
      employee_info: employeeInfo.length > 0 ? employeeInfo[0] : { employee_name: '담당자미정', position: '직급미정' },
      error: result.error || null,
      workflow_type: 'outer_packaging_complete',
      workflow_step: '3-2) 외포장공정 종료 시 - 진행상태 = 검사중',
      table_join_used: 'work_order_master.work_order_no = work_result.work_order_no, work_result.result_id = work_result_detail.result_id, work_result_detail.manager_id = employees.employee_id',
      sql_executed: 'UPDATE work_result_detail SET code_value = inspection (employees 테이블 연동)',
      workflow_source: '라인실적등록.txt',
      all_packaging_completed: result.data?.all_packaging_completed || false,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('외포장 작업 완료 실패:', err);
    res.status(500).json({
      success: false,
      message: '외포장 작업 완료 중 오류 발생',
      error: err.message,
      data: null,
      timestamp: new Date().toISOString()
    });
  }
});

// ==============================================
// 기존 package_work 테이블 기반 API (호환성 유지)
// ==============================================

// 작업 목록 조회 (기존 기능)
router.get('/works', async (req, res) => {
  try {
    const { package_type, line_id, line_name } = req.query;
    
    console.log('기존 package_work 테이블 기반 작업 목록 조회');
    console.log('필터 파라미터:', { package_type, line_id, line_name });
    
    const workList = await packageService.getWorkList(package_type, line_id, line_name);
    
    console.log(`작업 목록 조회 성공: ${workList.length}건`);
    
    const metadata = {
      total_works: workList.length,
      filters_applied: {
        package_type: package_type || 'ALL',
        line_id: line_id || 'ALL',
        line_name: line_name || 'ALL'
      },
      data_source: 'package_work_table (기존 호환성)',
      table_structure_note: '새로운 API는 work_order_master + work_result + work_result_detail + employees 사용',
      timestamp: new Date().toISOString()
    };
    
    if (workList.length > 0) {
      const statusBreakdown = {};
      workList.forEach(work => {
        const status = work.step_status || 'UNKNOWN';
        statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
      });
      metadata.status_breakdown = statusBreakdown;
    }
    
    res.json({
      success: true,
      message: 'package_work 테이블 기반 작업 목록 조회 성공',
      data: workList,
      count: workList.length,
      filters: {
        package_type: package_type || 'ALL',
        line_id: line_id || 'ALL',
        line_name: line_name || 'ALL'
      },
      metadata: metadata,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('작업 목록 조회 실패:', err);
    
    let errorCode = 'UNKNOWN_ERROR';
    let statusCode = 500;
    
    if (err.code === 'ER_NO_SUCH_TABLE') {
      errorCode = 'TABLE_NOT_FOUND';
      statusCode = 404;
    } else if (err.code === 'ER_BAD_FIELD_ERROR') {
      errorCode = 'COLUMN_NOT_FOUND';
      statusCode = 400;
    }
    
    res.status(statusCode).json({
      success: false,
      message: '작업 목록 조회 실패',
      error: err.message,
      error_code: errorCode,
      data: [],
      timestamp: new Date().toISOString()
    });
  }
});

// 작업 상세 조회 (기존 기능)
router.get('/works/:workNo', async (req, res) => {
  try {
    const { workNo } = req.params;
    
    console.log(`기존 테이블 기반 작업 상세 조회: ${workNo}`);
    
    const workDetail = await packageService.getWorkDetail(workNo);
    
    if (!workDetail) {
      return res.status(404).json({
        success: false,
        message: `작업번호 ${workNo}를 찾을 수 없습니다.`,
        data: null,
        timestamp: new Date().toISOString()
      });
    }
    
    res.json({
      success: true,
      message: `작업번호 ${workNo} 상세 조회 성공`,
      data: workDetail,
      metadata: {
        work_no: workNo,
        data_source: 'package_work_table (기존 호환성)',
        table_structure_note: '새로운 API는 work_order_master + work_result + work_result_detail + employees 사용',
        retrieved_at: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error(`작업 상세 조회 실패 (${req.params.workNo}):`, err);
    res.status(500).json({
      success: false,
      message: `작업번호 ${req.params.workNo} 상세 조회 실패`,
      error: err.message,
      data: null,
      timestamp: new Date().toISOString()
    });
  }
});

// ==============================================
// 디버깅 API (employees 테이블 연동)
// ==============================================

// 데이터베이스 연결 테스트
router.get('/debug/connection-test', async (req, res) => {
  try {
    console.log('데이터베이스 연결 테스트 시작');
    
    const connectionTest = await packageService.executeRawQuery('SELECT 1 as test_value');
    const schemaTest = await packageService.executeRawQuery('SELECT DATABASE() as current_db');
    
    const packageWorkTest = await packageService.executeRawQuery(`SELECT COUNT(*) as package_work_count FROM package_work`);
    const workOrderMasterTest = await packageService.executeRawQuery(`SELECT COUNT(*) as work_order_master_count FROM work_order_master`);
    const workResultTest = await packageService.executeRawQuery(`SELECT COUNT(*) as work_result_count FROM work_result`);
    const workResultDetailTest = await packageService.executeRawQuery(`SELECT COUNT(*) as work_result_detail_count FROM work_result_detail`);
    const employeesTest = await packageService.executeRawQuery(`SELECT COUNT(*) as employees_count FROM employees`);
    
    const processTest = await packageService.executeRawQuery(`SELECT COUNT(*) as process_count FROM process`);
    const processGroupTest = await packageService.executeRawQuery(`SELECT COUNT(*) as process_group_count FROM process_group`);
    
    res.json({
      success: true,
      message: '데이터베이스 연결 테스트 성공 (employees 테이블 연동)',
      data: {
        connection_status: 'OK',
        test_query_result: connectionTest[0].test_value,
        current_database: schemaTest[0].current_db,
        // 기존 테이블
        package_work_rows: packageWorkTest[0].package_work_count,
        // 올바른 테이블들
        work_order_master_rows: workOrderMasterTest[0].work_order_master_count,
        work_result_rows: workResultTest[0].work_result_count,
        work_result_detail_rows: workResultDetailTest[0].work_result_detail_count,
        // employees 테이블
        employees_rows: employeesTest[0].employees_count,
        // 공정 테이블들
        process_rows: processTest[0].process_count,
        process_group_rows: processGroupTest[0].process_group_count,
        // 테이블 구조 개선
        table_structure_improvement: 'work_order_master + work_result + work_result_detail + employees',
        join_relationship: 'work_order_master.work_order_no = work_result.work_order_no, work_result.result_id = work_result_detail.result_id, work_result_detail.manager_id = employees.employee_id',
        workflow_implementation: '라인실적등록.txt + employees 테이블 연동',
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (err) {
    console.error('데이터베이스 연결 테스트 실패:', err);
    res.status(500).json({
      success: false,
      message: '데이터베이스 연결 테스트 실패',
      error: err.message,
      error_code: err.code || 'UNKNOWN',
      data: null
    });
  }
});

// 테이블 구조 확인
router.get('/debug/table-structure', async (req, res) => {
  try {
    console.log('테이블 구조 확인 API 호출');
    
    const result = await packageService.debugTableStructure();
    
    res.json({
      success: result.success,
      message: result.success ? '테이블 구조 확인 완료 (employees 테이블 연동)' : '테이블 구조 확인 실패',
      data: result.data,
      error: result.error || null,
      table_structure_improvement: 'work_order_master + work_result + work_result_detail + employees',
      workflow_implementation: '라인실적등록.txt + employees 테이블 연동',
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('테이블 구조 확인 실패:', err);
    res.status(500).json({
      success: false,
      message: '테이블 구조 확인 중 오류 발생',
      error: err.message,
      data: null,
      timestamp: new Date().toISOString()
    });
  }
});

// 단순 데이터 확인
router.get('/debug/simple-data-check', async (req, res) => {
  try {
    console.log('단순 데이터 확인 시작');
    
    const result = await packageService.simpleDataCheck();
    
    res.json({
      success: result.success,
      message: result.success ? '단순 데이터 확인 완료 (employees 테이블 연동)' : '단순 데이터 확인 실패',
      data: result.data,
      error: result.error || null,
      table_structure_improvement: 'work_order_master + work_result + work_result_detail + employees',
      workflow_implementation: '라인실적등록.txt + employees 테이블 연동',
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('단순 데이터 확인 실패:', err);
    res.status(500).json({
      success: false,
      message: '단순 데이터 확인 실패',
      error: err.message,
      data: null,
      timestamp: new Date().toISOString()
    });
  }
});

// 원시 SQL 직접 실행 (디버깅용)
router.post('/debug/raw-sql', async (req, res) => {
  try {
    const { query, description } = req.body;
    
    if (!query) {
      return res.status(400).json({
        success: false,
        message: 'SQL 쿼리가 필요합니다.',
        data: null
      });
    }
    
    const lowerQuery = query.toLowerCase().trim();
    const allowedQueries = ['select', 'show', 'describe', 'explain'];
    const isAllowed = allowedQueries.some(allowed => lowerQuery.startsWith(allowed));
    
    if (!isAllowed) {
      return res.status(400).json({
        success: false,
        message: 'SELECT, SHOW, DESCRIBE, EXPLAIN 쿼리만 허용됩니다.',
        data: null
      });
    }
    
    console.log(`안전한 원시 SQL 실행: ${description || 'No description'}`);
    console.log(`쿼리: ${query}`);
    
    const result = await packageService.executeRawQuery(query);
    
    res.json({
      success: true,
      message: '원시 SQL 실행 성공',
      data: {
        description: description || 'No description',
        query: query,
        result_count: Array.isArray(result) ? result.length : 1,
        result: result,
        sample_result: Array.isArray(result) && result.length > 0 ? result[0] : result
      },
      table_structure_note: 'work_order_master + work_result + work_result_detail + employees',
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('원시 SQL 실행 실패:', err);
    res.status(500).json({
      success: false,
      message: '원시 SQL 실행 실패',
      error: err.message,
      data: null,
      timestamp: new Date().toISOString()
    });
  }
});

module.exports = router;