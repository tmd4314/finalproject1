// services/packageService.js - employees 테이블 조인 추가 (employment_status 조건 제거)
const mariadb = require('mariadb');
const packageQueries = require('../database/sqls/package');
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

        console.log('데이터베이스 연결 설정 (employees 테이블 조인 추가):');
        console.log('- HOST:', dbConfig.host);
        console.log('- USER:', dbConfig.user);
        console.log('- PASSWORD:', dbConfig.password ? '****' : 'MISSING');
        console.log('- DATABASE:', dbConfig.database);
        console.log('- PORT:', dbConfig.port);

        this.pool = mariadb.createPool(dbConfig);
    }

    // 연결 테스트
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

    // 라인명에서 제품코드 추출
    extractProductCodeFromLine(lineName) {
        try {
            if (!lineName) return null;
            
            // 일반적인 패턴 매칭
            const patterns = [
                /([A-Z]{2,3}-[A-Z]{2,3}-\d+)/i,  // BJA-DR-30 형태
                /([A-Z]{2,3}-[A-Z]{2}-\d+)/i,    // BJA-DR-10 형태  
                /([A-Z]+\d+)/i,                   // ABC123 형태
                /(BJA|BTC|BRA)/i                  // 알려진 제품군
            ];
            
            for (const pattern of patterns) {
                const match = lineName.match(pattern);
                if (match) {
                    console.log(`제품코드 추출 성공: ${match[1]} (라인명: ${lineName})`);
                    return match[1].toUpperCase();
                }
            }
            
            // 라인명에 따른 기본값 설정
            if (lineName.includes('B라인') || lineName.includes('BJA-DR-30')) {
                console.log('B라인 감지, BJA-DR-30 반환');
                return 'BJA-DR-30';
            }
            
            if (lineName.includes('A라인') || lineName.includes('BJA-DR-10')) {
                console.log('A라인 감지, BJA-DR-10 반환');
                return 'BJA-DR-10';
            }
            
            // 최종 기본값
            console.log('제품코드 추출 실패, 기본값 BJA-DR-10 사용');
            return 'BJA-DR-10';
            
        } catch (error) {
            console.log('제품코드 추출 실패, 기본값 사용:', error.message);
            return 'BJA-DR-10';
        }
    }

    // 새 작업번호 생성 (employees 조인 포함)
    async createNewWorkOrder(제품코드, lineId) {
        try {
            console.log(`새 작업번호 생성 (employees 조인 포함): 제품=${제품코드}, 라인=${lineId}`);
            
            const now = new Date();
            const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
            const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '');
            
            const resultId = `RE${dateStr}${timeStr}`;
            const workOrderNo = `WO${dateStr}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
            const 공정코드 = lineId.includes('내포장') || lineId.includes('INNER') ? 'p3' : 'p5';
            const processGroupCode = `${제품코드}-Process`;
            
            // 안전한 범위 내 정수 생성
            const baseNumber = 1000000;
            const randomNumber = Math.floor(Math.random() * 1000000000);
            const resultDetailId = baseNumber + randomNumber;
            
            // 기본 작업자 ID (employees 테이블에서 조회 - employment_status 조건 제거)
            let defaultEmployeeId = 2;
            let defaultEmployeeName = '김홍인';
            
            try {
                const employeeResult = await this.executeRawQuery(`
                    SELECT employee_id, employee_name 
                    FROM tablets.employees 
                    WHERE position LIKE '%작업자%' 
                    LIMIT 1
                `);
                
                if (employeeResult.length > 0) {
                    defaultEmployeeId = employeeResult[0].employee_id;
                    defaultEmployeeName = employeeResult[0].employee_name;
                    console.log(`기본 작업자 설정: ${defaultEmployeeName} (ID: ${defaultEmployeeId})`);
                }
            } catch (empError) {
                console.log('기본 작업자 조회 실패, 기본값 사용:', empError.message);
            }
            
            console.log(`생성할 작업번호: ${workOrderNo}, 실적ID: ${resultId}, 공정코드: ${공정코드}`);
            console.log(`작업자: ${defaultEmployeeName} (ID: ${defaultEmployeeId})`);
            
            // INT(11) 범위 확인
            if (resultDetailId > 2147483647) {
                const safeId = Math.floor(Math.random() * 1000000000) + 1000000;
                console.log(`범위 초과로 재생성: ${safeId}`);
                return await this.createNewWorkOrder(제품코드, lineId);
            }
            
            // 1. work_order_master 생성 (실제 작업자 ID)
            await this.executeRawQuery(`
                INSERT INTO tablets.work_order_master (
                    work_order_no, plan_id, writer_id, write_date, 
                    order_start_dt, order_end_dt, order_remark
                ) VALUES (?, ?, ?, NOW(), NOW(), DATE_ADD(NOW(), INTERVAL 1 DAY), ?)
            `, [workOrderNo, 제품코드, defaultEmployeeId, `${공정코드} 작업 자동 생성`]);
            
            // 2. work_result 생성
            await this.executeRawQuery(`
                INSERT INTO tablets.work_result (
                    result_id, work_order_no, process_group_code, result_remark, 
                    code_value, work_start_date, work_end_date
                ) VALUES (?, ?, ?, ?, 'waiting', NOW(), NULL)
            `, [resultId, workOrderNo, processGroupCode, `${공정코드} 실적 자동 생성`]);
            
            // 3. work_result_detail 생성 (실제 작업자 ID를 d + employee_id 형태로 저장)
            await this.executeRawQuery(`
                INSERT INTO tablets.work_result_detail (
                    result_detail, result_id, process_code, code_value, 
                    work_start_time, pass_qty, process_defective_qty, 
                    manager_id, eq_type_code
                ) VALUES (?, ?, ?, 'waiting', NOW(), 1000, '0', ?, 'i8')
            `, [resultDetailId, resultId, 공정코드, `d${defaultEmployeeId}`]);
            
            console.log(`새 작업 생성 완료 (employees 조인): ${workOrderNo}`);
            
            return {
                work_order_no: workOrderNo,
                work_id: workOrderNo,
                result_detail_id: resultDetailId,
                result_id: resultId,
                step_status: 'READY',
                input_qty: 1000,
                output_qty: 0,
                product_name: `${제품코드} 제품`,
                final_product_name: `${제품코드} 제품`,
                employee_name: defaultEmployeeName,
                employee_id: defaultEmployeeId,
                product_code: 제품코드,
                process_code: 공정코드
            };
            
        } catch (error) {
            console.error('새 작업번호 생성 실패 (employees 조인):', error);
            throw error;
        }
    }

    // 내포장 라인별 작업번호 조회 (employees 조인 추가, employment_status 조건 제거)
    async getInnerWorkByLine(lineId, lineName) {
        try {
            console.log(`\n=== 내포장 작업번호 조회 (employees 조인 추가) ===`);
            console.log(`라인: ${lineId}, ${lineName}`);
            
            // 라인명에서 제품코드 추출
            const productCode = this.extractProductCodeFromLine(lineName) || 'BJA-DR-10';
            console.log(`추출된 제품코드: ${productCode}`);
            
            // employees 테이블 조인으로 내포장 작업 조회 (manager_id에서 d 제거해서 조인)
            const result = await this.executeRawQuery(`
                SELECT 
                    wom.work_order_no as 작업번호,
                    wom.plan_id as 제품코드,
                    COALESCE(p.product_name, '제품명없음') as 제품명,
                    wrd.code_value as 진행상태,
                    wrd.pass_qty as input_qty,
                    0 as output_qty,
                    COALESCE(emp.employee_name, '작업자') as employee_name,
                    COALESCE(emp.employee_id, 2) as employee_id,
                    COALESCE(emp.position, '작업자') as position,
                    COALESCE(emp.department_code, '포장부') as department_code,
                    wrd.manager_id,
                    ? as line_id,
                    ? as line_name,
                    wrd.result_detail,
                    wr.result_id,
                    '내포장' as step_name,
                    'READY' as step_status
                FROM tablets.work_order_master wom
                JOIN tablets.work_result wr ON wom.work_order_no = wr.work_order_no
                JOIN tablets.work_result_detail wrd ON wr.result_id = wrd.result_id
                LEFT JOIN tablets.product p ON wom.plan_id = p.product_code
                LEFT JOIN tablets.employees emp ON CAST(REPLACE(wrd.manager_id, 'd', '') AS UNSIGNED) = emp.employee_id
                WHERE wrd.process_code = 'p3'
                AND wrd.code_value IN ('waiting', 'ready', '대기', '준비')
                AND (wom.plan_id LIKE ? OR p.product_name LIKE ?)
                ORDER BY wom.order_start_dt ASC
                LIMIT 1
            `, [lineId, lineName, `%${productCode}%`, `%${productCode}%`]);
            
            if (result.length > 0) {
                const work = result[0];
                console.log(`내포장 작업번호 조회 성공 (employees 조인): ${work.작업번호}, 작업자: ${work.employee_name}, manager_id: ${work.manager_id}`);
                return {
                    work_order_no: work.작업번호,
                    work_id: work.작업번호,
                    result_detail_id: work.result_detail,
                    result_id: work.result_id,
                    step_status: work.step_status,
                    input_qty: work.input_qty || 1000,
                    output_qty: work.output_qty || 0,
                    product_name: work.제품명,
                    final_product_name: work.제품명,
                    employee_name: work.employee_name,
                    employee_id: work.employee_id,
                    position: work.position,
                    department_code: work.department_code,
                    product_code: work.제품코드,
                    process_code: 'p3'
                };
            }
            
            // 작업이 없으면 새로 생성
            console.log('기존 내포장 작업이 없어서 새로 생성 (employees 조인)');
            return await this.createNewWorkOrder(productCode, lineId);
            
        } catch (error) {
            console.error(`내포장 작업번호 조회 실패 (employees 조인):`, error);
            throw error;
        }
    }

    // 외포장 라인별 작업번호 조회 (employees 조인 추가, employment_status 조건 제거)
    async getOuterWorkByLine(lineId, lineName) {
        try {
            console.log(`\n=== 외포장 작업번호 조회 (employees 조인 추가) ===`);
            console.log(`라인: ${lineId}, ${lineName}`);
            
            // 라인명에서 제품코드 추출
            const productCode = this.extractProductCodeFromLine(lineName) || 'BJA-DR-10';
            console.log(`추출된 제품코드: ${productCode}`);
            
            // 3-1) 포장공정실적에서 내포장 완료된 건 가져오기 (employees 조인, employment_status 조건 제거)
            console.log('\nStep 3-1: 포장공정실적에서 내포장 완료된 건 가져오기 (employees 조인)');
            const 완료된내포장 = await this.executeRawQuery(`
                SELECT 
                    wom.work_order_no as 작업번호,
                    wr.result_id as 실적ID,
                    wrd.process_code as 공정코드,
                    wrd.work_start_time as 시작시간,
                    wrd.work_end_time as 종료시간,
                    wrd.pass_qty as 합격수량,
                    wrd.result_detail,
                    wom.plan_id as 제품코드,
                    COALESCE(p.product_name, '제품명없음') as 제품명,
                    COALESCE(emp.employee_name, '작업자') as employee_name,
                    COALESCE(emp.employee_id, 2) as employee_id
                FROM tablets.work_order_master wom
                JOIN tablets.work_result wr ON wom.work_order_no = wr.work_order_no
                JOIN tablets.work_result_detail wrd ON wr.result_id = wrd.result_id
                LEFT JOIN tablets.product p ON wom.plan_id = p.product_code
                LEFT JOIN tablets.employees emp ON CAST(REPLACE(wrd.manager_id, 'd', '') AS UNSIGNED) = emp.employee_id
                WHERE wrd.code_value = 'completed'
                AND wrd.process_code = 'p3'
                AND wom.plan_id = ?
                ORDER BY wrd.work_end_time DESC
                LIMIT 1
            `, [productCode]);
            
            if (완료된내포장.length > 0) {
                console.log('완료된 내포장 발견 (employees 조인):', 완료된내포장[0]);
                
                // 해당 실적ID에서 외포장(p5) 작업 확인 (employees 조인, employment_status 조건 제거)
                const 외포장작업 = await this.executeRawQuery(`
                    SELECT 
                        wom.work_order_no as 작업번호,
                        wrd.result_detail,
                        wrd.process_code as 공정코드,
                        wrd.code_value as 진행상태,
                        wr.result_id as 실적ID,
                        wom.plan_id as 제품코드,
                        COALESCE(p.product_name, '제품명없음') as 제품명,
                        COALESCE(wrd.pass_qty, 1000) as input_qty,
                        'READY' as step_status,
                        COALESCE(emp.employee_name, '작업자') as employee_name,
                        COALESCE(emp.employee_id, 2) as employee_id,
                        COALESCE(emp.position, '작업자') as position,
                        COALESCE(emp.department_code, '포장부') as department_code
                    FROM tablets.work_result_detail wrd
                    JOIN tablets.work_result wr ON wrd.result_id = wr.result_id
                    JOIN tablets.work_order_master wom ON wr.work_order_no = wom.work_order_no
                    LEFT JOIN tablets.product p ON wom.plan_id = p.product_code
                    LEFT JOIN tablets.employees emp ON CAST(REPLACE(wrd.manager_id, 'd', '') AS UNSIGNED) = emp.employee_id
                    WHERE wr.result_id = ?
                    AND wrd.process_code = 'p5'
                    AND wrd.code_value IN ('waiting', 'ready', '대기', '준비')
                    LIMIT 1
                `, [완료된내포장[0].실적ID]);
                
                if (외포장작업.length > 0) {
                    console.log('대기중인 외포장 작업 발견 (employees 조인):', 외포장작업[0]);
                    return {
                        work_order_no: 외포장작업[0].작업번호,
                        work_id: 외포장작업[0].작업번호,
                        result_detail_id: 외포장작업[0].result_detail,
                        result_id: 외포장작업[0].실적ID,
                        step_status: 'READY',
                        input_qty: 외포장작업[0].input_qty || 1000,
                        output_qty: 0,
                        product_name: 외포장작업[0].제품명,
                        final_product_name: 외포장작업[0].제품명,
                        employee_name: 외포장작업[0].employee_name,
                        employee_id: 외포장작업[0].employee_id,
                        position: 외포장작업[0].position,
                        department_code: 외포장작업[0].department_code,
                        product_code: 외포장작업[0].제품코드,
                        process_code: 'p5'
                    };
                } else {
                    // 외포장 작업 생성 (기존 작업자 정보 유지)
                    console.log('외포장 작업이 없어서 새로 생성 (employees 조인, 기존 작업자 유지)');
                    await this.executeRawQuery(`
                        INSERT INTO tablets.work_result_detail (
                            result_detail, result_id, process_code, code_value, 
                            work_start_time, pass_qty, process_defective_qty, 
                            manager_id, eq_type_code
                        ) VALUES (?, ?, 'p5', 'waiting', NOW(), ?, '0', ?, 'i8')
                    `, [
                        `${완료된내포장[0].실적ID}_p5`,
                        완료된내포장[0].실적ID,
                        완료된내포장[0].합격수량 || 1000,
                        완료된내포장[0].employee_id || 2
                    ]);
                    
                    return {
                        work_order_no: 완료된내포장[0].작업번호,
                        work_id: 완료된내포장[0].작업번호,
                        result_detail_id: `${완료된내포장[0].실적ID}_p5`,
                        result_id: 완료된내포장[0].실적ID,
                        step_status: 'READY',
                        input_qty: 완료된내포장[0].합격수량 || 1000,
                        output_qty: 0,
                        product_name: 완료된내포장[0].제품명,
                        final_product_name: 완료된내포장[0].제품명,
                        employee_name: 완료된내포장[0].employee_name,
                        employee_id: 완료된내포장[0].employee_id,
                        product_code: 완료된내포장[0].제품코드,
                        process_code: 'p5'
                    };
                }
            }
            
            // 완료된 내포장이 없으면 일반 외포장 작업 조회 (employees 조인, employment_status 조건 제거)
            console.log('완료된 내포장이 없어서 일반 외포장 작업 조회 (employees 조인)');
            const result = await this.executeRawQuery(`
                SELECT 
                    wom.work_order_no as 작업번호,
                    wom.plan_id as 제품코드,
                    COALESCE(p.product_name, '제품명없음') as 제품명,
                    wrd.code_value as 진행상태,
                    wrd.pass_qty as input_qty,
                    0 as output_qty,
                    COALESCE(emp.employee_name, '작업자') as employee_name,
                    COALESCE(emp.employee_id, 2) as employee_id,
                    COALESCE(emp.position, '작업자') as position,
                    COALESCE(emp.department_code, '포장부') as department_code,
                    ? as line_id,
                    ? as line_name,
                    wrd.result_detail,
                    wr.result_id,
                    '외포장' as step_name,
                    'READY' as step_status
                FROM tablets.work_order_master wom
                JOIN tablets.work_result wr ON wom.work_order_no = wr.work_order_no
                JOIN tablets.work_result_detail wrd ON wr.result_id = wrd.result_id
                LEFT JOIN tablets.product p ON wom.plan_id = p.product_code
                LEFT JOIN tablets.employees emp ON CAST(REPLACE(wrd.manager_id, 'd', '') AS UNSIGNED) = emp.employee_id
                WHERE wrd.process_code = 'p5'
                AND wrd.code_value IN ('waiting', 'ready', '대기', '준비')
                AND (wom.plan_id LIKE ? OR p.product_name LIKE ?)
                ORDER BY wom.order_start_dt ASC
                LIMIT 1
            `, [lineId, lineName, `%${productCode}%`, `%${productCode}%`]);
            
            if (result.length > 0) {
                const work = result[0];
                console.log(`외포장 작업번호 조회 성공 (employees 조인): ${work.작업번호}, 작업자: ${work.employee_name}`);
                return {
                    work_order_no: work.작업번호,
                    work_id: work.작업번호,
                    result_detail_id: work.result_detail,
                    result_id: work.result_id,
                    step_status: work.step_status,
                    input_qty: work.input_qty || 1000,
                    output_qty: work.output_qty || 0,
                    product_name: work.제품명,
                    final_product_name: work.제품명,
                    employee_name: work.employee_name,
                    employee_id: work.employee_id,
                    position: work.position,
                    department_code: work.department_code,
                    product_code: work.제품코드,
                    process_code: 'p5'
                };
            }

            // 작업이 없으면 새로 생성
            console.log('기존 외포장 작업이 없어서 새로 생성 (employees 조인)');
            return await this.createNewWorkOrder(productCode, lineId);
            
        } catch (error) {
            console.error(`외포장 작업번호 조회 실패 (employees 조인):`, error);
            throw error;
        }
    }

    // 내포장 작업 시작 워크플로우 (변경사항 없음)
    async startInnerPackagingWorkflow(workOrderNo, productCode, processGroupCode) {
        try {
            console.log(`내포장 작업 시작 워크플로우 (employees 조인): ${workOrderNo}, 제품: ${productCode}`);
            
            // 2-4) 작업시작 시 - 내포장시 추가로 코드 만들기
            const result = await this.executeRawQuery(`
                UPDATE tablets.work_result_detail wrd
                JOIN tablets.work_result wr ON wrd.result_id = wr.result_id
                JOIN tablets.work_order_master wom ON wr.work_order_no = wom.work_order_no
                SET 
                    wrd.code_value = 'in_progress',
                    wrd.work_start_time = NOW()
                WHERE wom.work_order_no = ?
                AND wrd.process_code = 'p3'
            `, [workOrderNo]);
            
            console.log(`내포장 작업 시작 업데이트 완료 (employees 조인): ${workOrderNo} (${result.affectedRows}건)`);
            
            return {
                success: true,
                message: '내포장 작업이 시작되었습니다.',
                data: {
                    work_order_no: workOrderNo,
                    product_code: productCode,
                    process_group_code: processGroupCode,
                    process_code: 'p3',
                    status: 'in_progress',
                    start_time: new Date()
                }
            };
            
        } catch (error) {
            console.error(`내포장 작업 시작 워크플로우 실패 (employees 조인) (${workOrderNo}):`, error);
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    // 내포장 작업 완료 워크플로우 (변경사항 없음)
    async completeInnerPackagingWorkflow(workOrderNo, passQty, defectiveQty) {
        try {
            console.log(`내포장 작업 완료 워크플로우 (employees 조인): ${workOrderNo}`);
            
            // 내포장 완료시 실적 상세 테이블에 시작시간 업데이트 하고
            const result = await this.executeRawQuery(`
                UPDATE tablets.work_result_detail wrd
                JOIN tablets.work_result wr ON wrd.result_id = wr.result_id
                JOIN tablets.work_order_master wom ON wr.work_order_no = wom.work_order_no
                SET 
                    wrd.code_value = 'completed',
                    wrd.work_end_time = NOW(),
                    wrd.pass_qty = ?,
                    wrd.process_defective_qty = ?
                WHERE wom.work_order_no = ?
                AND wrd.process_code = 'p3'
            `, [passQty, defectiveQty || '0', workOrderNo]);
            
            console.log(`내포장 완료 업데이트 완료 (employees 조인): ${workOrderNo} (${result.affectedRows}건)`);
            
            return {
                success: true,
                message: '내포장 작업이 완료되었습니다.',
                data: {
                    work_order_no: workOrderNo,
                    process_code: 'p3',
                    status: 'completed',
                    pass_qty: passQty,
                    defective_qty: defectiveQty,
                    end_time: new Date()
                }
            };
            
        } catch (error) {
            console.error(`내포장 작업 완료 워크플로우 실패 (employees 조인) (${workOrderNo}):`, error);
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    // 외포장 작업 시작 워크플로우 (변경사항 없음)
    async startOuterPackagingWorkflow(workOrderNo, productCode, processGroupCode, innerOutputQty) {
        try {
            console.log(`외포장 작업 시작 워크플로우 (employees 조인): ${workOrderNo}, 내포장 수량: ${innerOutputQty}`);
            
            const result = await this.executeRawQuery(`
                UPDATE tablets.work_result_detail wrd
                JOIN tablets.work_result wr ON wrd.result_id = wr.result_id
                JOIN tablets.work_order_master wom ON wr.work_order_no = wom.work_order_no
                SET 
                    wrd.code_value = 'in_progress',
                    wrd.work_start_time = NOW(),
                    wrd.pass_qty = ?
                WHERE wom.work_order_no = ?
                AND wrd.process_code = 'p5'
            `, [innerOutputQty || 1000, workOrderNo]);
            
            console.log(`외포장 작업 시작 업데이트 완료 (employees 조인): ${workOrderNo} (${result.affectedRows}건)`);
            
            return {
                success: true,
                message: '외포장 작업이 시작되었습니다.',
                data: {
                    work_order_no: workOrderNo,
                    product_code: productCode,
                    process_group_code: processGroupCode,
                    process_code: 'p5',
                    status: 'in_progress',
                    inner_output_qty: innerOutputQty,
                    start_time: new Date()
                }
            };
            
        } catch (error) {
            console.error(`외포장 작업 시작 워크플로우 실패 (employees 조인) (${workOrderNo}):`, error);
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    // 외포장 작업 완료 워크플로우 (변경사항 없음)
    async completeOuterPackagingWorkflow(workOrderNo, passQty, defectiveQty) {
        try {
            console.log(`외포장 작업 완료 워크플로우 (employees 조인): ${workOrderNo}`);
            
            // 3-2) 외포장공정 종료 시
            const result = await this.executeRawQuery(`
                UPDATE tablets.work_result_detail wrd
                JOIN tablets.work_result wr ON wrd.result_id = wr.result_id
                JOIN tablets.work_order_master wom ON wr.work_order_no = wom.work_order_no
                SET 
                    wrd.code_value = 'inspection',
                    wrd.work_end_time = NOW(),
                    wrd.pass_qty = ?,
                    wrd.process_defective_qty = ?
                WHERE wom.work_order_no = ?
                AND wrd.process_code = 'p5'
            `, [passQty, defectiveQty || '0', workOrderNo]);
            
            console.log(`외포장 완료 업데이트 완료 (검사중) (employees 조인): ${workOrderNo} (${result.affectedRows}건)`);
            
            return {
                success: true,
                message: '외포장 작업이 완료되었습니다. 모든 포장 단계가 완료되었습니다.',
                data: {
                    work_order_no: workOrderNo,
                    process_code: 'p5',
                    status: 'inspection',
                    pass_qty: passQty,
                    defective_qty: defectiveQty,
                    end_time: new Date(),
                    all_packaging_completed: true
                }
            };
            
        } catch (error) {
            console.error(`외포장 작업 완료 워크플로우 실패 (employees 조인) (${workOrderNo}):`, error);
            return {
                success: false,
                error: error.message,
                data: null
            };
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

    // 기존 package_work 테이블 관련 함수들 (employees 조인 추가, employment_status 조건 제거)
    async getWorkList(packageType = null, lineId = null, lineName = null) {
        try {
            console.log('package_work 테이블에서 작업 목록 조회 (employees 조인 추가):', { packageType, lineId, lineName });
            
            let query = `
                SELECT 
                    pw.work_id,
                    pw.work_order_no,
                    pw.order_detail_id,
                    pw.line_id,
                    pw.work_line,
                    pw.work_step,
                    pw.step_name,
                    pw.step_status,
                    pw.input_qty,
                    pw.output_qty,
                    pw.eq_code,
                    pw.start_time,
                    pw.end_time,
                    pw.employee_id,
                    COALESCE(emp.employee_name, pw.employee_name, '작업자') as employee_name,
                    COALESCE(emp.position, '작업자') as position,
                    COALESCE(emp.department_code, '포장부') as department_code,
                    pw.product_name,
                    pw.reg_date,
                    pw.upd_date,
                    NULL as result_detail_id,
                    
                    COALESCE(pw.product_name, pw.step_name, '제품명없음') as final_product_name,
                    
                    CASE 
                        WHEN pw.step_name LIKE '%외포장%' OR pw.step_name LIKE '%2차%' THEN 'OUTER'
                        ELSE 'INNER'
                    END as package_type,
                    
                    COALESCE(pw.work_line, pw.line_id, '라인정보없음') as line_name,
                    
                    CASE 
                        WHEN pw.input_qty > 0 THEN ROUND((pw.output_qty / pw.input_qty * 100), 1)
                        ELSE 0
                    END AS progress_rate,
                    
                    COALESCE(pw.input_qty, 1000) as order_qty,
                    COALESCE(pw.input_qty, 1000) as target_qty,
                    COALESCE(emp.employee_name, pw.employee_name, '작업자') as emp_name,
                    0 as defect_qty,
                    
                    pw.work_id as work_no
                    
                FROM package_work pw
                LEFT JOIN tablets.employees emp ON pw.employee_id = emp.employee_id
                WHERE pw.work_id IS NOT NULL
            `;
            
            const params = [];
            
            // 포장타입 필터
            if (packageType) {
                if (packageType === 'INNER') {
                    query += ` AND (pw.step_name NOT LIKE '%외포장%' AND pw.step_name NOT LIKE '%2차%')`;
                } else if (packageType === 'OUTER') {
                    query += ` AND (pw.step_name LIKE '%외포장%' OR pw.step_name LIKE '%2차%')`;
                }
            }
            
            // 라인 필터
            if (lineId && lineId !== 'ALL') {
                query += ` AND (pw.line_id LIKE ? OR pw.work_line LIKE ?)`;
                params.push(`%${lineId}%`, `%${lineId}%`);
            }
            
            if (lineName && lineName !== 'ALL') {
                query += ` AND (pw.line_id LIKE ? OR pw.work_line LIKE ? OR pw.step_name LIKE ?)`;
                params.push(`%${lineName}%`, `%${lineName}%`, `%${lineName}%`);
            }
            
            query += ` ORDER BY pw.reg_date DESC LIMIT 50`;
            
            const result = await this.executeRawQuery(query, params);
            console.log(`package_work 작업 목록 조회 완료 (employees 조인): ${result.length}건`);
            
            return this.convertBigIntToNumber(result);
            
        } catch (error) {
            console.error('package_work 작업 목록 조회 실패 (employees 조인):', error);
            throw new Error(`package_work DB 연결 실패: ${error.message}`);
        }
    }

    // 기타 필요한 함수들 (employees 조인 추가, employment_status 조건 제거)
    async getWorkDetail(workId) {
        try {
            const result = await this.executeRawQuery(`
                SELECT 
                    pw.*,
                    COALESCE(emp.employee_name, pw.employee_name, '작업자') as employee_name,
                    COALESCE(emp.position, '작업자') as position,
                    COALESCE(emp.department_code, '포장부') as department_code,
                    emp.employment_status,
                    NULL as result_detail_id,
                    COALESCE(pw.product_name, pw.step_name, '제품명없음') as final_product_name,
                    COALESCE(emp.employee_name, pw.employee_name, '작업자') as emp_name,
                    COALESCE(pw.input_qty, 1000) as order_qty,
                    COALESCE(pw.work_line, pw.line_id, '라인정보없음') as line_name,
                    pw.work_id as work_no
                FROM package_work pw
                LEFT JOIN tablets.employees emp ON pw.employee_id = emp.employee_id
                WHERE pw.work_id = ?
            `, [workId]);
            
            return result.length > 0 ? this.convertBigIntToNumber(result[0]) : null;
        } catch (error) {
            console.error(`작업 상세 조회 실패 (employees 조인) (${workId}):`, error);
            return null;
        }
    }

    async getProductCodes() {
        try {
            const query = `
                SELECT DISTINCT 
                    pw.product_name,
                    pw.product_name as product_code,
                    COUNT(*) as work_count
                FROM package_work pw
                LEFT JOIN tablets.employees emp ON pw.employee_id = emp.employee_id
                WHERE pw.product_name IS NOT NULL 
                AND pw.product_name != ''
                GROUP BY pw.product_name
                ORDER BY work_count DESC
            `;
            
            const result = await this.executeRawQuery(query);
            console.log(`제품코드 조회 완료 (employees 조인): ${result.length}개`);
            return this.convertBigIntToNumber(result);
            
        } catch (error) {
            console.error('제품코드 조회 실패 (employees 조인):', error);
            throw error;
        }
    }

    async getWorksByLine(lineId) {
        try {
            const query = `
                SELECT 
                    pw.work_id,
                    pw.work_order_no,
                    pw.step_name,
                    pw.step_status,
                    pw.input_qty,
                    pw.output_qty,
                    COALESCE(emp.employee_name, pw.employee_name, '작업자') as employee_name,
                    COALESCE(emp.position, '작업자') as position,
                    COALESCE(emp.department_code, '포장부') as department_code,
                    pw.product_name,
                    pw.line_id,
                    pw.work_line,
                    NULL as result_detail_id,
                    
                    COALESCE(pw.product_name, pw.step_name, '제품명없음') as final_product_name,
                    COALESCE(pw.work_line, pw.line_id, '라인정보없음') as line_name,
                    
                    CASE 
                        WHEN pw.input_qty > 0 THEN ROUND((pw.output_qty / pw.input_qty * 100), 1)
                        ELSE 0
                    END AS progress_rate,
                    
                    pw.work_id as work_no
                    
                FROM package_work pw
                LEFT JOIN tablets.employees emp ON pw.employee_id = emp.employee_id
                WHERE (pw.line_id LIKE ? OR pw.work_line LIKE ?)
                ORDER BY pw.reg_date DESC
            `;
            
            const result = await this.executeRawQuery(query, [`%${lineId}%`, `%${lineId}%`]);
            return this.convertBigIntToNumber(result);
            
        } catch (error) {
            console.error('라인별 작업 조회 실패 (employees 조인):', error);
            throw error;
        }
    }

    // 테스트용 함수들
    async debugTableStructure() {
        try {
            console.log('=== 테이블 구조 확인 (employees 조인 추가) ===');
            
            const tables = ['package_work', 'work_order_master', 'work_result', 'work_result_detail', 'process', 'process_group', 'employees'];
            const tableInfo = {};
            
            for (const tableName of tables) {
                try {
                    const countQuery = `SELECT COUNT(*) as total_rows FROM ${tableName}`;
                    const countResult = await this.executeRawQuery(countQuery);
                    
                    tableInfo[tableName] = {
                        exists: true,
                        total_rows: countResult[0].total_rows
                    };
                } catch (error) {
                    tableInfo[tableName] = {
                        exists: false,
                        error: error.message
                    };
                }
            }
            
            // employees 테이블 활성 사용자 수 확인 (employment_status 조건 제거)
            try {
                const activeEmployees = await this.executeRawQuery(`
                    SELECT COUNT(*) as active_count 
                    FROM employees 
                    WHERE employment_status = 'Y'
                `);
                tableInfo.employees.active_employees = activeEmployees[0].active_count;
                
                // 전체 employees 수도 확인
                const allEmployees = await this.executeRawQuery(`
                    SELECT COUNT(*) as total_employees 
                    FROM employees
                `);
                tableInfo.employees.total_employees = allEmployees[0].total_employees;
            } catch (error) {
                tableInfo.employees.active_employees = 0;
                tableInfo.employees.total_employees = 0;
            }
            
            return {
                success: true,
                data: tableInfo
            };
            
        } catch (error) {
            console.error('테이블 구조 확인 실패 (employees 조인):', error);
            return {
                success: false,
                error: error.message,
                data: null
            };
        }
    }

    async simpleDataCheck() {
        try {
            const checks = {};
            
            const tables = ['package_work', 'work_order_master', 'work_result', 'work_result_detail', 'process', 'process_group', 'employees'];
            
            for (const table of tables) {
                try {
                    const result = await this.executeRawQuery(`SELECT COUNT(*) as total FROM ${table}`);
                    checks[`${table}_rows`] = result[0].total;
                } catch (error) {
                    checks[`${table}_rows`] = 0;
                }
            }
            
            // employees 테이블 활성 사용자 수 (employment_status 조건 제거)
            try {
                const activeResult = await this.executeRawQuery(`
                    SELECT COUNT(*) as total FROM employees WHERE employment_status = 'Y'
                `);
                checks.active_employees = activeResult[0].total;
                
                // 전체 employees 수
                const allResult = await this.executeRawQuery(`
                    SELECT COUNT(*) as total FROM employees
                `);
                checks.total_employees = allResult[0].total;
            } catch (error) {
                checks.active_employees = 0;
                checks.total_employees = 0;
            }
            
            return {
                success: true,
                data: {
                    ...checks,
                    has_data: Object.values(checks).some(count => count > 0)
                }
            };
        } catch (error) {
            return {
                success: false,
                error: error.message
            };
        }
    }
}

// 싱글톤 인스턴스 생성
const packageService = new PackageService();

// 모듈 익스포트
module.exports = {
    // 라인별 단일 작업번호 조회 (employees 조인 추가)
    getInnerWorkByLine: function(...args) { return packageService.getInnerWorkByLine(...args); },
    getOuterWorkByLine: function(...args) { return packageService.getOuterWorkByLine(...args); },
    
    // 워크플로우 함수들 (employees 조인)
    startInnerPackagingWorkflow: function(...args) { return packageService.startInnerPackagingWorkflow(...args); },
    completeInnerPackagingWorkflow: function(...args) { return packageService.completeInnerPackagingWorkflow(...args); },
    startOuterPackagingWorkflow: function(...args) { return packageService.startOuterPackagingWorkflow(...args); },
    completeOuterPackagingWorkflow: function(...args) { return packageService.completeOuterPackagingWorkflow(...args); },
    
    // 기존 package_work 테이블 함수들 (employees 조인 추가)
    getWorkList: function(...args) { return packageService.getWorkList(...args); },
    getWorkDetail: function(...args) { return packageService.getWorkDetail(...args); },
    getProductCodes: function(...args) { return packageService.getProductCodes(...args); },
    getWorksByLine: function(...args) { return packageService.getWorksByLine(...args); },
    
    // 유틸리티 함수들
    debugTableStructure: function(...args) { return packageService.debugTableStructure(...args); },
    executeRawQuery: function(...args) { return packageService.executeRawQuery(...args); },
    testConnection: function(...args) { return packageService.testConnection(...args); },
    simpleDataCheck: function(...args) { return packageService.simpleDataCheck(...args); },
    convertBigIntToNumber: function(...args) { return packageService.convertBigIntToNumber(...args); }
};