// 사원 전체 조회
const getEmployeesList = 
    `
      SELECT    employee_id,
                employee_name,
                position,
                hire_date,
                phone,
                email,
                address
                password,
                employment_status,
                reg_date,
                gender,
                profile_img,
                department_code,
                auth_type
      FROM      employees
      ORDER BY  employee_id
    `;

// 사원 ID로 조회
const getEmployeeById = 
    `
      SELECT    employee_id,
                employee_name,
                position,
                hire_date,
                phone,
                email,
                address
                password,
                employment_status,
                reg_date,
                gender,
                profile_img,
                department_code,
                auth_type
      FROM      employees
      WHERE     employee_id = ?
    `;


// 사원 등록
const addEmployee =
    `
      INSERT INTO employees (employee_name,
                             department_code,
                             position,
                             hire_date,
                             phone,
                             email,
                             employment_status)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `;


// 사원 수정
const updateEmployee =
    `
      UPDATE employees SET
        employee_name = ?,
        department_code =?,
        position =?,
        hire_date =?,
        phone =?,
        email =?,
        employment_status =?       
      WHERE employee_id = ?
    `;


// 사원 삭제
const deleteEmployee =
    `
      DELETE FROM employees WHERE employee_id = ?
    `;

module.exports = {
  getEmployeesList,
  getEmployeeById,
  addEmployee,
  updateEmployee,
  deleteEmployee
};