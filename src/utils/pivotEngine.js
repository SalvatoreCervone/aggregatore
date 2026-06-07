/**
 * Pivot Engine - Core multi-dimensional aggregation logic
 */

const KEY_SEPARATOR = '\u0000';

/**
 * Robustly parses a value into a float, cleaning typical spreadsheet / local formats
 * (e.g. "1.500,50", "€ 12.000", "50%").
 */
export function cleanAndParseNumber(val) {
  if (typeof val === 'number') return val;
  if (val === null || val === undefined) return NaN;
  
  let clean = String(val).trim().replace(/[€$\s%]/g, '');
  if (!clean) return NaN;

  const hasComma = clean.includes(',');
  const hasDot = clean.includes('.');

  if (hasComma && hasDot) {
    if (clean.indexOf(',') > clean.indexOf('.')) {
      clean = clean.replace(/,/g, '');
    } else {
      clean = clean.replace(/\./g, '').replace(',', '.');
    }
  } else if (hasComma) {
    const parts = clean.split(',');
    if (parts[1].length === 3) {
      clean = clean.replace(/,/g, '');
    } else {
      clean = clean.replace(',', '.');
    }
  } else if (hasDot) {
    const parts = clean.split('.');
    if (parts[1].length === 3) {
      clean = clean.replace(/\./g, '');
    }
  }

  return Number(clean);
}

/**
 * Helper to aggregate sort values for hierarchical paths
 */
function aggregateSortValues(vals, aggregator) {
  if (aggregator === 'count') return vals.length;
  
  const numVals = vals.map(v => cleanAndParseNumber(v)).filter(n => !isNaN(n));
  if (numVals.length > 0) {
    if (aggregator === 'sum') return numVals.reduce((a, b) => a + b, 0);
    if (aggregator === 'avg') return numVals.reduce((a, b) => a + b, 0) / numVals.length;
    if (aggregator === 'min') return Math.min(...numVals);
    if (aggregator === 'max') return Math.max(...numVals);
    if (aggregator === 'product') return numVals.reduce((a, b) => a * b, 1);
  }
  
  // String fallbacks
  if (aggregator === 'min') {
    const sorted = [...vals].sort();
    return sorted[0] || '';
  }
  if (aggregator === 'max') {
    const sorted = [...vals].sort();
    return sorted[sorted.length - 1] || '';
  }
  
  return vals[0] || '';
}

/**
 * Extracts all unique values for the given fields from data, preserving hierarchy.
 * Returns an array of paths (arrays of values).
 * 
 * @param {Array<Object>} data 
 * @param {Array<string>} fields 
 * @returns {Array<Array<any>>}
 */
