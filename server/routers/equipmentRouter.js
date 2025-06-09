// server/routers/equipmentRouter.js

const express = require('express');
const router = express.Router();
const equipmentService = require('../services/equipmentService');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ===== Multer 설정 시작 =====
// 업로드 디렉토리 생성
const uploadDir = 'uploads/equipment';
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer 저장소 설정
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

// 파일 필터 (이미지만 허용)
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

// Multer 인스턴스 생성
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB 제한
  fileFilter: fileFilter
});
// ===== Multer 설정 끝 =====

// GET /uploads/equipment/:filename - 이미지 파일 서빙 (라우터 방식 유지)
router.get('/uploads/equipment/:filename', (req, res) => {
  const filename = req.params.filename;
  const imagePath = path.join(process.cwd(), 'uploads', 'equipment', filename);
  
  // 파일 존재 여부 확인
  if (fs.existsSync(imagePath)) {
    res.sendFile(imagePath);
  } else {
    res.status(404).json({ message: '이미지를 찾을 수 없습니다.' });
  }
});

// POST /equipments - 설비 등록
router.post('/', upload.single('image'), async (req, res) => {
  try {
    console.log('=== 설비 등록 요청 ===');
    console.log('req.body:', req.body);
    console.log('req.file:', req.file);

    // 필수 필드 검증
    const requiredFields = ['name', 'category', 'type', 'installType', 
                          'factory', 'floor', 'room', 'manufactureDate',
                          'maker', 'model', 'serial', 'power', 
                          'maxRuntime', 'maintenanceCycle'];
    
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ 
          isSuccessed: false, 
          message: `${field}는 필수 입력 항목입니다.` 
        });
      }
    }

    // 포장설비인데 라인이 없는 경우
    if (req.body.category === 'e3' && !req.body.line) {
      return res.status(400).json({ 
        isSuccessed: false, 
        message: '포장설비는 라인을 선택해야 합니다.' 
      });
    }

    const result = await equipmentService.insertEquipment(req.body, req.file);
    res.json({ isSuccessed: true, result });
  } catch (err) {
    console.error('설비 등록 실패:', err);
    res.status(500).json({ isSuccessed: false, message: '설비 등록 실패' });
  }
});

// GET /equipments - 설비 목록 조회
router.get('/', async (req, res) => {
  try {
    const list = await equipmentService.getEquipmentList();
    res.json({ isSuccessed: true, data: list });
  } catch (err) {
    console.error('설비 목록 조회 실패:', err);
    res.status(500).json({ isSuccessed: false, message: '설비 목록 조회 실패' });
  }
});

// GET /equipments/:id - 설비 상세 조회
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

// PUT /equipments/:id - 설비 수정
router.put('/:id', upload.single('image'), async (req, res) => {
  try {
    console.log('=== 설비 수정 요청 ===');
    console.log('req.params.id:', req.params.id);
    console.log('req.body:', req.body);
    console.log('req.file:', req.file);

    // 필수 필드 검증
    const requiredFields = ['name', 'category', 'type', 'installType', 
                          'factory', 'floor', 'room', 'manufactureDate',
                          'maker', 'model', 'serial', 'power', 
                          'maxRuntime', 'maintenanceCycle'];
    
    for (const field of requiredFields) {
      if (!req.body[field]) {
        return res.status(400).json({ 
          isSuccessed: false, 
          message: `${field}는 필수 입력 항목입니다.` 
        });
      }
    }

    // 포장설비인데 라인이 없는 경우
    if (req.body.category === 'e3' && !req.body.line) {
      return res.status(400).json({ 
        isSuccessed: false, 
        message: '포장설비는 라인을 선택해야 합니다.' 
      });
    }

    const result = await equipmentService.updateEquipment(req.params.id, req.body, req.file);
    res.json({ isSuccessed: true, result });
  } catch (err) {
    console.error('설비 수정 실패:', err);
    res.status(500).json({ isSuccessed: false, message: '설비 수정 실패' });
  }
});

// DELETE /equipments/:id - 설비 삭제
router.delete('/:id', async (req, res) => {
  try {
    const result = await equipmentService.deleteEquipment(req.params.id);
    res.json({ isSuccessed: true, result });
  } catch (err) {
    console.error('설비 삭제 실패:', err);
    res.status(500).json({ isSuccessed: false, message: '설비 삭제 실패' });
  }
});

module.exports = router;