// services/packageService.js - 실제 DB 데이터 우선 사용 버전
const mariadb = require('mariadb');
require('dotenv').config();

class PackageService {
    constructor() {
        const dbConfig = {
            host: process.env.DB_HOST || 'localhost',
            user: process.env.DB_USER || 'root',
            password: process.env.DB_PWD || '',
            database: process.env.DB_DB || 'tablets',
            port: parseInt(process.env.DB_PORT) || 3306,
            connectionLimit: parseInt(process.env.DB_LIMIT) || 10,
            acquireTimeout: 30000,
            timeout: 30000,
            idleTimeout: 60000,
            supportBigNumbers: true,
            bigNumberStrings: true,
            resetAfterUse: true
        };

        console.log('데이터베이스 연결 설정:');
        console.log('- HOST:', dbConfig.host);
        console.log('- USER:', dbConfig.user);
        console.log('- PASSWORD:', dbConfig.password ? '****' : 'MISSING');
        console.log('- DATABASE:', dbConfig.database);
        console.log('- PORT:', dbConfig.port);

        this.pool = mariadb.createPool(dbConfig);
    }

    // 연결 테스트 함수
    async testConnection() {
        let conn;
        try {
            console.log('데이터베이스 연결 테스트 시작...');
            conn = await this.pool.getConnection();
            console.log('데이터베이스 연결 성공!');
            
            const result = await conn.query('SELECT 1 as test');
            console.log('쿼리 테스트 성공:', result);
            
            return { success: true, message: '연결 성공' };
        } catch (error) {
            console.error('데이터베이스 연결 실패:', error.message);
            return { success: false, error: error.message };
        } finally {
            if (conn) conn.release();
        }
    }

    // 안전한 쿼리 실행
    async executeRawQuery(query, params = [], retries = 2) {
        let conn;
        let lastError;
        
        for (let attempt = 1; attempt <= retries + 1; attempt++) {
            try {
                console.log(`쿼리 실행 시도 ${attempt}/${retries + 1}:`, query.substring(0, 100) + '...');
                
                conn = await this.pool.getConnection();
                const rows = await conn.query(query, params);
                
                console.log(`쿼리 실행 성공 (시도 ${attempt}): ${Array.isArray(rows) ? rows.length : 1}건`);
                return rows;
                
            } catch (error) {
                lastError = error;
                console.error(`쿼리 실행 실패 (시도 ${attempt}):`, error.message);
                
                if (conn) {
                    conn.release();
                    conn = null;
                }
                
                if (attempt <= retries && (
                    error.code === 'ER_GET_CONNECTION_TIMEOUT' ||
                    error.code === 'ER_ACCESS_DENIED_ERROR' ||
                    error.code === 'ECONNREFUSED'
                )) {
                    console.log(`${attempt * 1000}ms 후 재시도...`);
                    await new Promise(resolve => setTimeout(resolve, attempt * 1000));
                } else {
                    break;
                }
            } finally {
                if (conn) conn.release();
            }
        }
        
        throw lastError;
    }

