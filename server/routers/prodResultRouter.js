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


module.exports = router;