const express =require('express');
 // Express의 Router 모듈을 사용해서 라우팅 등록, 라우팅을 별도 파일로 관리
const router =express.Router();
 // 해당 라우터를 통해 제공할 서비스를 가져옴
const productService =require('../services/product_service.js');
 // 라우팅  = 사용자의 요청(URL+METHOD) + Service + 응답형태(View or Data)

 router.get('/product', async(req, res)=>{
  let productList = await productService.findAll()
                                        .catch(err => console.log(err));
  res.send(productList);
 });

 router.post('/product', async(req, res) => {
  let ProductInfo = req.body;
  let result = await productService.addProduct(ProductInfo)
                                   . catch(err => console.log(err));
  res.send(result);

})

router.put('/product/:product_code', async(req, res)=>{
  let productCode = req.params.product_code;
  let ProductInfo = req.body;

  let result = await productService.updateProductInfo(productCode, ProductInfo)
                                   .catch(err => console.log(err));
  res.send(result);
})

// 삭제    : 자원(데이터) -> books / 삭제 -> DELETE
 router.delete('/product/:product_code', async(req, res)=>{
    let productCode =req.params.product_code;
    let resInfo =await productService.removeProductInfo(productCode)
                                     .catch(err =>console.log(err));
    res.send(resInfo);
 })

  
// 실제 라우팅 등록 영역
// 해당 javascript 파일의 마지막 코드, 모듈화
// 위에 선언한 기능(변수, 함수 등)들 중 외부로 노출할 대상을 설정 
// => 다른 파일에서 require()을 통해 가져옴
module.exports =router