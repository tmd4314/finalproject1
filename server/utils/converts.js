const convertObjToAry =(target, selected) =>{
    // target   : 값을 들고 있는 객체
    // selected : 배열로 변환할 때 가져올 객체의 필드명들을 가짐
    let aray =[];
    for(let fieldName of selected){
        // Object['필드명'] or Object[변수]: 대괄호표기법을 활용해 변수로 필드명을 전달
        let fieldVal = target[fieldName];
        aray.push(fieldVal);
    }
    return aray;
 };
 module.exports ={
    convertObjToAry
 }