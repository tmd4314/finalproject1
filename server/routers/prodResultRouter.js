const express = require('express');
const router = express.Router();
const prodResultService = require('../services/prodResultService.js');

// [GET] /prodPlan/products/search - 제품 검색 (모달용)
router.get('/prodResult/:result_id', async (req, res) => {
    const resultId = req.params.result_id;
    let resultList = await prodResultService.searchResult(resultId)
                                           .catch(err => console.log(err));
     res.send(resultList);
});

router.post('/prodResult', async (req, res) => {
  try {
    const { products } = req.body;

    // console.log(products);

    const result = await prodResultService.saveWorkResult({
      products: products || []
    });
    
    res.status(201).json(result);
  } catch (err) {
    console.error('작업실적 저장 오류:', err);
    res.status(500).json({ error: err.message });
  }
});


module.exports = router;