// server/services/equipmentService.js

const mariadb = require('../database/mapper');
const fs = require('fs').promises;
const path = require('path');

// BigInt 및 Date 변환 유틸리티 함수
const convertBigIntToString = (obj) => {
  if (obj === null || obj === undefined) return obj;
  
  if (typeof obj === 'bigint') {
    return obj.toString();
  }
  
  if (Array.isArray(obj)) {
    return obj.map(convertBigIntToString);
  }
  
  if (typeof obj === 'object') {
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertBigIntToString(value);
    }
    return converted;
  }
  
  return obj;
};

// 날짜 변환 유틸리티 함수
const convertDates = (obj) => {
  if (obj === null || obj === undefined) return obj;
  
  if (Array.isArray(obj)) {
    return obj.map(convertDates);
  }
  
  if (typeof obj === 'object') {
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      // 날짜 필드인 경우 특별 처리
      if (key.includes('date') && value instanceof Date) {
        // Date 객체를 YYYY-MM-DD 형식 문자열로 변환
        converted[key] = value.toISOString().split('T')[0];
      } else if (key.includes('date') && value && typeof value === 'object' && !(value instanceof Date)) {
        // MariaDB에서 오는 날짜 객체 처리
        try {
          const dateStr = Object.prototype.toString.call(value);
          if (dateStr === '[object Object]' && Object.keys(value).length === 0) {
            // 빈 객체인 경우 null로 처리
            converted[key] = null;
          } else {
            // 다른 형태의 날짜 객체 처리 시도
            const dateValue = new Date(value);
            if (!isNaN(dateValue.getTime())) {
              converted[key] = dateValue.toISOString().split('T')[0];
            } else {
              converted[key] = null;
            }
          }
        } catch (e) {
          console.warn(`날짜 변환 실패 for ${key}:`, value);
          converted[key] = null;
        }
      } else {
        converted[key] = convertDates(value);
      }
    }
    return converted;
  }
  
  return obj;
};

// 전체 변환 함수
const convertData = (obj) => {
  return convertDates(convertBigIntToString(obj));
};

// 설비 등록
const insertEquipment = async (formData, file) => {
  console.log('=== insertEquipment 시작 ===');
  console.log('formData:', formData);
  console.log('업로드된 파일:', file);

  try {
    // 1. 설비명 자동번호 생성
    const baseName = formData.name.replace(/\d+$/, '');
    const likePattern = `${baseName}%`;
    const [countRow] = await mariadb.query('countSameNameEquipments', [likePattern]);
    const count = Number(countRow.count) + 1;
    const finalName = `${baseName}${count}`;
    
    console.log('생성된 설비명:', finalName);

    // 2. 이미지 URL 처리
    let imageUrl = null;
    if (file && file.filename) {
      imageUrl = `/uploads/equipment/${file.filename}`;
      console.log('생성된 이미지 URL:', imageUrl);
    } else {
      console.log('업로드된 파일이 없습니다.');
    }

    // 3. line_id 처리 (포장설비인 경우만)
    const lineId = formData.category === 'e3' && formData.line ? formData.line : null;
    console.log('라인 ID:', lineId);

    // 4. 날짜 형식 변환
    const manufactureDate = formData.manufactureDate 
      ? new Date(formData.manufactureDate).toISOString().split('T')[0] 
      : null;
    const registerDate = formData.registerDate 
      ? new Date(formData.registerDate).toISOString().split('T')[0] 
      : new Date().toISOString().split('T')[0]; // 기본값: 오늘 날짜

    console.log('제조일:', manufactureDate);
    console.log('등록일:', registerDate);

    // 5. INSERT용 데이터 준비
    const values = [
      finalName,                          // eq_name
      formData.category,                  // eq_group_code
      formData.type,                      // eq_type_code
      formData.installType,               // eq_import_code
      formData.factory,                   // factory_code
      formData.floor,                     // floor_code
      formData.room,                      // room_code
      manufactureDate,                    // eq_manufacture_date
      registerDate,                       // eq_registration_date
      formData.maker,                     // eq_manufacturer
      formData.model,                     // eq_model
      formData.serial,                    // eq_serial_no
      formData.power,                     // eq_rated_power
      parseInt(formData.maxRuntime) || 0, // eq_max_runtime
      parseInt(formData.maintenanceCycle) || 0, // eq_maintenance_cycle
      formData.note || null,              // eq_note
      imageUrl,                           // eq_image_url
      lineId,                             // line_id
      's2'                                // eq_run_code (기본: 정상)
    ];

    console.log('DB INSERT용 values:', values);

    // 6. DB INSERT 실행
    const result = await mariadb.query('insertEquipment', values);
    
    console.log('DB INSERT 결과:', result);
    
    return convertData({ 
      insertId: result.insertId,
      name: finalName,
      imageUrl: imageUrl
    });

  } catch (error) {
    console.error('insertEquipment 에러:', error);
    // 에러 발생 시 업로드된 파일 삭제
    if (file && file.path) {
      try {
        await fs.unlink(file.path);
        console.log('에러로 인한 파일 삭제 완료:', file.path);
      } catch (unlinkError) {
        console.error('파일 삭제 실패:', unlinkError);
      }
    }
    throw error;
  }
};