export function getUniquePaths(data, fields, sorts = [], valuesConfig = []) {
  if (!fields || fields.length === 0) {
    return [[]]; // Only the grand total path
  }

  // Handle backwards compatibility for sorts being an object
  let sortsArray = [];
  if (Array.isArray(sorts)) {
    sortsArray = sorts;
  } else if (sorts && typeof sorts === 'object') {
    sortsArray = Object.entries(sorts).map(([field, cfg]) => ({
      field,
      sortBy: cfg.sortBy || field,
      sortOrder: cfg.sortOrder || 'asc'
    }));
  }

  console.log("getUniquePaths fields:", fields);
  console.log("getUniquePaths sortsArray:", JSON.stringify(sortsArray));

  const pathsSet = new Set();
  
  // We want to collect all paths, including intermediate parent paths (for subtotals)
  for (const item of data) {
    const path = [];
    for (const field of fields) {
      const val = item[field] !== undefined && item[field] !== null ? String(item[field]) : '(vuoto)';
      path.push(val);
      pathsSet.add(path.slice().join(KEY_SEPARATOR));
    }
  }

  // Convert back to arrays and sort them
  const paths = Array.from(pathsSet).map(s => s.split(KEY_SEPARATOR));
  
  // Pre-build sort maps for fields that have a sortBy configured
  const sortMaps = [];
  for (let i = 0; i < fields.length; i++) {
    const fieldName = fields[i];
    let fieldSortConfig = sortsArray.find(s => s.field === fieldName);
    if (!fieldSortConfig) {
      const externalSort = sortsArray.find(s => !fields.includes(s.field));
      if (externalSort) {
        fieldSortConfig = {
          field: fieldName,
          sortBy: externalSort.sortBy || externalSort.field,
          sortOrder: externalSort.sortOrder || 'asc'
        };
      }
    }
    const sortByField = fieldSortConfig ? fieldSortConfig.sortBy : null;
    
    const sortMap = {};
    if (sortByField) {
      // Find if there is an aggregator for this sortByField in values config.
      const valCfg = valuesConfig.find(v => v.field === sortByField);
      let aggregator = valCfg ? valCfg.aggregator : null;
      
      // Group records by their subpath prefix
      const groups = {}; // prefixKey -> array of values of sortByField
      for (const item of data) {
        const path = [];
        for (let j = 0; j <= i; j++) {
          const val = item[fields[j]] !== undefined && item[fields[j]] !== null ? String(item[fields[j]]) : '(vuoto)';
          path.push(val);
        }
        const prefixKey = path.join(KEY_SEPARATOR);
        if (!groups[prefixKey]) {
          groups[prefixKey] = [];
        }
        const sortVal = item[sortByField] !== undefined && item[sortByField] !== null ? item[sortByField] : null;
        if (sortVal !== null) {
          groups[prefixKey].push(sortVal);
        }
      }
      
      // If not configured in valuesConfig, it is a sorting key or the grouping field itself, so we default to 'min' to avoid summing
      if (!aggregator) {
        aggregator = 'min';
      }

      // Now aggregate the values for each prefix key
      for (const prefixKey in groups) {
        sortMap[prefixKey] = aggregateSortValues(groups[prefixKey], aggregator);
      }
    }
    sortMaps.push(sortMap);
  }

  // Sort paths hierarchically
  paths.sort((a, b) => {
    const minLen = Math.min(a.length, b.length);
    for (let i = 0; i < minLen; i++) {
      if (a[i] !== b[i]) {
        const fieldName = fields[i];
        let fieldSortConfig = sortsArray.find(s => s.field === fieldName);
        if (!fieldSortConfig) {
          const externalSort = sortsArray.find(s => !fields.includes(s.field));
          if (externalSort) {
            fieldSortConfig = {
              field: fieldName,
              sortBy: externalSort.sortBy || externalSort.field,
              sortOrder: externalSort.sortOrder || 'asc'
            };
          }
        }
        const sortByField = fieldSortConfig ? fieldSortConfig.sortBy : null;
        const sortOrder = (fieldSortConfig ? fieldSortConfig.sortOrder || 'asc' : 'asc').toLowerCase();
        
        let valA = a[i];
        let valB = b[i];
        
        if (sortByField) {
          const mapForLevel = sortMaps[i];
          const prefixA = [...a.slice(0, i), valA].join(KEY_SEPARATOR);
          const prefixB = [...b.slice(0, i), valB].join(KEY_SEPARATOR);
          
          const keyA = mapForLevel[prefixA];
          const keyB = mapForLevel[prefixB];
          
          if (keyA !== undefined && keyB !== undefined && keyA !== keyB) {
            const numA = cleanAndParseNumber(keyA);
            const numB = cleanAndParseNumber(keyB);
            const isNumA = !isNaN(numA) && keyA !== '' && keyA !== null;
            const isNumB = !isNaN(numB) && keyB !== '' && keyB !== null;
            
            let cmp = 0;
            if (isNumA && isNumB) {
              cmp = numA - numB;
            } else {
              cmp = String(keyA).localeCompare(String(keyB));
            }
            return sortOrder === 'desc' ? -cmp : cmp;
          }
        }
        
        // Fallback to alphabetical/numerical sorting of the values themselves
        const numA = cleanAndParseNumber(valA);
        const numB = cleanAndParseNumber(valB);
        let cmp = 0;
        if (!isNaN(numA) && !isNaN(numB)) {
          cmp = numA - numB;
        } else {
          cmp = valA.localeCompare(valB);
        }
        return sortOrder === 'desc' ? -cmp : cmp;
      }
    }
    return a.length - b.length;
  });

  // Add the Grand Total path at the top
  paths.unshift([]);

  return paths;
}

