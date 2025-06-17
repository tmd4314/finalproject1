// server/routers/productInboundRouter.js - 제품 입고 관리 라우터

const express = require('express');
const router = express.Router();
const productInboundService = require('../services/productInboundService');

// ========== 조회 API ==========

// [GET] /productInbound/waiting-list - 입고 대기 목록 조회
router.get('/waiting-list', async (req, res) => {
  try {
    console.log('=== 입고 대기 목록 조회 API 호출 ===');
    
    const result = await productInboundService.getInboundWaitingList();
    
    console.log(`조회 결과: ${result.length}건`);
    res.json(result);
  } catch (err) {
    console.error('입고 대기 목록 조회 API 오류:', err);
    res.status(500).json({ 
      error: '입고 대기 목록 조회에 실패했습니다.',
      details: err.message 
    });
  }
});

// [GET] /productInbound/generate-lot - LOT 번호 자동 생성 (더 이상 사용하지 않음)
// router.get('/generate-lot', async (req, res) => {
//   try {
//     console.log('=== LOT 번호 생성 API 호출 ===');
//     
//     const lotNumber = await productInboundService.generateLotNumber();
//     
//     console.log('생성된 LOT 번호:', lotNumber);
//     res.json({ 
//       success: true,
//       lot_number: lotNumber 
//     });
//   } catch (err) {
//     console.error('LOT 번호 생성 API 오류:', err);
//     res.status(500).json({ 
//       error: 'LOT 번호 생성에 실패했습니다.',
//       details: err.message 
//     });
//   }
// });

// [GET] /productInbound/history - 입고 이력 조회
router.get('/history', async (req, res) => {
  try {
    console.log('=== 입고 이력 조회 API 호출 ===');
    
    const {
      lot_num = '',
      product_name = '',
      start_date = '',
      end_date = ''
    } = req.query;

    const searchParams = {
      lot_num,
      product_name,
      start_date,
      end_date
    };

    console.log('검색 파라미터:', searchParams);

    const result = await productInboundService.getInboundHistory(searchParams);
    
    console.log(`조회 결과: ${result.length}건`);
    res.json(result);
  } catch (err) {
    console.error('입고 이력 조회 API 오류:', err);
    res.status(500).json({ 
      error: '입고 이력 조회에 실패했습니다.',
      details: err.message 
    });
  }
});

// [GET] /productInbound/status/:resultId/:productCode - 입고 상태 확인
router.get('/status/:resultId/:productCode', async (req, res) => {
  try {
    console.log('=== 입고 상태 확인 API 호출 ===');
    
    const { resultId, productCode } = req.params;
    
    console.log(`확인 대상 - result_id: ${resultId}, product_code: ${productCode}`);
    
    const status = await productInboundService.checkInboundStatus(resultId, productCode);
    
    res.json({ 
      success: true,
      result_id: resultId,
      product_code: productCode,
      inbound_status: status 
    });
  } catch (err) {
    console.error('입고 상태 확인 API 오류:', err);
    res.status(500).json({ 
      error: '입고 상태 확인에 실패했습니다.',
      details: err.message 
    });
  }
});

// ========== 처리 API ==========

// [POST] /productInbound/process - 단일 제품 입고 처리
router.post('/process', async (req, res) => {
  try {
    console.log('=== 단일 제품 입고 처리 API 호출 ===');
    console.log('요청 데이터:', req.body);
    
    const {
      result_id,
      product_code,
      inbound_qty,
      manufacture_datetime,
      lot_number,  // 화면에서 생성된 LOT 번호
      work_order_no  // work_order_no 추가
    } = req.body;

    // 필수 필드 검증
    if (!result_id || !product_code || !inbound_qty || !manufacture_datetime || !lot_number || !work_order_no) {
      console.log('필수 필드 누락');
      return res.status(400).json({
        error: '필수 정보가 누락되었습니다.',
        required_fields: ['result_id', 'product_code', 'inbound_qty', 'manufacture_datetime', 'lot_number', 'work_order_no'],
        received: req.body
      });
    }

    // 수량 검증
    const qty = parseInt(inbound_qty);
    if (isNaN(qty) || qty <= 0) {
      console.log('유효하지 않은 수량:', inbound_qty);
      return res.status(400).json({
        error: '입고 수량은 0보다 큰 숫자여야 합니다.',
        received_qty: inbound_qty
      });
    }

    const inboundData = {
      result_id,
      product_code,
      inbound_qty: qty,
      manufacture_datetime,
      lot_number,  // 화면에서 생성된 LOT 번호
      work_order_no  // work_order_no 추가
    };

    console.log('처리할 입고 데이터:', inboundData);

    const result = await productInboundService.processInbound(inboundData);
    
    console.log('입고 처리 성공:', result);
    res.status(201).json(result);
    
  } catch (err) {
    console.error('단일 제품 입고 처리 API 오류:', err);
    
    // LOT 번호 중복 에러 처리
    if (err.code === 'DUPLICATE_LOT_NUMBER') {
      res.status(409).json({
        error: err.message,
        error_code: 'DUPLICATE_LOT_NUMBER',
        action: 'regenerate_lot_number'
      });
    } 
    // 이미 입고 처리된 제품 에러 처리
    else if (err.code === 'ALREADY_PROCESSED') {
      res.status(409).json({
        error: err.message,
        error_code: 'ALREADY_PROCESSED'
      });
    } 
    // 기타 중복 에러
    else if (err.code === 'ER_DUP_ENTRY') {
      res.status(409).json({
        error: '중복된 데이터가 있습니다.',
        details: err.message
      });
    } 
    // 입력값 에러
    else if (err.message.includes('필수 입력값')) {
      res.status(400).json({
        error: err.message
      });
    } 
    // 기타 서버 에러
    else {
      res.status(500).json({
        error: '입고 처리 중 오류가 발생했습니다.',
        details: err.message
      });
    }
  }
});


// ========== 유틸리티 API ==========

// [GET] /productInbound/test - API 연결 테스트
router.get('/test', async (req, res) => {
  try {
    console.log('=== 제품 입고 API 테스트 호출 ===');
    
    res.json({
      success: true,
      message: '제품 입고 관리 API가 정상적으로 작동합니다.',
      timestamp: new Date().toISOString(),
      available_endpoints: [
        'GET /productInbound/waiting-list',
        // 'GET /productInbound/generate-lot',  // 제거됨 - 화면에서 LOT 번호 생성
        'GET /productInbound/history',
        'GET /productInbound/status/:resultId/:productCode',
        'POST /productInbound/process',
        'POST /productInbound/process-multiple'
      ]
    });
  } catch (err) {
    console.error('API 테스트 오류:', err);
    res.status(500).json({ 
      error: 'API 테스트 실패',
      details: err.message 
    });
  }
});

module.exports = router;