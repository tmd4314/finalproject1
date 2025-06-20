// routers/packageRouter.js (SQL 오류 해결 버전)
const express = require('express');
const router = express.Router();
const packageService = require('../services/packageService');

// 헬스체크
router.get('/health', (req, res) => {
  res.json({ 
    success: true, 
    message: 'Package API is running (Fixed SQL Error)',
    timestamp: new Date().toISOString()
  });
});

// ==============================================
// 디버깅 및 테이블 구조 확인 API (안전한 버전)
// ==============================================

// 테이블 구조 확인
router.get('/debug/table-structure', async (req, res) => {
  try {
    console.log('테이블 구조 확인 API 호출');
    
    const result = await packageService.debugTableStructure();
    
    res.json({
      success: result.success,
      message: result.success ? '테이블 구조 확인 완료' : '테이블 구조 확인 실패',
      data: result.data,
      error: result.error || null,
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

// 데이터 접근 테스트
router.get('/debug/data-access-test', async (req, res) => {
  try {
    console.log('데이터 접근 테스트 API 호출');
    
    const result = await packageService.testDataAccess();
    
    res.json({
      success: result.success,
      message: result.success ? '데이터 접근 테스트 완료' : '데이터 접근 테스트 실패',
      data: result.data,
      error: result.error || null,
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('데이터 접근 테스트 실패:', err);
    res.status(500).json({
      success: false,
      message: '데이터 접근 테스트 중 오류 발생',
      error: err.message,
      data: null,
      timestamp: new Date().toISOString()
    });
  }
});

// 원시 SQL 직접 실행 (디버깅용) - 안전한 버전
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
    
    // 안전성 검사
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
    
    console.log(`원시 SQL 실행 성공: ${result.length}건`);
    
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

// ==============================================
// 실제 데이터 기반 작업 목록 조회 (안전한 버전)
// ==============================================

// 작업 목록 조회 (실제 데이터)
router.get('/works', async (req, res) => {
  try {
    const { package_type, line_id, line_name } = req.query;
    
    console.log('실제 데이터 기반 작업 목록 조회 API 호출');
    console.log('필터 파라미터:', { package_type, line_id, line_name });
    
    const workList = await packageService.getWorkList(package_type, line_id, line_name);
    
    console.log(`작업 목록 조회 성공: ${workList.length}건`);
    
    // 메타데이터 생성
    const metadata = generateWorkListMetadata(workList, { package_type, line_id, line_name });
    
    res.json({
      success: true,
      message: '실제 데이터 기반 작업 목록 조회 성공',
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
      message: '작업 목록 조회 실패',
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

// 작업 상세 조회 (실제 데이터)
router.get('/works/:workNo', async (req, res) => {
  try {
    const { workNo } = req.params;
    
    console.log(`실제 데이터 기반 작업 상세 조회: ${workNo}`);
    
    const workDetail = await packageService.getWorkDetail(workNo);
    
    if (!workDetail) {
      console.log(`작업번호 ${workNo}를 찾을 수 없습니다.`);
      return res.status(404).json({
        success: false,
        message: `작업번호 ${workNo}를 찾을 수 없습니다.`,
        error: '해당 작업번호가 데이터베이스에 존재하지 않습니다.',
        data: null,
        timestamp: new Date().toISOString()
      });
    }
    
    console.log(`작업 상세 조회 성공: ${workNo}`);
    
    res.json({
      success: true,
      message: `작업번호 ${workNo} 상세 조회 성공`,
      data: workDetail,
      metadata: {
        work_no: workNo,
        data_source: 'real_database',
        original_keys: workDetail._original_keys || [],
        processed_at: workDetail._processed_at || new Date().toISOString()
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
// 테이블 정보 조회 API (안전한 버전)
// ==============================================

// 모든 테이블 목록 조회
router.get('/debug/tables', async (req, res) => {
  try {
    console.log('데이터베이스 테이블 목록 조회');
    
    const tablesQuery = `
      SELECT TABLE_NAME, TABLE_ROWS, CREATE_TIME, UPDATE_TIME
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'tablets'
      ORDER BY TABLE_NAME
    `;
    
    const tables = await packageService.executeRawQuery(tablesQuery);
    
    console.log(`테이블 ${tables.length}개 발견`);
    
    res.json({
      success: true,
      message: '테이블 목록 조회 성공',
      data: {
        schema: 'tablets',
        table_count: tables.length,
        tables: tables,
        package_work_exists: tables.some(t => t.TABLE_NAME === 'package_work')
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('테이블 목록 조회 실패:', err);
    res.status(500).json({
      success: false,
      message: '테이블 목록 조회 실패',
      error: err.message,
      data: null
    });
  }
});

// 특정 테이블 상세 정보 조회
router.get('/debug/table/:tableName', async (req, res) => {
  try {
    const { tableName } = req.params;
    console.log(`테이블 상세 정보 조회: ${tableName}`);
    
    // 테이블명 안전성 검사
    if (!/^[a-zA-Z_][a-zA-Z0-9_]*$/.test(tableName)) {
      return res.status(400).json({
        success: false,
        message: '유효하지 않은 테이블명입니다.',
        data: null
      });
    }
    
    // 컬럼 정보 조회
    const columnsQuery = `
      SELECT 
        COLUMN_NAME, 
        DATA_TYPE, 
        IS_NULLABLE, 
        COLUMN_DEFAULT,
        EXTRA,
        ORDINAL_POSITION
      FROM INFORMATION_SCHEMA.COLUMNS 
      WHERE TABLE_SCHEMA = 'tablets' AND TABLE_NAME = ?
      ORDER BY ORDINAL_POSITION
    `;
    
    const columns = await packageService.executeRawQuery(columnsQuery, [tableName]);
    
    if (columns.length === 0) {
      return res.status(404).json({
        success: false,
        message: `테이블 '${tableName}'을 찾을 수 없습니다.`,
        data: null
      });
    }
    
    // 샘플 데이터 조회 (안전하게)
    let sampleData = [];
    let rowCount = 0;
    
    try {
      const sampleQuery = `SELECT * FROM tablets.\`${tableName}\` LIMIT 3`;
      sampleData = await packageService.executeRawQuery(sampleQuery);
      
      const countQuery = `SELECT COUNT(*) as total FROM tablets.\`${tableName}\``;
      const countResult = await packageService.executeRawQuery(countQuery);
      rowCount = countResult[0].total;
      
    } catch (dataError) {
      console.warn('샘플 데이터/행 수 조회 실패:', dataError.message);
    }
    
    res.json({
      success: true,
      message: `테이블 '${tableName}' 상세 정보 조회 성공`,
      data: {
        table_name: tableName,
        column_count: columns.length,
        row_count: rowCount,
        columns: columns,
        sample_data: sampleData,
        sample_count: sampleData.length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error(`테이블 상세 정보 조회 실패 (${req.params.tableName}):`, err);
    res.status(500).json({
      success: false,
      message: `테이블 '${req.params.tableName}' 상세 정보 조회 실패`,
      error: err.message,
      data: null
    });
  }
});

// ==============================================
// 실제 데이터 검증 API (안전한 버전)
// ==============================================

// 데이터 검증 및 매핑 테스트
router.get('/debug/data-mapping-test', async (req, res) => {
  try {
    console.log('데이터 매핑 테스트 실행');
    
    // 원시 데이터 샘플 조회
    const sampleQuery = `SELECT * FROM tablets.package_work LIMIT 5`;
    const rawSample = await packageService.executeRawQuery(sampleQuery);
    
    if (rawSample.length === 0) {
      return res.json({
        success: false,
        message: 'package_work 테이블에 데이터가 없습니다.',
        data: null
      });
    }
    
    // 데이터 매핑 테스트
    const mappingResults = rawSample.map((row, index) => {
      return {
        row_index: index + 1,
        original_keys: Object.keys(row),
        extracted_values: {
          work_no: packageService.extractWorkNo(row),
          work_order_no: packageService.extractWorkOrderNo(row),
          line_id: packageService.extractLineId(row),
          step_name: packageService.extractStepName(row),
          step_status: packageService.extractStepStatus(row),
          input_qty: packageService.extractInputQty(row),
          output_qty: packageService.extractOutputQty(row),
          employee_name: packageService.extractEmployeeName(row),
          product_name: packageService.extractProductName(row)
        },
        business_logic: {
          package_type: packageService.determinePackageType({
            step_name: packageService.extractStepName(row),
            line_id: packageService.extractLineId(row)
          }),
          line_name: packageService.extractLineName({
            line_id: packageService.extractLineId(row),
            step_name: packageService.extractStepName(row)
          }),
          progress_rate: packageService.calculateProgressRate({
            input_qty: packageService.extractInputQty(row),
            output_qty: packageService.extractOutputQty(row)
          })
        },
        raw_sample: row
      };
    });
    
    console.log(`데이터 매핑 테스트 완료: ${mappingResults.length}건`);
    
    res.json({
      success: true,
      message: '데이터 매핑 테스트 완료',
      data: {
        total_sample_count: rawSample.length,
        mapping_results: mappingResults,
        summary: {
          successful_mappings: mappingResults.filter(r => r.extracted_values.work_no).length,
          with_line_info: mappingResults.filter(r => r.extracted_values.line_id).length,
          with_product_info: mappingResults.filter(r => r.extracted_values.product_name).length,
          with_status_info: mappingResults.filter(r => r.extracted_values.step_status).length
        }
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('데이터 매핑 테스트 실패:', err);
    res.status(500).json({
      success: false,
      message: '데이터 매핑 테스트 실패',
      error: err.message,
      data: null
    });
  }
});

// 필터링 테스트 API
router.get('/debug/filter-test', async (req, res) => {
  try {
    const { test_package_type, test_line_id, test_line_name } = req.query;
    
    console.log('필터링 테스트 실행');
    console.log('테스트 필터:', { test_package_type, test_line_id, test_line_name });
    
    // 전체 데이터 조회
    const allWorks = await packageService.getWorkList();
    console.log(`전체 작업 수: ${allWorks.length}`);
    
    // 각 필터별 테스트
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
    
    // 복합 필터 테스트
    if (test_package_type || test_line_id || test_line_name) {
      const complexFiltered = await packageService.getWorkList(
        test_package_type,
        test_line_id,
        test_line_name
      );
      filterTests.push({
        filter_type: 'complex',
        filter_value: { test_package_type, test_line_id, test_line_name },
        original_count: allWorks.length,
        filtered_count: complexFiltered.length,
        sample_results: complexFiltered.slice(0, 3)
      });
    }
    
    res.json({
      success: true,
      message: '필터링 테스트 완료',
      data: {
        original_data_count: allWorks.length,
        filter_tests: filterTests,
        available_package_types: [...new Set(allWorks.map(w => w.package_type))],
        available_line_ids: [...new Set(allWorks.map(w => w.line_id).filter(Boolean))],
        available_line_names: [...new Set(allWorks.map(w => w.line_name).filter(Boolean))]
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (err) {
    console.error('필터링 테스트 실패:', err);
    res.status(500).json({
      success: false,
      message: '필터링 테스트 실패',
      error: err.message,
      data: null
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
      original_keys: workList[0]._original_keys || Object.keys(workList[0])
    } : null
  };
};

// ==============================================
// 데이터베이스 연결 테스트
// ==============================================

router.get('/debug/connection-test', async (req, res) => {
  try {
    console.log('데이터베이스 연결 테스트 시작');
    
    // 기본 연결 테스트
    const connectionTest = await packageService.executeRawQuery('SELECT 1 as test_value');
    
    // 스키마 확인
    const schemaTest = await packageService.executeRawQuery('SELECT DATABASE() as current_db');
    
    // 테이블 확인
    const tableTest = await packageService.executeRawQuery(`
      SELECT COUNT(*) as table_count 
      FROM INFORMATION_SCHEMA.TABLES 
      WHERE TABLE_SCHEMA = 'tablets'
    `);
    
    res.json({
      success: true,
      message: '데이터베이스 연결 테스트 성공',
      data: {
        connection_status: 'OK',
        test_query_result: connectionTest[0].test_value,
        current_database: schemaTest[0].current_db,
        tablets_table_count: tableTest[0].table_count,
        timestamp: new Date().toISOString()
      }
    });
    
  } catch (err) {
    console.error('데이터베이스 연결 테스트 실패:', err);
    res.status(500).json({
      success: false,
      message: '데이터베이스 연결 테스트 실패',
      error: err.message,
      data: null
    });
  }
});

module.exports = router;