/**
 * Aggregates a list of values based on the aggregator type
 * 
 * @param {Array<number>} values 
 * @param {string} aggregator - 'sum' | 'avg' | 'count' | 'min' | 'max' | 'product'
 * @returns {number}
 */
export function aggregateValues(values, aggregator) {
  if (aggregator === 'count') {
    return values.length;
  }

  // Filter out non-numeric values for math operations
  const numValues = values
    .map(v => cleanAndParseNumber(v))
    .filter(v => !isNaN(v) && v !== null && v !== undefined);

  if (numValues.length === 0) {
    return aggregator === 'sum' || aggregator === 'product' ? 0 : null;
  }

  switch (aggregator) {
    case 'sum':
      return numValues.reduce((sum, v) => sum + v, 0);
    case 'avg':
      return numValues.reduce((sum, v) => sum + v, 0) / numValues.length;
    case 'min':
      return Math.min(...numValues);
    case 'max':
      return Math.max(...numValues);
    case 'product':
      return numValues.reduce((prod, v) => prod * v, 1);
    default:
      return 0;
  }
}

/**
 * Computes the pivot grid data
 * 
 * @param {Array<Object>} data - Raw tabular data
 * @param {Array<string>} rows - Fields for row grouping
 * @param {Array<string>} columns - Fields for column grouping
 * @param {Array<Object>} valuesConfig - Array of { field, aggregator, label }
 * @returns {Object} Pivot grid model
 */
export function computePivot(data, rows = [], columns = [], valuesConfig = [], sorts = {}) {
  if (!data || data.length === 0) {
    return {
      rowPaths: [[]],
      colPaths: [[]],
      cells: {},
      rowsConfig: rows,
      columnsConfig: columns,
      valuesConfig: valuesConfig,
      sortsConfig: sorts
    };
  }

  // If no valuesConfig is provided, add a default count of records
  const finalValuesConfig = valuesConfig.length > 0 
    ? valuesConfig 
    : [{ field: null, aggregator: 'count', label: 'Conteggio' }];

  // 1. Get all unique row paths and column paths
  const rowPaths = getUniquePaths(data, rows, sorts && sorts.rows ? sorts.rows : sorts, finalValuesConfig);
  const colPaths = getUniquePaths(data, columns, sorts && sorts.columns ? sorts.columns : sorts, finalValuesConfig);

  // 2. Initialize cells matrix
  // Cells will map rowKey -> colKey -> array of values for each config index
  // cells[rowKey][colKey] = [ { sum, count, min, max, product, values: [] }, ... ] (one per valueConfig)
  const cells = {};

  const getPathKey = (path) => path.join(KEY_SEPARATOR);

  // Helper to initialize cell state for a rowKey and colKey
  const initCell = (rKey, cKey) => {
    if (!cells[rKey]) cells[rKey] = {};
    if (!cells[rKey][cKey]) {
      cells[rKey][cKey] = finalValuesConfig.map(() => ({
        rawValues: [],
        sourceRecords: [] // keep track for drill-down!
      }));
    }
  };

  // 3. Process data records and populate cells
  for (const record of data) {
    // Generate all matching row paths for this record
    // e.g., if record is { Region: 'North', Product: 'A' } and rows = ['Region', 'Product']
    // matching row paths are: [], ['North'], ['North', 'A']
    const matchingRowPaths = [[]];
    let currentPath = [];
    for (const field of rows) {
      const val = record[field] !== undefined && record[field] !== null ? String(record[field]) : '(vuoto)';
      currentPath.push(val);
      matchingRowPaths.push([...currentPath]);
    }

    // Generate all matching column paths for this record
    const matchingColPaths = [[]];
    currentPath = [];
    for (const field of columns) {
      const val = record[field] !== undefined && record[field] !== null ? String(record[field]) : '(vuoto)';
      currentPath.push(val);
      matchingColPaths.push([...currentPath]);
    }

    // Accumulate for all row x column path intersections
    for (const rPath of matchingRowPaths) {
      const rKey = getPathKey(rPath);
      for (const cPath of matchingColPaths) {
        const cKey = getPathKey(cPath);
        
        initCell(rKey, cKey);
        
        // Push values for each measure config
        finalValuesConfig.forEach((cfg, idx) => {
          const val = cfg.field ? record[cfg.field] : 1; // if field is null (like in record count), count 1
          cells[rKey][cKey][idx].rawValues.push(val);
          // Store raw record for drill-down (only store on leaf intersection or all? Let's store on leaf only, or limit to first 100 for memory efficiency)
          if (cells[rKey][cKey][idx].sourceRecords.length < 500) {
            cells[rKey][cKey][idx].sourceRecords.push(record);
          }
        });
      }
    }
  }

  // 4. Calculate final aggregated values
  const finalCells = {};
  for (const rKey in cells) {
    finalCells[rKey] = {};
    for (const cKey in cells[rKey]) {
      finalCells[rKey][cKey] = cells[rKey][cKey].map((cellData, idx) => {
        const cfg = finalValuesConfig[idx];
        const value = aggregateValues(cellData.rawValues, cfg.aggregator);
        return {
          value,
          formattedValue: formatValue(value, cfg.aggregator),
          aggregator: cfg.aggregator,
          field: cfg.field,
          sourceRecords: cellData.sourceRecords
        };
      });
    }
  }

  return {
    rowPaths,
    colPaths,
    cells: finalCells,
    rowsConfig: rows,
    columnsConfig: columns,
    valuesConfig: finalValuesConfig
  };
}

