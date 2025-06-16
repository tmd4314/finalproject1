const express = require('express');
const router = express.Router();
const prodResultService = require('../services/prodResultService.js');

// [GET]  공정 진행도 검색 
router.get('/prodResult/:result_id', async (req, res) => {
    const resultId = req.params.result_id;
    let resultList = await prodResultService.searchResult(resultId)
                                           .catch(err => console.log(err));
     res.send(resultList);
});

// [GET]  작업지시서 검색 
router.get('/prodResult', async (req, res) => {
    let resultList = await prodResultService.searchNoResult()
                                           .catch(err => console.log(err));
     res.send(resultList);
});

// [GET]  공정흐름도 검색 
router.get('/processCheck', async (req, res) => {
    let resultList = await prodResultService.searchProcessCheck()
                                           .catch(err => console.log(err));
     res.send(resultList);
});


router.post('/prodResult', async (req, res) => {
  try {
    const { master, products } = req.body;
    
    if (!master) {
      return res.status(400).json({ 
        error: '마스터 정보가 필요합니다.' 
      });
    }

    // console.log(master);
    // console.log(products);

    const result = await prodResultService.saveWorkResult({
      master,
      products: products || []
    });
    
    res.status(201).json(result);
  } catch (err) {
    console.error('작업실적 저장 오류:', err);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;