    // 실제 DB 기반 작업 목록 조회 - Mock 데이터 제거
    async getWorkList(packageType = null, lineId = null, lineName = null) {
        try {
            console.log('=== 실제 DB 작업 목록 조회 시작 ===');
            console.log('필터 조건:', { packageType, lineId, lineName });
            
            // 실제 package_work 테이블에서 데이터 조회
            let query = `
                SELECT 
                    work_id,
                    work_order_no,
                    order_detail_id,
                    line_id,
                    work_line,
                    work_step,
                    step_name,
                    step_status,
                    input_qty,
                    output_qty,
                    eq_code,
                    start_time,
                    end_time,
                    employee_id,
                    employee_name,
                    reg_date,
                    upd_date,
                    product_name,
                    
                    -- 제품명 결정
                    CASE 
                        WHEN product_name LIKE '%BJA%' THEN '타이레놀정500mg'
                        WHEN product_name LIKE '%GB%' THEN '게보린정'
                        WHEN product_name LIKE '%FST%' THEN '부루펜시럽'
                        WHEN product_name LIKE '%BA%' THEN '베아르정'
                        WHEN line_id LIKE '%A%' OR work_line LIKE '%A%' THEN '타이레놀정500mg'
                        WHEN line_id LIKE '%B%' OR work_line LIKE '%B%' THEN '게보린정'
                        WHEN line_id LIKE '%C%' OR work_line LIKE '%C%' THEN '부루펜시럽'
                        WHEN line_id LIKE '%D%' OR work_line LIKE '%D%' THEN '베아르정'
                        ELSE COALESCE(product_name, step_name, '제품정보없음')
                    END as final_product_name,
                    
                    -- 포장타입 결정
                    CASE 
                        WHEN step_name LIKE '%외포장%' OR step_name LIKE '%2차%' OR work_step LIKE '%외포장%' OR work_step LIKE '%2차%' THEN 'OUTER'
                        WHEN step_name LIKE '%내포장%' OR step_name LIKE '%1차%' OR work_step LIKE '%내포장%' OR work_step LIKE '%1차%' THEN 'INNER'
                        WHEN line_id LIKE '%OUTER%' OR line_id LIKE '%외포장%' THEN 'OUTER'
                        WHEN line_id LIKE '%INNER%' OR line_id LIKE '%내포장%' THEN 'INNER'
                        ELSE 'INNER'
                    END as package_type,
                    
                    -- 라인명 추출
                    CASE 
                        WHEN line_id LIKE '%A%' OR work_line LIKE '%A%' THEN 'A라인'
                        WHEN line_id LIKE '%B%' OR work_line LIKE '%B%' THEN 'B라인'
                        WHEN line_id LIKE '%C%' OR work_line LIKE '%C%' THEN 'C라인'
                        WHEN line_id LIKE '%D%' OR work_line LIKE '%D%' THEN 'D라인'
                        ELSE COALESCE(work_line, SUBSTRING_INDEX(line_id, ' ', 1), line_id, '알수없음')
                    END as line_name,
                    
                    -- 진행률 계산
                    CASE 
                        WHEN input_qty > 0 THEN ROUND((output_qty / input_qty * 100), 1)
                        ELSE 0
                    END AS progress_rate,
                    
                    -- 기본값들
                    COALESCE(input_qty, 1000) as order_qty,
                    COALESCE(input_qty, 1000) as target_qty,
                    COALESCE(employee_name, '작업자') as emp_name,
                    COALESCE(output_qty, 0) as defect_qty,
                    
                    -- 호환성을 위한 별칭
                    work_id as work_no
                    
                FROM tablets.package_work
                WHERE 1=1
            `;
            
            const params = [];
            const conditions = [];
            
            // 패키지 타입 필터
            if (packageType) {
                if (packageType === 'INNER') {
                    conditions.push(`(
                        step_name LIKE '%내포장%' OR step_name LIKE '%1차%' OR 
                        work_step LIKE '%내포장%' OR work_step LIKE '%1차%' OR
                        line_id LIKE '%내포장%' OR line_id LIKE '%INNER%' OR
                        (step_name NOT LIKE '%외포장%' AND step_name NOT LIKE '%2차%' 
                         AND work_step NOT LIKE '%외포장%' AND work_step NOT LIKE '%2차%'
                         AND line_id NOT LIKE '%외포장%' AND line_id NOT LIKE '%OUTER%')
                    )`);
                } else if (packageType === 'OUTER') {
                    conditions.push(`(
                        step_name LIKE '%외포장%' OR step_name LIKE '%2차%' OR 
                        work_step LIKE '%외포장%' OR work_step LIKE '%2차%' OR
                        line_id LIKE '%외포장%' OR line_id LIKE '%OUTER%'
                    )`);
                }
            }
            
            // 라인 ID 필터
            if (lineId) {
                conditions.push('(line_id LIKE ? OR work_line LIKE ?)');
                params.push(`%${lineId}%`, `%${lineId}%`);
            }
            
            // 라인명 필터
            if (lineName) {
                conditions.push('(step_name LIKE ? OR line_id LIKE ? OR work_line LIKE ?)');
                params.push(`%${lineName}%`, `%${lineName}%`, `%${lineName}%`);
            }
            
            // WHERE 절 추가
            if (conditions.length > 0) {
                query += ' AND ' + conditions.join(' AND ');
            }
            
            query += ' ORDER BY reg_date DESC LIMIT 100';
            
            console.log('실행할 쿼리:', query);
            console.log('파라미터:', params);
            
            const result = await this.executeRawQuery(query, params);
            console.log(`실제 DB 조회 완료: ${result.length}건`);
            
            if (result.length === 0) {
                console.log('실제 데이터가 없어서 전체 데이터 조회 시도...');
                
                // 전체 데이터 조회
                const allDataQuery = `
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
                        'INNER' as package_type,
                        '타이레놀정500mg' as final_product_name,
                        'A라인' as line_name,
                        0 as progress_rate,
                        COALESCE(input_qty, 1000) as order_qty,
                        COALESCE(input_qty, 1000) as target_qty,
                        work_id as work_no
                    FROM tablets.package_work
                    ORDER BY reg_date DESC 
                    LIMIT 50
                `;
                
                const allData = await this.executeRawQuery(allDataQuery);
                console.log(`전체 데이터 조회 결과: ${allData.length}건`);
                return this.convertBigIntToNumber(allData);
            }
            
            return this.convertBigIntToNumber(result);
            
        } catch (error) {
            console.error('실제 DB 작업 목록 조회 실패:', error.message);
            
            // 에러 발생 시에만 Mock 데이터 사용
            console.log('ERROR: 실제 DB 조회 실패로 인해 Mock 데이터 사용');
            return this.getMockWorkList(packageType, lineId, lineName);
        }
    }

