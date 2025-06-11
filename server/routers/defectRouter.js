const express = require('express');
const router = express.Router();
const defectService = require('../services/defectService.js');

// 불량 유형 전체 조회
router.get('/list', async(req, res) => {
    const defectList = await defectService.selectAll().catch((err) => console.log(err));
    res.send(defectList);
});

// 불량 유형 insert
router.post('/insert', async(req, res) => {
    try{
        const insertDefect = req.body;
        const result = await defectService.insertOne(insertDefect);

    if(result && result.affectedRows === 1) {
        console.log("불량유형 등록완료");
        res.status(200).json({ success: true, data: insertDefect });
    } else {
        res.status(400).json({ success: false, message: '중복' });
        return;
    }
  } catch (err) { //여기 다시 수정하기
        // if (err.code === 'ER_DUP_ENTRY') { // ER_DUP_ENTRY는 중복키 오류코드
        // res.status(400).json({ success: false, message: '중복' });
        // } else {
        // console.error(err);
        // res.status(500).json({ success: false, message: '서버오류' });
        // }
  }
})

// 불량 유형 update
router.post('/update', async (req, res) => {
    try{
        const updateDefect = req.body;
        const result = await defectService.updateOne(updateDefect);

        // 등록버튼 하나로 등록,수정을 하기위해서 데이터의 변경이 존재하는지 확인하기 위한 if문

        if (result.affectedRows === 1) { // 데이터 변경이 존재하면 1, 없으면 0
            console.log("불량유형 수정 성공");
            res.status(200).json({ success: true, data: updateDefect });
        } else {
            console.log("수정 대상 없음");    
        }
    } catch (err) {
        console.log("수정오류");
    }
});

module.exports = router;