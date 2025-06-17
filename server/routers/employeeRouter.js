const express = require('express');
const router = express.Router();
const employeeService = require('../services/employeeService.js');

// 전체 조회
router.get('/employee', async(req, res) => {
  try {
    const employeeList = await employeeService.findAll();
    res.json(employeeList);
  } catch(err) {
    console.error(err);
    res.status(500).send('사원 목록 조회 실패');
  }
});

// 사원 단일 조회
router.get('/employee/:id', async(req, res) => {
  try {
    const id = req.params.id;
    const employee = await employeeService.findById(id);
    if(!employee) {
      res.status(404).send('사원을 찾을 수 없음!');
    } else {
      res.json(employee);
    }
  } catch(err) {
    console.error(err);
    res.status(500).send('사원을 찾을 수 없음!');
  }
});

// 사원 등록
router.post('/employee', async(req, res) => {
  try {
    const result = await employeeService.addEmployee(req.body);
    res.json({ success: true, id: result.insertId });
  } catch (err) {
    console.error(err);
    res.status(500).send('사원 등록 실패!');
  }
});

// 사원 정보 수정
router.put('/employee/:id', async(req, res) => {
  try {
    const id = req.params.id;
    const result = await employeeService.updateEmployee(id, req.body);
    res.json({ success: true, affectedRows: result.affectedRows });
  } catch(err){
    console.error(err);
    res.status(500).send('사원 수정 실패');
  }
})

// 여러 사원 정보 삭제
router.post('/employee/delete-multiple', async(req, res) => {
  try {
    const { ids } = req.body;

    if(!ids || !Array.isArray(ids) || ids.length === 0) {
      return res. status(400).json({
        success: false,
        message: '삭제할 사원을 선택하세요'
      });
    }

    const deletedIds = [];
    const failedIds = [];

    for (const id of ids) {
      try{
        const result = await employeeService.killTheEmployee(id);
        if(result.isDeleted) deletedIds.push(id);
        else failedIds.push(id);
      } catch(error) {
        if(error.code === 'ER_ROW_IS_REFERENCED_2' || error.errno === 1451){
          failedIds.push(id);
        } else {
          console.error('다중 삭제 실패: ', error);
          return res.status(500).json({
            success: false,
            message: '서버 오류로 거래처 삭제 실패',
            error: error.message
          });
        }
      }
    }

    res.json ({
      success: failedIds.length === 0,
      deletedCount: deletedIds.length,
      failedCount: failedIds.length,
      deletedIds,
      failedIds,
      message:
        failedIds.length === 0 ? `${deletedIds.length}명의 사원 정보가 삭제되었습니다.`
                               : `사용중인 사원 정보는 삭제되지 않았습니다.`
    });
  } catch(err) {
    console.error('다중 삭제 실패:', err);
    res.status(500).json({ success: false, message: '사원 정보 삭제 실패' });
  }
});

module.exports = router;