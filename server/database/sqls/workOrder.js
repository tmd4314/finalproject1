// sqls/workOrder.js - 매퍼에 맞게 수정된 구조

// 1. 사원 검색 (모달용) - 수정됨
const searchEmployees = `SELECT e.employee_id, e.employee_name as emp_name, d.department_name as dept_name, e.position
        FROM employees e
        LEFT JOIN department d ON e.department_code = d.department_code
        WHERE (? = '' OR e.employee_name LIKE CONCAT('%', ?, '%') 
                     OR e.employee_id LIKE CONCAT('%', ?, '%'))
        ORDER BY d.department_name, e.employee_name;`;

// 2. 제품 검색 (모달용)
const searchProducts = `SELECT product_code, product_name, product_unit, product_stand, product_pay
        FROM product 
        WHERE (? = '' OR product_name LIKE CONCAT('%', ?, '%') 
                     OR product_code LIKE CONCAT('%', ?, '%'))
        ORDER BY product_name;`;

// 3. 작업지시서 검색 (모달용)
const searchWorkOrders = `SELECT 
            work_order_no, 
            plan_id, 
            write_date,
            start_date,
            end_date,
            order_remark
        FROM work_order_master 
        WHERE (? = '' OR work_order_no LIKE CONCAT('%', ?, '%')
                     OR order_remark LIKE CONCAT('%', ?, '%'))
        ORDER BY write_date DESC, work_order_no DESC;`;

// 4. 계획 검색 (모달용) - 수정됨
const searchPlans = `SELECT 
            pm.plan_id,
            pm.writer_id,
            pm.plan_reg_dt,
            pm.plan_start_dt,
            pm.plan_end_dt,
            pm.plan_remark,
            e.employee_name as writer_name
        FROM production_plan_master pm
            LEFT JOIN employees e ON pm.writer_id = e.employee_id
        WHERE (? = '' OR pm.plan_id LIKE CONCAT('%', ?, '%')
                     OR pm.plan_remark LIKE CONCAT('%', ?, '%'))
        ORDER BY pm.plan_reg_dt DESC, pm.plan_id DESC;`;

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
            p.product_stand
        FROM production_plan_master pm
            LEFT JOIN production_plan_detail pd ON pm.plan_id = pd.plan_id
            LEFT JOIN product p ON pd.product_code = p.product_code
        WHERE pm.plan_id = ?;`;

// 6. 기존 작업지시서 불러오기 (수정됨)
const getWorkOrderInfo = `SELECT 
            wom.work_order_no,
            wom.plan_id,
            wom.writer_id,
            wom.write_date,
            wom.manager_id,
            wom.start_date,
            wom.end_date,
            wom.order_remark,
            e1.employee_name as writer_name,
            e2.employee_name as manager_name
        FROM work_order_master wom
            LEFT JOIN employees e1 ON wom.writer_id = e1.employee_id
            LEFT JOIN employees e2 ON wom.manager_id = e2.employee_id
        WHERE wom.work_order_no = ?;`;

// 7. 작업지시서 제품 목록 조회 (공정코드 포함)
const getWorkOrderProducts = `SELECT 
            wop.product_code,
            wop.product_qty,
            wop.process_code,
            wop.seq_no,
            p.product_name,
            p.product_unit,
            p.product_stand,
            pc.process_name
        FROM work_order_product wop
            LEFT JOIN product p ON wop.product_code = p.product_code
            LEFT JOIN process pc ON wop.process_code = pc.process_code
        WHERE wop.work_order_no = ?
        ORDER BY wop.seq_no;`;

// 8. 작업지시서 저장 (수정됨 - 공정코드, 시작/종료예정 추가)
const saveWorkOrder = `INSERT INTO work_order_master (
            work_order_no, plan_id, writer_id, write_date,
            manager_id, start_date, end_date, order_remark
        ) VALUES (?, ?, ?, NOW(), ?, ?, ?, ?)
        ON DUPLICATE KEY UPDATE
            plan_id = VALUES(plan_id),
            writer_id = VALUES(writer_id),
            write_date = VALUES(write_date),
            manager_id = VALUES(manager_id),
            start_date = VALUES(start_date),
            end_date = VALUES(end_date),
            order_remark = VALUES(order_remark);`;

// 9. 제품 정보 저장 (기존 삭제 후 재입력)
const deleteWorkOrderProducts = `DELETE FROM work_order_product WHERE work_order_no = ?;`;

const insertWorkOrderProduct = `INSERT INTO work_order_product (
            work_order_no, product_code, product_qty, process_code, seq_no
        ) VALUES (?, ?, ?, ?, ?);`;

// 10. 작업지시서 목록 조회 (불러오기용)
const getWorkOrderList = `SELECT 
            work_order_no, plan_id, write_date,
            start_date, end_date, order_remark
        FROM work_order_master 
        WHERE (? = '' OR work_order_no LIKE CONCAT('%', ?, '%')
                     OR order_remark LIKE CONCAT('%', ?, '%'))
        ORDER BY write_date DESC, work_order_no DESC;`;

// 모든 쿼리 객체 내보내기
module.exports = {
  searchEmployees,
  searchProducts,
  searchWorkOrders,
  searchPlans,
  getPlanInfo,
  getWorkOrderInfo,
  getWorkOrderProducts,
  saveWorkOrder,
  deleteWorkOrderProducts,
  insertWorkOrderProduct,
  getWorkOrderList
};