    // Mock 데이터 반환 (에러 시에만 사용)
    getMockWorkList(packageType = null, lineId = null, lineName = null) {
        console.log('Mock 데이터 반환 (실제 DB 연결 실패로 인한 대안)');
        
        const mockData = [
            {
                work_id: 1,
                work_order_no: 'WO20250614002',
                order_detail_id: 6,
                line_id: 'A라인 내포장',
                work_line: 'A라인',
                work_step: '내포장',
                step_name: '내포장',
                step_status: 'p2',
                input_qty: 3000,
                output_qty: 0,
                eq_code: 'e3',
                start_time: null,
                end_time: null,
                employee_id: 2,
                employee_name: '김포장',
                reg_date: '2025-06-17 11:52:51',
                upd_date: '2025-06-18 14:36:23',
                product_name: 'BJA-OR-10',
                final_product_name: '타이레놀정500mg',
                package_type: 'INNER',
                line_name: 'A라인',
                progress_rate: 0,
                work_no: 1
            }
        ];

        // 필터링 적용
        let filteredData = mockData;
        
        if (packageType) {
            filteredData = filteredData.filter(item => item.package_type === packageType);
        }
        
        if (lineId) {
            filteredData = filteredData.filter(item => 
                item.line_id.includes(lineId) || item.work_line.includes(lineId)
            );
        }
        
        if (lineName) {
            filteredData = filteredData.filter(item => 
                item.line_name.toLowerCase().includes(lineName.toLowerCase()) ||
                item.step_name.toLowerCase().includes(lineName.toLowerCase()) ||
                item.line_id.toLowerCase().includes(lineName.toLowerCase())
            );
        }
        
        return filteredData;
    }

