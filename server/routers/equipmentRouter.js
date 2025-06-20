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
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: fileFilter
});
// ===== Multer 설정 끝 =====

router.get('/inquiry', async (req, res) => {
  try {
    const list = await equipmentService.getEquipmentListForInquiry();
    res.json({ isSuccessed: true, data: list });
  } catch (err) {
    console.error('설비 조회 페이지용 목록 조회 실패:', err);
    res.status(500).json({ isSuccessed: false, message: '설비 목록 조회 실패' });
  }
});

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

// 설비 상세 조회 (조회용)
router.get('/:id/detail', async (req, res) => {
  try {
    console.log('요청된 설비 ID:', req.params.id);
    const equipment = await equipmentService.getEquipmentDetail(req.params.id);
    console.log('서비스에서 반환된 데이터:', equipment); 
    
    if (!equipment) {
      return res.status(404).json({ isSuccessed: false, message: '설비를 찾을 수 없습니다.' });
    }
    res.json({ isSuccessed: true, data: equipment });
  } catch (err) {
    console.error('설비 상세 조회 실패:', err);
    res.status(500).json({ isSuccessed: false, message: '설비 상세 조회 실패' });
  }
});

// 설비 단일 삭제
router.delete('/:id', async (req, res) => {
  try {
    const result = await equipmentService.deleteEquipment(req.params.id);
    res.json({
      isSuccessed: true,
      message: '설비와 관련 데이터가 성공적으로 삭제되었습니다.',
      result
    });
  } catch (err) {
    console.error('설비 삭제 실패:', err);
    let errorMessage = '설비 삭제 실패';
    if (err.message.includes('찾을 수 없습니다')) {
      errorMessage = '삭제할 설비를 찾을 수 없습니다.';
    } else if (err.message.includes('foreign key')) {
      errorMessage = '설비에 연결된 데이터가 있어 삭제할 수 없습니다.';
    }
    res.status(500).json({ isSuccessed: false, message: errorMessage, error: err.message });
  }
});

// 설비 다중 삭제
router.post('/delete', async (req, res) => {
  const { eq_ids } = req.body;

  if (!Array.isArray(eq_ids) || eq_ids.length === 0) {
    return res.status(400).json({
      isSuccessed: false,
      message: '삭제할 설비 ID가 없습니다.'
    });
  }

  try {
    const result = await equipmentService.deleteMultipleEquipments(eq_ids);
    res.json({
      isSuccessed: true,
      message: `${result.deletedCount}개 설비와 관련 데이터가 삭제되었습니다.`,
      result
    });
  } catch (err) {
    console.error('설비 다중 삭제 오류:', err);
    res.status(500).json({
      isSuccessed: false,
      message: '설비 삭제 중 오류가 발생했습니다.',
      error: err.message
    });
  }
});

// 설비 상세 조회 (수정용) - 순서 중요!
router.get('/:id', async (req, res) => {
  try {
    const equipment = await equipmentService.getEquipmentOnly(req.params.id)
    if (!equipment) {
      return res.status(404).json({ isSuccessed: false, message: '설비를 찾을 수 없습니다.' })
    }
    res.json({ isSuccessed: true, data: equipment })
  } catch (err) {
    console.error('단일 설비 조회 실패:', err)
    res.status(500).json({ isSuccessed: false, message: '단일 설비 조회 실패' })
  }
})

// 설비 수정
router.put('/:id', upload.single('image'), async (req, res) => {
  console.log('=== PUT 요청 받음 ===');
  console.log('ID:', req.params.id);
  console.log('Body:', req.body);
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

    const imageFilename = req.file ? req.file.filename : req.body.existingImage || null;

    // 수정 시 등록일은 현재 날짜로 자동 설정
    const updatedData = {
      ...req.body,
      eq_image: imageFilename,
      registerDate: new Date().toISOString().slice(0, 10),
    };

    const result = await equipmentService.equipmentUpdate(req.params.id, updatedData);

    res.json({ isSuccessed: true, result });
  } catch (err) {
    console.error('설비 수정 실패:', err);
    res.status(500).json({ isSuccessed: false, message: '설비 수정 실패' });
  }
});

module.exports = router;