// 설비 목록 조회
const getEquipmentList = async () => {
  try {
    const list = await mariadb.query('selectEquipmentList');
    console.log(`설비 목록 조회 완료: ${list.length}개`);
    
    // 날짜 필드 디버깅
    if (list.length > 0) {
      console.log('=== 날짜 필드 디버깅 ===');
      console.log('첫 번째 항목의 날짜 필드들:');
      console.log('eq_manufacture_date:', list[0].eq_manufacture_date);
      console.log('eq_registration_date:', list[0].eq_registration_date);
      console.log('날짜 필드 타입들:');
      console.log('eq_manufacture_date type:', typeof list[0].eq_manufacture_date);
      console.log('eq_registration_date type:', typeof list[0].eq_registration_date);
    }
    
    // 전체 리스트의 변환
    return convertData(list);
  } catch (error) {
    console.error('getEquipmentList 에러:', error);
    throw error;
  }
};

// 설비 상세 조회
const getEquipmentDetail = async (equipmentId) => {
  try {
    const [equipment] = await mariadb.query('selectEquipmentDetail', [equipmentId]);
    console.log('설비 상세 조회:', equipment ? '성공' : '데이터 없음');
    
    if (equipment) {
      console.log('=== 상세 조회 날짜 디버깅 ===');
      console.log('eq_manufacture_date:', equipment.eq_manufacture_date);
      console.log('eq_registration_date:', equipment.eq_registration_date);
    }
    
    return convertData(equipment);
  } catch (error) {
    console.error('getEquipmentDetail 에러:', error);
    throw error;
  }
};

// 설비 수정
const updateEquipment = async (equipmentId, formData, file) => {
  console.log('=== updateEquipment 시작 ===');
  console.log('equipmentId:', equipmentId);
  console.log('formData:', formData);
  console.log('업로드된 파일:', file);

  try {
    // 기존 설비 정보 조회
    const [existing] = await mariadb.query('selectEquipmentDetail', [equipmentId]);
    if (!existing) {
      throw new Error('수정할 설비를 찾을 수 없습니다.');
    }

    // 이미지 처리
    let imageUrl = existing.eq_image_url;
    if (file && file.filename) {
      // 기존 이미지 삭제
      if (existing.eq_image_url) {
        const oldImagePath = path.join(process.cwd(), existing.eq_image_url);
        try {
          await fs.unlink(oldImagePath);
          console.log('기존 이미지 삭제 완료:', oldImagePath);
        } catch (err) {
          console.log('기존 이미지 삭제 실패 (파일이 없거나 권한 문제):', err.message);
        }
      }
      imageUrl = `/uploads/equipment/${file.filename}`;
      console.log('새 이미지 URL:', imageUrl);
    }

    // line_id 처리
    const lineId = formData.category === 'e3' && formData.line ? formData.line : null;

    // 날짜 형식 변환
    const manufactureDate = formData.manufactureDate 
      ? new Date(formData.manufactureDate).toISOString().split('T')[0] 
      : null;

    // UPDATE용 데이터 준비
    const values = [
      formData.name,                      // eq_name
      formData.category,                  // eq_group_code
      formData.type,                      // eq_type_code
      formData.installType,               // eq_import_code
      formData.factory,                   // factory_code
      formData.floor,                     // floor_code
      formData.room,                      // room_code
      lineId,                             // line_id
      manufactureDate,                    // eq_manufacture_date
      formData.maker,                     // eq_manufacturer
      formData.model,                     // eq_model
      formData.serial,                    // eq_serial_no
      formData.power,                     // eq_rated_power
      parseInt(formData.maxRuntime) || 0, // eq_max_runtime
      parseInt(formData.maintenanceCycle) || 0, // eq_maintenance_cycle
      formData.note || null,              // eq_note
      imageUrl,                           // eq_image_url
      equipmentId                         // WHERE 조건
    ];

    console.log('DB UPDATE용 values:', values);

    const result = await mariadb.query('updateEquipment', values);
    
    console.log('DB UPDATE 결과:', result);
    
    return convertData({
      ...result,
      imageUrl: imageUrl
    });

  } catch (error) {
    console.error('updateEquipment 에러:', error);
    // 에러 발생 시 새로 업로드된 파일 삭제
    if (file && file.path) {
      try {
        await fs.unlink(file.path);
        console.log('에러로 인한 새 파일 삭제 완료:', file.path);
      } catch (unlinkError) {
        console.error('새 파일 삭제 실패:', unlinkError);
      }
    }
    throw error;
  }
};

// 설비 삭제
const deleteEquipment = async (equipmentId) => {
  console.log('=== deleteEquipment 시작 ===');
  console.log('equipmentId:', equipmentId);

  try {
    // 설비 정보 조회 (이미지 삭제를 위해)
    const [equipment] = await mariadb.query('selectEquipmentDetail', [equipmentId]);
    
    if (equipment && equipment.eq_image_url) {
      // 이미지 파일 삭제
      const imagePath = path.join(process.cwd(), equipment.eq_image_url);
      try {
        await fs.unlink(imagePath);
        console.log('이미지 삭제 완료:', imagePath);
      } catch (err) {
        console.log('이미지 삭제 실패 (파일이 없거나 권한 문제):', err.message);
      }
    }
    
    // DB에서 설비 삭제
    const result = await mariadb.query('deleteEquipment', [equipmentId]);
    
    console.log('DB DELETE 결과:', result);
    
    return convertData(result);

  } catch (error) {
    console.error('deleteEquipment 에러:', error);
    throw error;
  }
};

module.exports = {
  insertEquipment,
  getEquipmentList,
  getEquipmentDetail,
  updateEquipment,
  deleteEquipment
};