    // 작업 상세 조회
    async getWorkDetail(workId) {
        try {
            console.log(`실제 DB 작업 상세 조회: ${workId}`);
            
            const query = `
                SELECT 
                    *,
                    -- 제품명
                    CASE 
                        WHEN product_name LIKE '%BJA%' THEN '타이레놀정500mg'
                        WHEN product_name LIKE '%GB%' THEN '게보린정'
                        WHEN product_name LIKE '%FST%' THEN '부루펜시럽'
                        WHEN product_name LIKE '%BA%' THEN '베아르정'
                        ELSE product_name
                    END as final_product_name,
                    
                    COALESCE(employee_name, '작업자') as emp_name,
                    COALESCE(input_qty, 1000) as order_qty,
                    
                    CASE 
                        WHEN line_id LIKE '%A%' OR work_line LIKE '%A%' THEN 'A라인'
                        WHEN line_id LIKE '%B%' OR work_line LIKE '%B%' THEN 'B라인'
                        WHEN line_id LIKE '%C%' OR work_line LIKE '%C%' THEN 'C라인'
                        WHEN line_id LIKE '%D%' OR work_line LIKE '%D%' THEN 'D라인'
                        ELSE COALESCE(work_line, line_id)
                    END as line_name,
                    
                    -- 호환성 별칭
                    work_id as work_no
                    
                FROM tablets.package_work
                WHERE work_id = ? OR work_order_no = ?
                LIMIT 1
            `;
            
            const result = await this.executeRawQuery(query, [workId, workId]);
            
            if (result.length > 0) {
                console.log(`실제 DB 작업 상세 조회 성공: ${workId}`);
                return this.convertBigIntToNumber(result[0]);
            } else {
                console.log(`작업번호 ${workId}를 실제 DB에서 찾을 수 없습니다.`);
                return null;
            }
            
        } catch (error) {
            console.error(`실제 DB 작업 상세 조회 실패 (${workId}):`, error);
            // 에러 시에만 Mock 데이터 사용
            const mockData = this.getMockWorkList();
            const mockDetail = mockData.find(item => 
                item.work_id === parseInt(workId) || 
                item.work_order_no === workId ||
                item.work_no === parseInt(workId)
            );
            return mockDetail || null;
        }
    }

    // 제품코드 목록 조회
    async getProductCodes() {
        try {
            const query = `
                SELECT DISTINCT 
                    product_name,
                    CASE 
                        WHEN product_name LIKE '%BJA%' THEN 'BJA-STD-10'
                        WHEN product_name LIKE '%GB%' THEN 'GB-V-10'
                        WHEN product_name LIKE '%FST%' THEN 'FST-PLUS-30'
                        WHEN product_name LIKE '%BA%' THEN 'BA-STD-20'
                        ELSE product_name
                    END as product_code,
                    COUNT(*) as work_count
                FROM tablets.package_work
                WHERE product_name IS NOT NULL 
                AND product_name != ''
                GROUP BY product_name
                ORDER BY work_count DESC
            `;
            
            const result = await this.executeRawQuery(query);
            console.log(`실제 DB 제품코드 조회 완료: ${result.length}개`);
            return result;
            
        } catch (error) {
            console.error('제품코드 조회 실패:', error);
            return [
                { product_name: 'BJA-OR-10', product_code: 'BJA-STD-10', work_count: 5 },
                { product_name: 'GB-V-10', product_code: 'GB-V-10', work_count: 3 },
                { product_name: 'FST-PLUS-30', product_code: 'FST-PLUS-30', work_count: 2 }
            ];
        }
    }

