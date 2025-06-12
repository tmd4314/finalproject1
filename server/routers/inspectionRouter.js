const express = require('express');
const router = express.Router();
const inspectionService = require('../services/inspectionService.js');

// 전체 리스트 조회
router.get('/list', async(req, res) => {
  const inspectionList = await inspectionService.selectAll().catch((err) => console.log(err));
  res.send(inspectionList);
});

router.post('/insert',async(req, res) => {
  try {
    const insertInspection = req.body;
    const result = await inspectionService.insertOne(insertInspection);

    if(result.duplicate) {
      return res.status(400).json({ success: false, message: "중복된 항목코드를 입력하였습니다"});
    }

    if(result.affectedRows === 1) {
      console.log("검사항목 등록 성공");
      res.status(200).json({ success: true, data: insertInspection });
    } else {
      res.status(500).json({ success: false, message: "등록실패"});
    }
  } catch (err) {
    console.log("검사항목 등록실패;");

    return res.status(500).json({ success: false, message: "서버 오류가 발생했습니다." });
  }
});

router.post('/update', async (req, res) => {
  try{
    const updatedInspection = req.body;
    const result = await inspectionService.updateOne(updatedInspection);

    if (result.affectedRows === 1) {
      console.log("검사항목 수정 성공");
      res.status(200).json({ success: true, data:updatedInspection});
    } else {
      console.log("수정 대상 없음");
      res.status(404).json({ success: false, message: "수정할 데이터가 없습니다."});
    }
  } catch (err) {
    console.log("검사항목 수정 실패", err);
    res.status(500).json({ success: false, message: "서버 오류 발생"})
  }
});

//단일삭제
router.delete('/:id', async (req, res) => {
  try{
    const result = await inspectionService.deleteInspection(req.params.id);

    if(result.affectedRows === 1) {
      console.log("검사항목 삭제 성공");
      res.status(200).json({ success: true });
    } else {
      cres.status(500).json({ success: false, message: "삭제실패"});
    }
  } catch(err) {
    console.log("검사항목 삭제 실패", err);
  }
});

module.exports = router;