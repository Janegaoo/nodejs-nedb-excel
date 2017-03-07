import Logger from './Logger';

const logger = new Logger('mockAjax');

const result = {  // 暂存mock的ajax返回, 总共有5个字段
  success: true,
  code: 0,
  message: 'just a mock ;) ',
  total: 10000,
  data: {},
};

// 模拟统一的延迟, 返回promise对象
const mockPromise = (callback) => {
  return new Promise(resolve => {
    setTimeout(callback, 2000, resolve);
  });
};

// 根据某个表的dataSchema创造mock数据
const mockResult = (tableName, queryObj) => {
  logger.debug('begin to mock data for table %s', tableName);

  // 尝试加载schema文件
  let schema;
  try {
    schema = require(`../schema/${tableName}.dataSchema.js`);
  } catch (e) {
    logger.error('can not find dataSchema file for table %s', tableName);
    // 设置返回结果为失败
    result.success = false;
    result.code = 200;
    result.message = `can not find dataSchema file for table ${tableName}`;
    return;
  }

  // 一般来说, 传入的查询条件都是肯定会有page/pageSize的, 以防万一
  if (!queryObj.page) {
    queryObj.page = 1;
  }
  if (!queryObj.pageSize) {
    queryObj.pageSize = 50;
  }

  const tmp = [];
  for (let i = 0; i < queryObj.pageSize; i++) {
    const record = {};
    // 为了让mock的数据有些区别, 把page算进去
    schema.forEach((column) => {
      // 生成mock数据还是挺麻烦的, 要判断showType和dataType
      switch (column.showType) {
        case 'select':
          record[column.key] = mockOption(column);
          break;
        case 'radio':
          record[column.key] = mockOption(column);
          break;
        case 'checkbox':
          record[column.key] = mockOptionArray(column);
          break;
        case 'multiSelect':
          record[column.key] = mockOptionArray(column);
          break;
        case 'textarea':
          record[column.key] = `mock page=${queryObj.page} ${i}`;
          break;
        default:
          switch (column.dataType) {
            case 'int':
              record[column.key] = 1000 * queryObj.page + i;
              break;
            case 'float':
              record[column.key] = new Number(2.0 * queryObj.page + i * 0.1).toFixed(2);
              break;
            case 'varchar':
              record[column.key] = `mock page=${queryObj.page} ${i}`;
              break;
            case 'datetime':
              record[column.key] = new Date().plusDays(i).format('yyyy-MM-dd HH:mm:ss');
              break;
            default:
              logger.error('unsupported dataType %s', column.dataType);
          }
      }
    });
    tmp.push(record);
  }

  result.success = true;
  result.data = tmp;
};

// 模拟radio/select的数据
const mockOption = (field) => {
  const rand = Math.floor(Math.random() * field.options.length);
  return field.options[rand].key;
};

// 模拟checkbox/multiSelect的数据
const mockOptionArray = (field) => {
  const rand = Math.floor(Math.random() * field.options.length);
  const mockResult = [];
  for (let i = 0; i <= rand; i++) {
    mockResult.push(field.options[i].key);
  }
  return mockResult;
};

/**
 * 模拟ajax请求用于调试, 一般而言只需mock业务相关方法
 */
class MockAjax {
  tableCache = new Map();

  getCurrentUser() {
    return mockPromise(resolve => {
      result.success = true;
      result.data = 'admin';
      resolve(result);
    });
  }

  login(username, password) {
    return mockPromise(resolve => {
      if (username === 'admin' && password === 'admin') {
        result.success = true;
        result.data = 'admin';
        resolve(result);
      } else {
        result.success = false;
        result.code = 100;
        result.message = 'invalid username or password';
        resolve(result);
      }
    });
  }

  CRUD(tableName) {
    if (this.tableCache.has(tableName)) {
      return this.tableCache.get(tableName);
    }

    const util = new MockCRUDUtil(tableName);
    this.tableCache.set(tableName, util);
    return util;
  }
}

class MockCRUDUtil {
  constructor(tableName) {
    this.tableName = tableName;
  }

  select(queryObj) {
    return mockPromise(resolve => {
      mockResult(this.tableName, queryObj);
      resolve(result);
    });
  }

  insert(dataObj) {
    return mockPromise(resolve => {
      mockResult(this.tableName, {page: Math.floor(Math.random() * 10000), pageSize: 1});  // 为了生成一个主键, 反正是测试用的
      const tmpObj = result.data[0];
      Object.assign(tmpObj, dataObj);
      result.success = true;
      result.data = tmpObj;
      resolve(result);
    });
  }

  update(keys = [], dataObj) {
    return mockPromise(resolve => {
      result.success = true;
      result.data = keys.length;
      resolve(result);
    });
  }

  delete(keys = []) {
    return mockPromise(resolve => {
      result.success = true;
      result.data = keys.length;
      resolve(result);
    });
  }
}

export default MockAjax;