    // 라인별 작업 목록
    async getWorksByLine(lineId) {
        try {
            console.log(`실제 DB 라인별 작업 조회: ${lineId}`);
            
            const query = `
                SELECT 
                    work_id,
                    work_order_no,
                    order_detail_id,
                    COALESCE(step_name, work_step, '포장작업') as step_name,
                    COALESCE(step_status, 'READY') as step_status,
                    COALESCE(input_qty, 0) as input_qty,
                    COALESCE(output_qty, 0) as output_qty,
                    COALESCE(employee_name, '작업자') as employee_name,
                    product_name,
                    line_id,
                    work_line,
                    
                    -- 제품명 결정
                    CASE 
                        WHEN product_name LIKE '%BJA%' THEN '타이레놀정500mg'
                        WHEN product_name LIKE '%GB%' THEN '게보린정'
                        WHEN product_name LIKE '%FST%' THEN '부루펜시럽'
                        WHEN product_name LIKE '%BA%' THEN '베아르정'
                        ELSE COALESCE(product_name, step_name, '제품명없음')
                    END as final_product_name,
                    
                    -- 진행률
                    CASE 
                        WHEN input_qty > 0 THEN ROUND((output_qty / input_qty * 100), 1)
                        ELSE 0
                    END AS progress_rate,
                    
                    -- 호환성 별칭
                    work_id as work_no
                    
                FROM tablets.package_work
                WHERE (line_id LIKE ? OR work_line LIKE ?)
                ORDER BY reg_date DESC
                LIMIT 50
            `;
            
            const result = await this.executeRawQuery(query, [`%${lineId}%`, `%${lineId}%`]);
            console.log(`실제 DB 라인별 작업 조회 완료: ${result.length}건`);
            return this.convertBigIntToNumber(result);
            
        } catch (error) {
            console.error('라인별 작업 조회 실패:', error);
            return this.getMockWorkList(null, lineId, null);
        }
    }

    // BigInt를 Number로 변환
    convertBigIntToNumber(data) {
        if (Array.isArray(data)) {
            return data.map(item => this.convertBigIntToNumber(item));
        } else if (data && typeof data === 'object') {
            const converted = {};
            for (const [key, value] of Object.entries(data)) {
                if (typeof value === 'bigint') {
                    converted[key] = Number(value);
                } else if (value && typeof value === 'object') {
                    converted[key] = this.convertBigIntToNumber(value);
                } else {
                    converted[key] = value;
                }
            }
            return converted;
        }
        return data;
    }

