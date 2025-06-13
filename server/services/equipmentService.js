// server/services/equipmentService.js
const mariadb = require('../database/mapper');
const fs = require('fs').promises;
const path = require('path');

// BigInt 및 Date 변환 유틸리티 함수
const convertBigIntToString = (obj) => {
  if (obj === null || obj === undefined) return obj;
  if (typeof obj === 'bigint') return obj.toString();
  if (Array.isArray(obj)) return obj.map(convertBigIntToString);
  if (typeof obj === 'object') {
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      converted[key] = convertBigIntToString(value);
    }
    return converted;
  }
  return obj;
};

const convertDates = (obj) => {
  if (!obj) return obj;
  if (Array.isArray(obj)) return obj.map(convertDates);
  if (typeof obj === 'object') {
    const converted = {};
    for (const [key, value] of Object.entries(obj)) {
      if (key.includes('date') && value instanceof Date) {
        converted[key] = value.toISOString().split('T')[0];
      } else {
        converted[key] = convertDates(value);
      }
    }
    return converted;
  }
  return obj;
};

const convertData = (obj) => convertDates(convertBigIntToString(obj));

// 설비 기본명에서 자동 번호 부여 함수
const generateEquipmentName = async (baseName) => {
  // 동일한 기본명으로 시작하는 설비 수 조회
  const [countRow] = await mariadb.query('countSameNameEquipments', [`${baseName}%`]);
  
  // 새로운 설비명 생성 (기존 개수 + 1)
  return `${baseName}${Number(countRow.count) + 1}`;
};

const insertEquipment = async (formData, file) => {
  const finalName = await generateEquipmentName(formData.name); // formData.name에는 설비 기본명이 들어옴
  const imageFileName = file?.filename || null;
  const lineId = formData.category === 'e3' ? formData.line : null;
  const manufactureDate = formData.manufactureDate ? new Date(formData.manufactureDate).toISOString().split('T')[0] : null;
  const registerDate = formData.registerDate ? new Date(formData.registerDate).toISOString().split('T')[0] : new Date().toISOString().split('T')[0];

  const values = [
    finalName, 
    formData.category, 
    formData.type, 
    formData.installType, 
    formData.factory,
    formData.floor, 
    formData.room, 
    manufactureDate, 
    registerDate,
    formData.maker, 
    formData.model, 
    formData.serial, 
    formData.power,
    parseInt(formData.maxRuntime) || 0,
    parseInt(formData.maintenanceCycle) || 0,
    formData.note || null,
    imageFileName,
    lineId,
    's2'
  ];

  const result = await mariadb.query('insertEquipment', values);
  return convertData({ insertId: result.insertId, name: finalName, imageFileName });
};

const getEquipmentList = async () => {
  const list = await mariadb.query('selectEquipmentList');
  return convertData(list);
};

const getEquipmentDetail = async (equipmentId) => {
  const [equipment] = await mariadb.query('selectEquipmentDetail', [equipmentId]);
  return convertData(equipment);
};

const updateEquipment = async (equipmentId, formData) => {
  const [existing] = await mariadb.query('selectEquipmentDetail', [equipmentId]);
  if (!existing) throw new Error('수정할 설비를 찾을 수 없습니다.');

  let imageFileName = existing.eq_image;
  if (formData.eq_image && formData.eq_image !== existing.eq_image) {
    try {
      if (existing.eq_image) {
        await fs.unlink(path.join(process.cwd(), 'uploads', 'equipment', existing.eq_image));
      }
    } catch {}
    imageFileName = formData.eq_image;
  }

  // 수정 시에도 설비명에 자동 번호 부여 (설비 기본명이 변경된 경우만)
  let finalName = existing.eq_name;
  const existingBaseName = existing.eq_name.replace(/\d+$/, '');
  if (formData.name !== existingBaseName) {
    finalName = await generateEquipmentName(formData.name);
  }
  
  const lineId = formData.category === 'e3' ? formData.line : null;
  const manufactureDate = formData.manufactureDate ? new Date(formData.manufactureDate).toISOString().split('T')[0] : null;
  const registerDate = new Date().toISOString().split('T')[0];

  const values = [
    finalName, 
    formData.category, 
    formData.type, 
    formData.installType,
    formData.factory, 
    formData.floor, 
    formData.room, 
    lineId,
    manufactureDate, 
    registerDate, 
    formData.maker, 
    formData.model,
    formData.serial, 
    formData.power, 
    parseInt(formData.maxRuntime) || 0,
    parseInt(formData.maintenanceCycle) || 0, 
    formData.note || null,
    imageFileName, 
    equipmentId
  ];

  const result = await mariadb.query('updateEquipment', values);
  return convertData({ ...result, imageFileName, name: finalName });
};

const deleteEquipmentWithRelatedData = async (equipmentId) => {
  const [equipment] = await mariadb.query('selectEquipmentDetail', [equipmentId]);
  if (!equipment) throw new Error('삭제할 설비를 찾을 수 없습니다.');

  await mariadb.query('deleteInspectPartResultByEquipment', [equipmentId]);
  await mariadb.query('deleteCleaningPartResultByEquipment', [equipmentId]);
  await mariadb.query('deleteCleaningChemicalLogByEquipment', [equipmentId]);
  await mariadb.query('deleteEquipmentInspectionLog', [equipmentId]);
  await mariadb.query('deleteEquipmentCleaningLog', [equipmentId]);
  await mariadb.query('deleteEquipmentStopLog', [equipmentId]);
  await mariadb.query('deleteEquipmentMaintenanceStatus', [equipmentId]);
  const result = await mariadb.query('deleteEquipment', [equipmentId]);

  if (equipment.eq_image) {
    try {
      await fs.unlink(path.join(process.cwd(), 'uploads', 'equipment', equipment.eq_image));
    } catch {}
  }

  return convertData({ affectedRows: result.affectedRows, equipmentId });
};

const deleteEquipment = async (equipmentId) => {
  return await deleteEquipmentWithRelatedData(equipmentId);
};

const deleteMultipleEquipments = async (equipmentIds) => {
  if (!Array.isArray(equipmentIds) || equipmentIds.length === 0) throw new Error('삭제할 설비 ID 배열이 비어있습니다.');

  await mariadb.query('deleteInspectPartResultByEqIds', [equipmentIds]);
  await mariadb.query('deleteCleaningPartResultByEqIds', [equipmentIds]);
  await mariadb.query('deleteCleaningChemicalLogByEqIds', [equipmentIds]);
  await mariadb.query('deleteEquipmentInspectionLogByEqIds', [equipmentIds]);
  await mariadb.query('deleteEquipmentCleaningLogByEqIds', [equipmentIds]);
  await mariadb.query('deleteEquipmentStopLogByEqIds', [equipmentIds]);
  await mariadb.query('deleteEquipmentMaintenanceStatusByEqIds', [equipmentIds]);
  const result = await mariadb.query('deleteMultipleEquipments', [equipmentIds]);

  return convertData({ deletedCount: result.affectedRows, totalCount: equipmentIds.length });
};

const rawQuery = async (sql, params = []) => {
  const result = await mariadb.query(sql, params);
  return convertData(result);
};

module.exports = {
  insertEquipment,
  getEquipmentList,
  getEquipmentDetail,
  updateEquipment,
  deleteEquipment,
  deleteMultipleEquipments,
  rawQuery
};