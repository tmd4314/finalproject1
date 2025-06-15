// sqls/workOrder.js 

// 2. 제품 검색 (모달) 
const searchProducts = `SELECT p.product_code, p.product_name, p.product_unit, p.product_stand,
                               (SELECT pg.process_group_code 
                                FROM process_group pg 
                                WHERE pg.product_code = p.product_code 
                                LIMIT 1) as process_group_code
        FROM product p
        WHERE (? = '' OR p.product_name LIKE CONCAT('%', ?, '%') 
                     OR p.product_code LIKE CONCAT('%', ?, '%'))
        ORDER BY p.product_name;`;

// 3. 작업지시서 검색 (모달) 
const searchWorkOrders = `SELECT 
            wom.work_order_no, 
            wom.plan_id, 
            wom.writer_id,
            wom.write_date,
            wom.order_start_dt,
            wom.order_end_dt,
            wom.order_remark,
            CONCAT(
                (SELECT p2.product_name 
                 FROM work_order_detail wod2 
                 LEFT JOIN product p2 ON wod2.product_code = p2.product_code 
                 WHERE wod2.work_order_no = wom.work_order_no 
                 ORDER BY wod2.work_order_priority, wod2.work_order_detail_id
                 LIMIT 1),
                CASE 
                    WHEN (SELECT COUNT(*) FROM work_order_detail wod3 WHERE wod3.work_order_no = wom.work_order_no) > 1 
                    THEN CONCAT(' 외 ', (SELECT COUNT(*) - 1 FROM work_order_detail wod4 WHERE wod4.work_order_no = wom.work_order_no), '건')
                    ELSE ''
                END
            ) as product_summary
        FROM work_order_master wom
            LEFT JOIN work_order_detail wod ON wom.work_order_no = wod.work_order_no
            LEFT JOIN product p ON wod.product_code = p.product_code
        WHERE (? = '' OR wom.work_order_no LIKE CONCAT('%', ?, '%')
                     OR p.product_name LIKE CONCAT('%', ?, '%'))
        GROUP BY wom.work_order_no
        ORDER BY wom.write_date DESC, wom.work_order_no DESC;`;

// 4. 계획 검색 (모달)
const searchPlans = `SELECT 
    pm.plan_id,
    pm.writer_id,
    pm.plan_reg_dt,
    pm.plan_start_dt,
    pm.plan_end_dt,
    pm.plan_remark,
    pm.plan_status,
    e.employee_name as writer_name,
    CONCAT(
        (SELECT p2.product_name 
         FROM production_plan_detail pd2 
         LEFT JOIN product p2 ON pd2.product_code = p2.product_code 
         WHERE pd2.plan_id = pm.plan_id 
         LIMIT 1),
        CASE 
            WHEN (SELECT COUNT(*) FROM production_plan_detail pd3 WHERE pd3.plan_id = pm.plan_id) > 1 
            THEN CONCAT(' 외 ', (SELECT COUNT(*) - 1 FROM production_plan_detail pd4 WHERE pd4.plan_id = pm.plan_id), '건')
            ELSE ''
        END
    ) as product_summary,
    (SELECT SUM(pd5.plan_qty) FROM production_plan_detail pd5 WHERE pd5.plan_id = pm.plan_id) as total_qty
FROM production_plan_master pm
    LEFT JOIN employees e ON pm.writer_id = e.employee_id
    LEFT JOIN production_plan_detail pd ON pm.plan_id = pd.plan_id
    LEFT JOIN product p ON pd.product_code = p.product_code
WHERE pm.plan_id NOT IN (
        SELECT DISTINCT wom.plan_id 
        FROM work_order_master wom 
        WHERE wom.plan_id IS NOT NULL AND wom.plan_id != ''
    )
    AND (? = '' OR pm.plan_id LIKE CONCAT('%', ?, '%')
                OR p.product_name LIKE CONCAT('%', ?, '%')
                OR pm.plan_start_dt = ?)
GROUP BY pm.plan_id
ORDER BY pm.plan_end_dt ASC;`;

