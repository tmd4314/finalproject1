// routers/packageRouter.js - 실제 DB 데이터 강제 사용 버전
const express = require('express');
const router = express.Router();
const packageService = require('../services/packageService');

// 헬스체크
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Package API is running - Real DB Only Mode',
    timestamp: new Date().toISOString()
  });
});

// ==============================================
// 실제 DB 강제 사용 - 작업 목록 조회
// ==============================================

// 작업 목록 조회 (실제 DB만 사용)
router.get('/works', async (req, res) => {
  try {
    const { package_type, line_id, line_name } = req.query;
    
    console.log('=== 실제 DB 강제 사용 모드 ===');
    console.log('작업 목록 조회 API 호출');
    console.log('필터 파라미터:', { package_type, line_id, line_name });
    
    // 강제로 실제 DB만 사용하도록 설정
    const workList = await packageService.getWorkList(package_type, line_id, line_name);
    
    console.log(`실제 DB 작업 목록 조회 성공: ${workList.length}건`);
    
    // 실제 DB 데이터인지 확인
    const isRealData = workList.length > 0 && workList[0].work_id && Number.isInteger(workList[0].work_id);
    
    if (!isRealData && workList.length > 0) {
      console.warn('WARNING: Mock 데이터가 반환되었습니다. 실제 DB 연결을 확인하세요.');
    }
    
    // 메타데이터 생성
    const metadata = generateWorkListMetadata(workList, { package_type, line_id, line_name });
    metadata.data_source = isRealData ? 'real_database' : 'mock_fallback';
    metadata.warning = !isRealData ? 'Mock 데이터 사용 중 - DB 연결 확인 필요' : null;
    
    res.json({
      success: true,
      message: isRealData ? '실제 DB 작업 목록 조회 성공' : 'Mock 데이터로 대체됨 - DB 연결 확인 필요',
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
    res.status(500).json({
      success: false,
      message: '실제 DB 작업 목록 조회 실패',
      error: err.message,
      data: [],
      metadata: {
        error_type: err.name || 'UnknownError',
        error_details: err.message,
        sql_error: err.message.includes('sql') || err.message.includes('SQL') || err.message.includes('query')
      },
      timestamp: new Date().toISOString()
    });
  }
});

// 작업 상세 조회 (실제 DB만 사용)
router.get('/works/:workNo', async (req, res) => {
  try {
    const { workNo } = req.params;
    
    console.log(`실제 DB 작업 상세 조회: ${workNo}`);
    
    const workDetail = await packageService.getWorkDetail(workNo);
    
    if (!workDetail) {
      console.log(`작업번호 ${workNo}를 실제 DB에서 찾을 수 없습니다.`);
      return res.status(404).json({
        success: false,
        message: `작업번호 ${workNo}를 실제 DB에서 찾을 수 없습니다.`,
        error: '해당 작업번호가 데이터베이스에 존재하지 않습니다.',
        data: null,
        timestamp: new Date().toISOString()
      });
    }
    
    // 실제 DB 데이터인지 확인
    const isRealData = workDetail.work_id && Number.isInteger(workDetail.work_id);
    
    console.log(`작업 상세 조회 성공: ${workNo} (실제 DB: ${isRealData})`);
    
    res.json({
      success: true,
      message: `작업번호 ${workNo} 실제 DB 상세 조회 성공`,
      data: workDetail,
      metadata: {
        work_no: workNo,
        data_source: isRealData ? 'real_database' : 'mock_fallback',
        is_real_data: isRealData,
        warning: !isRealData ? 'Mock 데이터 사용 중 - DB 연결 확인 필요' : null,
        processed_at: new Date().toISOString()
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error(`작업 상세 조회 실패 (${req.params.workNo}):`, err);
    res.status(500).json({
      success: false,
      message: `작업번호 ${req.params.workNo} 실제 DB 상세 조회 실패`,
      error: err.message,
      data: null,
      timestamp: new Date().toISOString()
    });
  }
});

// ==============================================
// DB 연결 및 구조 확인 API
// ==============================================

// 데이터베이스 연결 테스트
router.get('/debug/connection-test', async (req, res) => {
  try {
    console.log('실제 DB 연결 테스트 시작');
    
    // 기본 연결 테스트
    const connectionTest = await packageService.executeRawQuery('SELECT 1 as test_value');
    
    // 스키마 확인
    const schemaTest = await packageService.executeRawQuery('SELECT DATABASE() as current_db');
    
    // package_work 테이블 확인
    const tableTest = await packageService.executeRawQuery(`
      SELECT COUNT(*) as table_count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'tablets' AND TABLE_NAME = 'package_work'
    `);
    
    // 실제 데이터 개수 확인
    const dataTest = await packageService.executeRawQuery(`
      SELECT COUNT(*) as data_count 
      FROM tablets.package_work
    `);
    
    res.json({
      success: true,
      message: '실제 DB 연결 테스트 성공',
      data: {
        connection_status: 'OK',
        test_query_result: connectionTest[0].test_value,
        current_database: schemaTest[0].current_db,
        package_work_table_exists: tableTest[0].table_count > 0,
        package_work_data_count: dataTest[0].data_count,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (err) {
    console.error('실제 DB 연결 테스트 실패:', err);
    res.status(500).json({
      success: false,
      message: '실제 DB 연결 테스트 실패',
      error: err.message,
      data: null
    });
  }
});

// 테이블 구조 확인
router.get('/debug/table-structure', async (req, res) => {
  try {
    console.log('실제 DB 테이블 구조 확인 API 호출');
    
    const result = await packageService.debugTableStructure();
    
    res.json({
      success: result.success,
      message: result.success ? '실제 DB 테이블 구조 확인 완료' : '실제 DB 테이블 구조 확인 실패',
      data: result.data,
      error: result.error || null,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('테이블 구조 확인 실패:', err);
    res.status(500).json({
      success: false,
      message: '실제 DB 테이블 구조 확인 중 오류 발생',
      error: err.message,
      data: null,
      timestamp: new Date().toISOString()
    });
  }
});

// 데이터 접근 테스트
router.get('/debug/data-access-test', async (req, res) => {
  try {
    console.log('실제 DB 데이터 접근 테스트 API 호출');
    
    const result = await packageService.testDataAccess();
    
    res.json({
      success: result.success,
      message: result.success ? '실제 DB 데이터 접근 테스트 완료' : '실제 DB 데이터 접근 테스트 실패',
      data: result.data,
      error: result.error || null,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('데이터 접근 테스트 실패:', err);
    res.status(500).json({
      success: false,
      message: '실제 DB 데이터 접근 테스트 중 오류 발생',
      error: err.message,
      data: null,
      timestamp: new Date().toISOString()
    });
  }
});

// 실제 테이블 데이터 강제 조회 (디버깅용)
router.get('/debug/force-real-data', async (req, res) => {
  try {
    console.log('실제 DB 데이터 강제 조회');
    
    // 직접 SQL로 package_work 테이블 조회
    const realData = await packageService.executeRawQuery(`
      SELECT 
        work_id,
        work_order_no,
        line_id,
        step_name,
        step_status,
        input_qty,
        output_qty,
        employee_name,
        product_name,
        reg_date
      FROM tablets.package_work 
      ORDER BY reg_date DESC 
      LIMIT 10
    `);
    
    console.log(`실제 DB 강제 조회 결과: ${realData.length}건`);
    
    res.json({
      success: true,
      message: '실제 DB 데이터 강제 조회 성공',
      data: {
        real_data: realData,
        count: realData.length,
        is_direct_query: true,
        table_name: 'tablets.package_work'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('실제 DB 데이터 강제 조회 실패:', err);
    res.status(500).json({
      success: false,
      message: '실제 DB 데이터 강제 조회 실패',
      error: err.message,
      data: null
    });
  }
});

// ==============================================
// 필터링 및 매핑 테스트
// ==============================================

// 데이터 매핑 테스트
router.get('/debug/data-mapping-test', async (req, res) => {
  try {
    console.log('실제 DB 데이터 매핑 테스트 실행');
    
    // 원시 데이터 샘플 조회
    const sampleQuery = `SELECT * FROM tablets.package_work LIMIT 5`;
    const rawSample = await packageService.executeRawQuery(sampleQuery);
    
    if (rawSample.length === 0) {
      return res.json({
        success: false,
        message: 'package_work 테이블에 실제 데이터가 없습니다.',
        data: null
      });
    }
    
    // 매핑 함수 테스트
    const mappingResults = rawSample.map((row, index) => {
      return {
        row_index: index + 1,
        original_data: row,
        mapped_data: {
          work_order_no: row.work_order_no,
          final_product_name: row.product_name?.includes('BJA') ? '타이레놀정500mg' : 
                              row.product_name?.includes('GB') ? '게보린정' : 
                              row.product_name || '제품명없음',
          package_type: row.step_name?.includes('내포장') || row.step_name?.includes('1차') ? 'INNER' : 'OUTER',
          line_name: row.line_id?.includes('A') ? 'A라인' : 
                     row.line_id?.includes('B') ? 'B라인' : 'Unknown',
          progress_rate: row.input_qty > 0 ? Math.round((row.output_qty / row.input_qty) * 100) : 0,
          work_no: row.work_id
        }
      };
    });
    
    console.log(`실제 DB 데이터 매핑 테스트 완료: ${mappingResults.length}건`);
    
    res.json({
      success: true,
      message: '실제 DB 데이터 매핑 테스트 완료',
      data: {
        total_sample_count: rawSample.length,
        mapping_results: mappingResults,
        summary: {
          has_work_order: mappingResults.filter(r => r.mapped_data.work_order_no).length,
          has_product_name: mappingResults.filter(r => r.mapped_data.final_product_name !== '제품명없음').length,
          inner_package_count: mappingResults.filter(r => r.mapped_data.package_type === 'INNER').length,
          outer_package_count: mappingResults.filter(r => r.mapped_data.package_type === 'OUTER').length
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('실제 DB 데이터 매핑 테스트 실패:', err);
    res.status(500).json({
      success: false,
      message: '실제 DB 데이터 매핑 테스트 실패',
      error: err.message,
      data: null
    });
  }
});

// 필터링 테스트 API
router.get('/debug/filter-test', async (req, res) => {
  try {
    const { test_package_type, test_line_id, test_line_name } = req.query;
    
    console.log('실제 DB 필터링 테스트 실행');
    console.log('테스트 필터:', { test_package_type, test_line_id, test_line_name });
    
    // 전체 데이터 조회
    const allWorks = await packageService.getWorkList();
    console.log(`전체 작업 수: ${allWorks.length}`);
    
    const filterTests = [];
    
    // 패키지 타입 필터 테스트
    if (test_package_type) {
      const filtered = await packageService.getWorkList(test_package_type);
      filterTests.push({
        filter_type: 'package_type',
        filter_value: test_package_type,
        original_count: allWorks.length,
        filtered_count: filtered.length,
        sample_results: filtered.slice(0, 3)
      });
    }
    
    // 라인 ID 필터 테스트
    if (test_line_id) {
      const filtered = await packageService.getWorkList(null, test_line_id);
      filterTests.push({
        filter_type: 'line_id',
        filter_value: test_line_id,
        original_count: allWorks.length,
        filtered_count: filtered.length,
        sample_results: filtered.slice(0, 3)
      });
    }
    
    // 라인명 필터 테스트
    if (test_line_name) {
      const filtered = await packageService.getWorkList(null, null, test_line_name);
      filterTests.push({
        filter_type: 'line_name',
        filter_value: test_line_name,
        original_count: allWorks.length,
        filtered_count: filtered.length,
        sample_results: filtered.slice(0, 3)
      });
    }
    
    res.json({
      success: true,
      message: '실제 DB 필터링 테스트 완료',
      data: {
        original_data_count: allWorks.length,
        filter_tests: filterTests,
        data_source: 'real_database'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('실제 DB 필터링 테스트 실패:', err);
    res.status(500).json({
      success: false,
      message: '실제 DB 필터링 테스트 실패',
      error: err.message,
      data: null
    });
  }
});

// ==============================================
// 원시 SQL 실행 (안전한 SELECT만)
// ==============================================

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
    
    // 안전성 검사 - SELECT만 허용
    const lowerQuery = query.toLowerCase().trim();
    if (!lowerQuery.startsWith('select')) {
      return res.status(400).json({
        success: false,
        message: 'SELECT 쿼리만 허용됩니다.',
        data: null
      });
    }
    
    console.log(`실제 DB 원시 SQL 실행: ${description || 'No description'}`);
    console.log(`쿼리: ${query}`);
    
    const result = await packageService.executeRawQuery(query);
    
    console.log(`실제 DB 원시 SQL 실행 성공: ${result.length}건`);
    
    res.json({
      success: true,
      message: '실제 DB 원시 SQL 실행 성공',
      data: {
        description: description || 'No description',
        query: query,
        result_count: Array.isArray(result) ? result.length : 1,
        result: result,
        sample_result: Array.isArray(result) && result.length > 0 ? result[0] : result,
        data_source: 'real_database'
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('실제 DB 원시 SQL 실행 실패:', err);
    res.status(500).json({
      success: false,
      message: '실제 DB 원시 SQL 실행 실패',
      error: err.message,
      data: null,
      timestamp: new Date().toISOString()
    });
  }
});

// ==============================================
// 메타데이터 생성 함수
// ==============================================

const generateWorkListMetadata = (workList, filters) => {
  if (!Array.isArray(workList) || workList.length === 0) {
    return {
      total_works: 0,
      filters_applied: filters,
      data_quality: {
        with_work_no: 0,
        with_product_name: 0,
        with_line_info: 0,
        with_status: 0
      },
      status_breakdown: {},
      package_type_breakdown: {},
      line_breakdown: {}
    };
  }

  // 상태별 분류
  const statusBreakdown = {};
  workList.forEach(work => {
    const status = work.step_status || '상태없음';
    statusBreakdown[status] = (statusBreakdown[status] || 0) + 1;
  });

  // 패키지 타입별 분류
  const packageTypeBreakdown = {};
  workList.forEach(work => {
    const packageType = work.package_type || '타입없음';
    packageTypeBreakdown[packageType] = (packageTypeBreakdown[packageType] || 0) + 1;
  });

  // 라인별 분류
  const lineBreakdown = {};
  workList.forEach(work => {
    const lineName = work.line_name || '라인없음';
    lineBreakdown[lineName] = (lineBreakdown[lineName] || 0) + 1;
  });

  // 데이터 품질 체크
  const dataQuality = {
    with_work_no: workList.filter(w => w.work_no && w.work_no !== null).length,
    with_product_name: workList.filter(w => w.product_name && w.product_name !== null && w.product_name !== '').length,
    with_line_info: workList.filter(w => w.line_id || w.line_name).length,
    with_status: workList.filter(w => w.step_status && w.step_status !== null).length,
    with_quantities: workList.filter(w => (w.input_qty > 0) || (w.output_qty > 0)).length
  };

  return {
    total_works: workList.length,
    filters_applied: filters,
    data_quality: dataQuality,
    status_breakdown: statusBreakdown,
    package_type_breakdown: packageTypeBreakdown,
    line_breakdown: lineBreakdown,
    sample_work: workList.length > 0 ? {
      work_no: workList[0].work_no,
      step_name: workList[0].step_name,
      step_status: workList[0].step_status,
      line_name: workList[0].line_name,
      package_type: workList[0].package_type,
      data_source: 'real_database'
    } : null
  };
};

module.exports = router;