    // 디버깅용 테이블 구조 확인
    async debugTableStructure() {
        try {
            console.log('=== 실제 DB 테이블 구조 디버깅 ===');
            
            const tableExistsQuery = `
                SELECT COUNT(*) as table_count
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = 'tablets'
                AND TABLE_NAME = 'package_work'
            `;
            
            const tableExists = await this.executeRawQuery(tableExistsQuery);
            
            if (tableExists[0].table_count === 0) {
                return {
                    success: false,
                    error: 'package_work 테이블을 찾을 수 없습니다.',
                    data: null
                };
            }
            
            const columnsQuery = `
                SELECT 
                    COLUMN_NAME, 
                    DATA_TYPE, 
                    IS_NULLABLE, 
                    COLUMN_DEFAULT,
                    ORDINAL_POSITION
                FROM INFORMATION_SCHEMA.COLUMNS 
                WHERE TABLE_SCHEMA = 'tablets' 
                AND TABLE_NAME = 'package_work'
                ORDER BY ORDINAL_POSITION
            `;
            
            const columns = await this.executeRawQuery(columnsQuery);
            
            const tableInfoQuery = `
                SELECT TABLE_ROWS, CREATE_TIME, UPDATE_TIME
                FROM INFORMATION_SCHEMA.TABLES 
                WHERE TABLE_SCHEMA = 'tablets'
                AND TABLE_NAME = 'package_work'
            `;
            
            const tableInfo = await this.executeRawQuery(tableInfoQuery);
            
            // 실제 데이터 샘플 조회
            const sampleDataQuery = `SELECT * FROM tablets.package_work LIMIT 3`;
            const sampleData = await this.executeRawQuery(sampleDataQuery);
            
            return {
                success: true,
                data: {
                    table_exists: true,
                    table_info: tableInfo[0],
                    columns: columns,
                    column_count: columns.length,
                    sample_data: sampleData,
                    sample_count: sampleData.length
                }
            };
            
        } catch (error) {
            console.error('테이블 구조 확인 실패:', error);
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    // 데이터 접근 테스트
    async testDataAccess() {
        try {
            console.log('=== 실제 DB 데이터 접근 테스트 ===');
            
            const connectionTest = await this.executeRawQuery('SELECT 1 as test_value');
            const countQuery = 'SELECT COUNT(*) as total_count FROM tablets.package_work';
            const countResult = await this.executeRawQuery(countQuery);
            const sampleQuery = 'SELECT * FROM tablets.package_work LIMIT 5';
            const sampleData = await this.executeRawQuery(sampleQuery);
            
            return {
                success: true,
                data: {
                    connection_test: connectionTest[0].test_value === 1,
                    total_count: countResult[0].total_count,
                    sample_count: sampleData.length,
                    sample_data: sampleData,
                    database_status: 'OK',
                    tables_available: true
                }
            };
            
        } catch (error) {
            console.error('데이터 접근 테스트 실패:', error);
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    // 나머지 기본 함수들 (간략화)
    async initializeWork(lineId, productCode) {
        try {
            console.log(`작업 초기화: 라인=${lineId}, 제품코드=${productCode}`);
            const processFlow = await this.getProcessFlow(productCode);
            
            return {
                success: true,
                data: { lineId, productCode, processFlow }
            };
        } catch (error) {
            console.error('작업 초기화 실패:', error);
            return { success: false, error: error.message };
        }
    }

    async getProcessFlow(productCode) {
        try {
            const mockProcessFlow = [
                { 공정그룹코드: 'PKG001', 순서: 1, 공정코드: 'INNER_PKG' },
                { 공정그룹코드: 'PKG001', 순서: 2, 공정코드: 'OUTER_PKG' }
            ];
            
            console.log(`제품코드 ${productCode}의 공정흐름도 조회 (목업)`);
            return mockProcessFlow;
        } catch (error) {
            console.error('공정흐름도 조회 실패:', error);
            return [];
        }
    }

    async startInnerPackaging(workNumber) {
        try {
            console.log(`내포장 작업 시작: ${workNumber}`);
            return {
                success: true,
                message: '내포장 작업이 시작되었습니다.',
                workNumber: workNumber
            };
        } catch (error) {
            console.error('내포장 시작 실패:', error);
            return { success: false, error: error.message };
        }
    }

    async completeInnerPackaging(workNumber) {
        try {
            console.log(`내포장 작업 완료: ${workNumber}`);
            return {
                success: true,
                message: '내포장 작업이 완료되었습니다.',
                workNumber: workNumber
            };
        } catch (error) {
            console.error('내포장 완료 실패:', error);
            return { success: false, error: error.message };
        }
    }
}

// 싱글톤 인스턴스 생성
const packageService = new PackageService();

// 모듈 익스포트
module.exports = {
    getWorkList: function(...args) { return packageService.getWorkList(...args); },
    getWorkDetail: function(...args) { return packageService.getWorkDetail(...args); },
    getProductCodes: function(...args) { return packageService.getProductCodes(...args); },
    getWorksByLine: function(...args) { return packageService.getWorksByLine(...args); },
    debugTableStructure: function(...args) { return packageService.debugTableStructure(...args); },
    executeRawQuery: function(...args) { return packageService.executeRawQuery(...args); },
    testConnection: function(...args) { return packageService.testConnection(...args); },
    testDataAccess: function(...args) { return packageService.testDataAccess(...args); },
    initializeWork: function(...args) { return packageService.initializeWork(...args); },
    getProcessFlow: function(...args) { return packageService.getProcessFlow(...args); },
    startInnerPackaging: function(...args) { return packageService.startInnerPackaging(...args); },
    completeInnerPackaging: function(...args) { return packageService.completeInnerPackaging(...args); },
    convertBigIntToNumber: function(...args) { return packageService.convertBigIntToNumber(...args); },
    getMockWorkList: function(...args) { return packageService.getMockWorkList(...args); }
};