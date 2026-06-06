/**
 * Pivot Engine - Core multi-dimensional aggregation logic
 */

const KEY_SEPARATOR = '\u0000';

/**
 * Extracts all unique values for the given fields from data, preserving hierarchy.
 * Returns an array of paths (arrays of values).
 * 
 * @param {Array<Object>} data 
 * @param {Array<string>} fields 
 * @returns {Array<Array<any>>}
 */
export function getUniquePaths(data, fields) {
  if (!fields || fields.length === 0) {
    return [[]]; // Only the grand total path
  }

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
  
  // Sort paths hierarchically
  paths.sort((a, b) => {
    const minLen = Math.min(a.length, b.length);
    for (let i = 0; i < minLen; i++) {
      if (a[i] !== b[i]) {
        // Try numerical sort first if both are numbers
        const numA = Number(a[i]);
        const numB = Number(b[i]);
        if (!isNaN(numA) && !isNaN(numB)) {
          return numA - numB;
        }
        return a[i].localeCompare(b[i]);
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
    .map(v => Number(v))
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
export function computePivot(data, rows = [], columns = [], valuesConfig = []) {
  if (!data || data.length === 0) {
    return {
      rowPaths: [[]],
      colPaths: [[]],
      cells: {},
      rowsConfig: rows,
      columnsConfig: columns,
      valuesConfig: valuesConfig
    };
  }

  // If no valuesConfig is provided, add a default count of records
  const finalValuesConfig = valuesConfig.length > 0 
    ? valuesConfig 
    : [{ field: null, aggregator: 'count', label: 'Conteggio' }];

  // 1. Get all unique row paths and column paths
  const rowPaths = getUniquePaths(data, rows);
  const colPaths = getUniquePaths(data, columns);

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
  if (config.rows && Array.isArray(config.rows)) {
    rows = config.rows.map(r => typeof r === 'string' ? r : (r.uniqueName || ''));
  } else if (config.slice && config.slice.rows && Array.isArray(config.slice.rows)) {
    rows = config.slice.rows.map(r => typeof r === 'string' ? r : (r.uniqueName || ''));
  }
  rows = rows.filter(Boolean);

  // 3. Extract columns
  let columns = [];
  if (config.columns && Array.isArray(config.columns)) {
    columns = config.columns.map(c => typeof c === 'string' ? c : (c.uniqueName || ''));
  } else if (config.slice && config.slice.columns && Array.isArray(config.slice.columns)) {
    columns = config.slice.columns.map(c => typeof c === 'string' ? c : (c.uniqueName || ''));
  }
  columns = columns.filter(Boolean);

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
    values
  };
}