// 5. 계획 정보 불러오기
const getPlanInfo = `SELECT 
            pm.plan_id,
            pm.writer_id,
            pm.plan_reg_dt,
            pm.plan_start_dt,
            pm.plan_end_dt,
            pm.plan_remark,
            pd.product_code,
            pd.plan_qty,
            p.product_name,
            p.product_unit,
            p.product_stand,
            (SELECT pg.process_group_code 
             FROM process_group pg 
             WHERE pg.product_code = p.product_code 
             LIMIT 1) as process_group_code
        FROM production_plan_master pm
            LEFT JOIN production_plan_detail pd ON pm.plan_id = pd.plan_id
            LEFT JOIN product p ON pd.product_code = p.product_code
        WHERE pm.plan_id = ?;`;

// 6. 기존 작업지시서 불러오기
const getWorkOrderInfo = `SELECT 
            wom.work_order_no,
            wom.plan_id,
            wom.writer_id,
            wom.write_date,
            wom.order_start_dt,
            wom.order_end_dt,
            wom.order_remark,
            e.employee_name as writer_name
        FROM work_order_master wom
            LEFT JOIN employees e ON wom.writer_id = e.employee_id
        WHERE wom.work_order_no = ?;`;

// 7. 작업지시서 제품 목록 조회
const getWorkOrderProducts = `SELECT 
            wod.work_order_detail_id,
            wod.product_code,
            wod.work_order_priority,
            wod.order_detail_remark,
            wod.work_order_no,
            wod.process_group_code,
            p.product_name,
            p.product_unit,
            p.product_stand
        FROM work_order_detail wod
            LEFT JOIN product p ON wod.product_code = p.product_code
        WHERE wod.work_order_no = ?
        ORDER BY wod.work_order_priority, wod.work_order_detail_id;`;

// 8. 작업지시서 저장
const saveWorkOrder = `INSERT INTO work_order_master (
            work_order_no, plan_id, writer_id, write_date,
            order_start_dt, order_end_dt, order_remark
        ) VALUES (?, ?, ?, ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            plan_id = VALUES(plan_id),
            writer_id = VALUES(writer_id),
            write_date = VALUES(write_date),
            order_start_dt = VALUES(order_start_dt),
            order_end_dt = VALUES(order_end_dt),
            order_remark = VALUES(order_remark);`;

// 9. 제품 정보 저장
const deleteWorkOrderProducts = `DELETE FROM work_order_detail WHERE work_order_no = ?;`;

const insertWorkOrderProduct = `INSERT INTO work_order_detail (
            work_order_no, product_code, work_order_priority, 
            order_detail_remark, process_group_code
        ) VALUES (?, ?, ?, ?, ?);`;

// 10. 작업지시서 목록 조회
const getWorkOrderList = `SELECT 
            work_order_no, plan_id, write_date,
            order_start_dt, order_end_dt, order_remark
        FROM work_order_master 
        WHERE (? = '' OR work_order_no LIKE CONCAT('%', ?, '%')
                     OR order_remark LIKE CONCAT('%', ?, '%'))
        ORDER BY write_date DESC, work_order_no DESC;`;

// 11. 작업지시서 번호 자동 생성
const generateWorkOrderNo = `
  SELECT 
    CONCAT('WO', DATE_FORMAT(NOW(), '%Y%m%d'), 
           LPAD(COALESCE(MAX(CAST(SUBSTRING(work_order_no, 11, 3) AS UNSIGNED)), 0) + 1, 3, '0')
    ) as next_work_order_no
  FROM work_order_master 
  WHERE work_order_no LIKE CONCAT('WO', DATE_FORMAT(NOW(), '%Y%m%d'), '%')
`;

// 모든 쿼리 객체 내보내기
module.exports = {
  searchProducts,
  searchWorkOrders,
  searchPlans,
  getPlanInfo,
  getWorkOrderInfo,
  getWorkOrderProducts,
  saveWorkOrder,
  deleteWorkOrderProducts,
  insertWorkOrderProduct,
  getWorkOrderList,
  generateWorkOrderNo, 
};