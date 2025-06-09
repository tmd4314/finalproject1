// server/routers/equipmentRouter.js

const express = require('express');
const router = express.Router();
const equipmentService = require('../services/equipmentService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ===== Multer 설정 시작 =====
const uploadDir = 'uploads/equipment';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const ext = path.extname(file.originalname);
    cb(null, `equipment-${uniqueSuffix}${ext}`);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = /jpeg|jpg|png|gif/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (mimetype && extname) {
    return cb(null, true);
  } else {
    cb(new Error('이미지 파일만 업로드 가능합니다.'));
  }
};

const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilter
});
// ===== Multer 설정 끝 =====

// 이미지 파일 서빙
router.get('/uploads/equipment/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(process.cwd(), 'uploads', 'equipment', filename);
  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    res.status(404).json({ message: '이미지를 찾을 수 없습니다.' });
  }
});

// 설비 등록
router.post('/', upload.single('image'), async (req, res) => {
  try {
    const requiredFields = ['name', 'category', 'type', 'installType', 'factory', 'floor', 'room', 'manufactureDate', 'maker', 'model', 'serial', 'power', 'maxRuntime', 'maintenanceCycle'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ isSuccessed: false, message: `${field}는 필수 입력 항목입니다.` });
      }
    }
    if (req.body.category === 'e3' && !req.body.line) {
      return res.status(400).json({ isSuccessed: false, message: '포장설비는 라인을 선택해야 합니다.' });
    }
    const result = await equipmentService.insertEquipment(req.body, req.file);
    res.json({ isSuccessed: true, result });
  } catch (err) {
    console.error('설비 등록 실패:', err);
    res.status(500).json({ isSuccessed: false, message: '설비 등록 실패' });
  }
});

// 설비 목록 조회
router.get('/', async (req, res) => {
  try {
    const list = await equipmentService.getEquipmentList();
    res.json({ isSuccessed: true, data: list });
  } catch (err) {
    console.error('설비 목록 조회 실패:', err);
    res.status(500).json({ isSuccessed: false, message: '설비 목록 조회 실패' });
  }
});

// 설비 상세 조회
router.get('/:id', async (req, res) => {
  try {
    const equipment = await equipmentService.getEquipmentDetail(req.params.id);
    if (!equipment) {
      return res.status(404).json({ isSuccessed: false, message: '설비를 찾을 수 없습니다.' });
    }
    res.json({ isSuccessed: true, data: equipment });
  } catch (err) {
    console.error('설비 상세 조회 실패:', err);
    res.status(500).json({ isSuccessed: false, message: '설비 상세 조회 실패' });
  }
});

// 설비 수정
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    const requiredFields = ['name', 'category', 'type', 'installType', 'factory', 'floor', 'room', 'manufactureDate', 'maker', 'model', 'serial', 'power', 'maxRuntime', 'maintenanceCycle'];
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ isSuccessed: false, message: `${field}는 필수 입력 항목입니다.` });
      }
    }
    if (req.body.category === 'e3' && !req.body.line) {
      return res.status(400).json({ isSuccessed: false, message: '포장설비는 라인을 선택해야 합니다.' });
    }
    const result = await equipmentService.updateEquipment(req.params.id, req.body, req.file);
    res.json({ isSuccessed: true, result });
  } catch (err) {
    console.error('설비 수정 실패:', err);
    res.status(500).json({ isSuccessed: false, message: '설비 수정 실패' });
  }
});

// 설비 단일 삭제
router.delete('/:id', async (req, res) => {
  try {
    const result = await equipmentService.deleteEquipment(req.params.id);
    res.json({ isSuccessed: true, result });
  } catch (err) {
    console.error('설비 삭제 실패:', err);
    res.status(500).json({ isSuccessed: false, message: '설비 삭제 실패' });
  }
});

// 설비 다중 삭제
router.post('/delete', async (req, res) => {
  const { eq_ids } = req.body;
  if (!Array.isArray(eq_ids) || eq_ids.length === 0) {
    return res.status(400).json({ isSuccessed: false, message: '삭제할 설비 ID가 없습니다.' });
  }
  try {
    const placeholders = eq_ids.map(() => '?').join(',');
    const sql = `DELETE FROM equipment WHERE eq_id IN (${placeholders})`;
    await equipmentService.rawQuery(sql, eq_ids);
    res.json({ isSuccessed: true });
  } catch (err) {
    console.error('설비 삭제 오류:', err);
    res.status(500).json({ isSuccessed: false, message: '설비 삭제 중 오류 발생' });
  }
});

module.exports = router;
