module.exports = {
    // 설비 이력 목록 조회
    equipmentHistoryList: `
        SELECT 
            eil.inspection_log_id,
            eil.eq_id,
            e.eq_name,
            eil.operator_id,
            emp1.employee_name as operator_name,
            eil.inspection_type_code,
            CASE 
                WHEN eil.inspection_type_code = 'n1' THEN '공정 전'
                WHEN eil.inspection_type_code = 'n2' THEN '공정 후'
                WHEN eil.inspection_type_code = 'n3' THEN '정기'
                WHEN eil.inspection_type_code = 'n4' THEN '비상'
                ELSE eil.inspection_type_code
            END as inspection_type_name,
            eil.status_code,
            CASE 
                WHEN eil.status_code = 'p1' THEN '대기 중'
                WHEN eil.status_code = 'p2' THEN '진행 중'
                WHEN eil.status_code = 'p3' THEN '완료'
                ELSE eil.status_code
            END as status_name,
            DATE_FORMAT(eil.start_time, '%Y-%m-%d %H:%i') as start_time,
            DATE_FORMAT(eil.end_time, '%Y-%m-%d %H:%i') as end_time,
            eil.result_code,
            CASE 
                WHEN eil.result_code = 'j1' THEN '적합'
                WHEN eil.result_code = 'j2' THEN '부적합'
                ELSE eil.result_code
            END as result_name,
            eil.inspection_remark,
            eil.confirmer_id,
            emp2.employee_name as confirmer_name
        FROM equipment_inspection_log eil
        LEFT JOIN equipment e ON eil.eq_id = e.eq_id
        LEFT JOIN employees emp1 ON eil.operator_id = emp1.employee_id
        LEFT JOIN employees emp2 ON eil.confirmer_id = emp2.employee_id
        ORDER BY eil.inspection_log_id DESC
    `
};