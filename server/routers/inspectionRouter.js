      const express = require('express');
      const router = express.Router();
      const inspectionService = require('../services/inspectionService.js');

      // 선택한 공정명에 대한 검사기준 리스트
      router.get('/list', async (req, res) => {
        try {
          const processInt = req.query.processInt; // 쿼리에서 공정코드 받아옴
          if (!processInt) {
            return res.status(400).json({ success: false, message: "processInt is required" });
          }
          const inspectionList = await inspectionService.selectListByProcessInt(processInt);
          res.json(inspectionList);
        } catch (err) {
          console.error(err);
          res.status(500).json({ success: false, message: "서버 오류" });
        }
      });

      // 프로세스명만 조회회
      router.get('/processList', async(req, res) => {
        const processNametList = await inspectionService.processNameList().catch((err) => console.log(err));
        res.send(processNametList);
      });

    // 검사항목 등록
    router.post('/insert', async (req, res) => {
      try {
        const inspectionData = req.body;

        // 필수값 유효성 검토 (선택)
        const requiredFields = [
          'processInt',
          'inspValueType',
          'inspUnit',
          'inspValueQty',
          'inspValueMin',
          'inspValueMax',
          'inspRemark'
        ];

        const missing = requiredFields.filter(key => !inspectionData[key] && inspectionData[key] !== 0);
        if (missing.length > 0) {
          return res.status(400).json({ success: false, message: `필수 항목 누락: ${missing.join(', ')}` });
        }

        // 등록 요청
        const result = await inspectionService.insertInspection(inspectionData);

        if (result.affectedRows === 1) {
          console.log("✅ 검사항목 등록 성공");
          res.status(200).json({ success: true, message: "등록되었습니다", data: inspectionData });
        } else {
          console.error("❌ 등록 실패 - 영향받은 행 없음");
          res.status(500).json({ success: false, message: "등록 실패" });
        }
      } catch (err) {
        console.error("❌ 등록 중 오류:", err);
        res.status(500).json({ success: false, message: "서버 오류가 발생했습니다." });
      }
    });


module.exports = router;