/**
 * Format helper for values
 */
export function formatValue(val, aggregator) {
  if (val === null || val === undefined) return '-';
  if (aggregator === 'count') return val.toString();
  
  // Format as number with max 2 decimal places
  if (typeof val === 'number') {
    return new Intl.NumberFormat('it-IT', {
      minimumFractionDigits: 0,
      maximumFractionDigits: 2
    }).format(val);
  }
  return val.toString();
}

/**
 * Parses a report configuration that can be a JSON string or object.
 * Supports a simple format:
 * {
 *   data: Array,
 *   rows: Array<string>,
 *   columns: Array<string>,
 *   values: Array<{ field, aggregator, label }>
 * }
 * 
 * Or a structured format:
 * {
 *   dataSource: {
 *     data: Array
 *   },
 *   slice: {
 *     rows: Array<{ uniqueName }>,
 *     columns: Array<{ uniqueName }>,
 *     measures: Array<{ uniqueName, aggregation, caption }>
 *   }
 * }
 * 
 * @param {Object|string} report 
 * @returns {Object} Parsed configuration
 */
export function parseReportConfig(report) {
  if (!report) return null;

  let config = report;
  if (typeof report === 'string') {
    try {
      config = JSON.parse(report);
    } catch (e) {
      console.error('Errore nel parsing del JSON di report:', e);
      return null;
    }
  }

  // 1. Extract raw data
  let data = [];
  if (Array.isArray(config)) {
    data = config;
  } else if (config.data && Array.isArray(config.data)) {
    data = config.data;
  } else if (config.dataSource) {
    if (Array.isArray(config.dataSource)) {
      data = config.dataSource;
    } else if (config.dataSource.data && Array.isArray(config.dataSource.data)) {
      data = config.dataSource.data;
    }
  }

  // 2. Extract rows
  let rows = [];
  const tempRowSorts = [];
  const processRowItem = (item, destList) => {
    if (typeof item === 'string') {
      destList.push(item);
    } else if (item && item.uniqueName) {
      destList.push(item.uniqueName);
      if (item.sortBy) {
        tempRowSorts.push({
          field: item.uniqueName,
          sortBy: item.sortBy,
          sortOrder: item.sortOrder || 'asc'
        });
      }
    }
  };

  if (config.rows && Array.isArray(config.rows)) {
    config.rows.forEach(r => processRowItem(r, rows));
  } else if (config.slice && config.slice.rows && Array.isArray(config.slice.rows)) {
    config.slice.rows.forEach(r => processRowItem(r, rows));
  }

  // 3. Extract columns
  let columns = [];
  const tempColSorts = [];
  const processColItem = (item, destList) => {
    if (typeof item === 'string') {
      destList.push(item);
    } else if (item && item.uniqueName) {
      destList.push(item.uniqueName);
      if (item.sortBy) {
        tempColSorts.push({
          field: item.uniqueName,
          sortBy: item.sortBy,
          sortOrder: item.sortOrder || 'asc'
        });
      }
    }
  };

  if (config.columns && Array.isArray(config.columns)) {
    config.columns.forEach(c => processColItem(c, columns));
  } else if (config.slice && config.slice.columns && Array.isArray(config.slice.columns)) {
    config.slice.columns.forEach(c => processColItem(c, columns));
  }

  // 4. Extract sorts (grouped by rows & columns)
  let sorts = {
    rows: tempRowSorts,
    columns: tempColSorts
  };

  const parseFlatSort = (field, cfg) => ({
    field,
    sortBy: typeof cfg === 'string' ? cfg : (cfg.sortBy || field),
    sortOrder: typeof cfg === 'object' ? (cfg.sortOrder || 'asc') : 'asc'
  });

  const distributeSort = (sortItem) => {
    if (rows.includes(sortItem.field)) {
      if (!sorts.rows.some(s => s.field === sortItem.field)) {
        sorts.rows.push(sortItem);
      }
    } else if (columns.includes(sortItem.field)) {
      if (!sorts.columns.some(s => s.field === sortItem.field)) {
        sorts.columns.push(sortItem);
      }
    } else {
      // Fallback: add to rows
      if (!sorts.rows.some(s => s.field === sortItem.field)) {
        sorts.rows.push(sortItem);
      }
    }
  };

  const rawSorts = config.sorts || (config.slice && config.slice.sorts);
  if (rawSorts) {
    if (rawSorts.rows || rawSorts.columns) {
      if (Array.isArray(rawSorts.rows)) {
        rawSorts.rows.forEach(s => {
          if (!sorts.rows.some(existing => existing.field === s.field)) {
            sorts.rows.push(s);
          }
        });
      }
      if (Array.isArray(rawSorts.columns)) {
        rawSorts.columns.forEach(s => {
          if (!sorts.columns.some(existing => existing.field === s.field)) {
            sorts.columns.push(s);
          }
        });
      }
    } else if (Array.isArray(rawSorts)) {
      rawSorts.forEach(distributeSort);
    } else {
      Object.entries(rawSorts).forEach(([field, cfg]) => {
        distributeSort(parseFlatSort(field, cfg));
      });
    }
  }

  // 4. Extract values/measures
  let values = [];
  const mapSchemaAggregator = (agg) => {
    if (!agg) return 'sum';
    const a = agg.toLowerCase();
    if (a === 'average' || a === 'avg') return 'avg';
    return a;
  };

  if (config.values && Array.isArray(config.values)) {
    values = config.values.map(v => ({
      field: v.field || v.uniqueName || null,
      aggregator: v.aggregator || mapSchemaAggregator(v.aggregation),
      label: v.label || v.caption || (v.field ? `${v.field} (${v.aggregator || 'sum'})` : 'Conteggio')
    }));
  } else if (config.slice && config.slice.measures && Array.isArray(config.slice.measures)) {
    values = config.slice.measures.map(m => ({
      field: m.uniqueName || m.field || null,
      aggregator: mapSchemaAggregator(m.aggregation || m.aggregator),
      label: m.caption || m.label || (m.uniqueName ? `${m.uniqueName} (${m.aggregation || 'sum'})` : 'Conteggio')
    }));
  }

  return {
    data,
    rows,
    columns,
    values,
    sorts
  };
}
