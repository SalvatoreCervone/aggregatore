<template>
  <div class="pivot-grid-panel">
    <!-- Grid Control Bar -->
    <div class="grid-toolbar">
      <div style="display: flex; gap: 10px; align-items: center;">
        <input 
          v-model="searchQuery" 
          type="text" 
          placeholder="Cerca righe..." 
          class="grid-search"
        />
        <button @click="expandAll" class="pivot-btn pivot-btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;">
          Espandi tutto
        </button>
        <button @click="collapseAll" class="pivot-btn pivot-btn-secondary" style="padding: 6px 12px; font-size: 0.8rem;">
          Comprimi tutto
        </button>
      </div>
      <div class="pivot-text-muted" style="font-size: 0.85rem;">
        Righe: <strong>{{ visibleRowsCount }}</strong> di {{ totalRowsCount }}
      </div>
    </div>

    <!-- Scrollable Grid Container -->
    <div class="pivot-grid-container" :style="{ maxHeight: height }">
      <table class="pivot-table" v-if="pivotData && pivotData.rowPaths && pivotData.rowPaths.length > 1">
        <thead>
          <!-- Render calculated header rows -->
          <tr 
            v-for="(rowCells, rIdx) in headerRows" 
            :key="'h-row-' + rIdx"
            :class="{ 
              'col-header-row': true, 
              'last-header-row': rIdx === headerRows.length - 1 
            }"
          >
            <!-- Top-Left Corner Header -->
            <th 
              v-if="rIdx === 0" 
              class="corner-header"
              :rowspan="headerRows.length"
            >
              {{ pivotData.rowsConfig.join(' ➔ ') || 'Righe' }}
            </th>

            <!-- Column Header Cells -->
            <template v-for="(cell, cIdx) in rowCells">
              <th 
                v-if="cell"
                :key="'h-cell-' + rIdx + '-' + cIdx"
                :colspan="cell.colspan"
                :rowspan="cell.rowspan"
                :class="{
                  'header-total': cell.isTotal,
                  'header-grand-total': cell.isGrandTotal
                }"
              >
                {{ cell.text }}
              </th>
            </template>
          </tr>
        </thead>

        <tbody>
          <!-- Render each visible row -->
          <tr 
            v-for="rowPath in visibleRowPaths" 
            :key="'row-' + getPathKey(rowPath)"
            :class="{ 
              'row-total': isPathSubtotal(rowPath, pivotData.rowsConfig),
              'row-grand-total': rowPath.length === 0
            }"
          >
            <!-- Row Header Column -->
            <td 
              class="row-header"
              :class="'row-header-level-' + rowPath.length"
            >
              <div style="display: inline-flex; align-items: center; gap: 6px;">
                <!-- Expand/Collapse arrow -->
                <span 
                  v-if="hasChildren(rowPath)" 
                  @click.stop="toggleCollapse(rowPath)"
                  style="cursor: pointer; display: inline-block; width: 12px; text-align: center; font-size: 0.75rem; user-select: none;"
                >
                  {{ isCollapsed(rowPath) ? '▶' : '▼' }}
                </span>
                <span v-else style="display: inline-block; width: 12px;"></span>
                
                <span>{{ getRowLabel(rowPath) }}</span>
              </div>
            </td>

            <!-- Value Cells -->
            <td 
              v-for="col in columnsList" 
              :key="'cell-' + getPathKey(rowPath) + '-' + col.key"
              class="cell-value"
              :class="{
                'cell-total': rowPath.length > 0 && isPathSubtotal(rowPath, pivotData.rowsConfig) || col.colPath.length > 0 && isPathSubtotal(col.colPath, pivotData.columnsConfig),
                'cell-grand-total': rowPath.length === 0 || col.colPath.length === 0
              }"
              @dblclick="openDrillDown(rowPath, col.colPath, col.valueIndex)"
              title="Doppio clic per visualizzare i dettagli"
            >
              {{ getCellValue(rowPath, col.colPath, col.valueIndex) }}
            </td>
          </tr>
        </tbody>
      </table>

      <!-- No Data View -->
      <div v-else class="pivot-no-data">
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke-width="1.5" stroke="currentColor">
          <path stroke-linecap="round" stroke-linejoin="round" d="M12 9v3.75m9-.75a9 9 0 1 1-18 0 9 9 0 0 1 18 0Zm-9 3.75h.008v.008H12v-.008Z" />
        </svg>
        <span>Nessun dato da mostrare. Configura le righe, colonne e valori nel pannello a sinistra.</span>
      </div>
    </div>

    <!-- Drill-Down Modal Dialog -->
    <div v-if="drillDownCell" class="pivot-modal-overlay" @click.self="closeDrillDown">
      <div class="pivot-modal">
        <div class="pivot-modal-header">
          <h3 class="pivot-modal-title">Dettagli Record di Origine</h3>
          <button @click="closeDrillDown" class="pivot-modal-close">&times;</button>
        </div>
        <div class="pivot-modal-body">
          <p class="pivot-text-muted" style="margin-top: 0; font-size: 0.9rem; margin-bottom: 15px;">
            Visualizzazione dei record associati alla cella selezionata (massimo 500 record).
          </p>
          <div class="modal-table-container">
            <table class="modal-table">
              <thead>
                <tr>
                  <th v-for="key in drillDownHeaders" :key="'dh-' + key">{{ key }}</th>
                </tr>
              </thead>
              <tbody>
                <tr v-for="(record, idx) in drillDownCell.records" :key="'dr-' + idx">
                  <td v-for="key in drillDownHeaders" :key="'dc-' + idx + '-' + key">
                    {{ record[key] !== undefined && record[key] !== null ? record[key] : '-' }}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { formatValue } from '../utils/pivotEngine';

const KEY_SEPARATOR = '\u0000';

export default {
  name: 'PivotGrid',
  props: {
    pivotData: {
      type: Object,
      required: true
    },
    height: {
      type: String,
      default: '550px'
    }
  },
  data() {
    return {
      searchQuery: '',
      collapsedRows: new Set(),
      drillDownCell: null
    };
  },
  computed: {
    totalRowsCount() {
      return this.pivotData?.rowPaths?.length || 0;
    },
    visibleRowsCount() {
      return this.visibleRowPaths.length;
    },
    
    // Sort and filter row paths for rendering
    rowPathsForRender() {
      if (!this.pivotData || !this.pivotData.rowPaths) return [];
      
      const paths = this.pivotData.rowPaths.filter(p => p.length > 0);
      
      // Sort hierarchically: children come before their subtotal parent
      paths.sort((a, b) => {
        const minLen = Math.min(a.length, b.length);
        for (let i = 0; i < minLen; i++) {
          if (a[i] !== b[i]) {
            const numA = Number(a[i]);
            const numB = Number(b[i]);
            if (!isNaN(numA) && !isNaN(numB)) {
              return numA - numB;
            }
            return a[i].localeCompare(b[i]);
          }
        }
        // Shorter path (subtotal parent) comes last
        return b.length - a.length;
      });
      
      // Put Grand Total [] at the very end
      paths.push([]);
      return paths;
    },

    // Sort column paths for rendering
    colPathsForRender() {
      if (!this.pivotData || !this.pivotData.colPaths) return [];
      
      const paths = this.pivotData.colPaths.filter(p => p.length > 0);
      
      paths.sort((a, b) => {
        const minLen = Math.min(a.length, b.length);
        for (let i = 0; i < minLen; i++) {
          if (a[i] !== b[i]) {
            const numA = Number(a[i]);
            const numB = Number(b[i]);
            if (!isNaN(numA) && !isNaN(numB)) {
              return numA - numB;
            }
            return a[i].localeCompare(b[i]);
          }
        }
        // Shorter path (subtotal parent) comes last
        return b.length - a.length;
      });
      
      paths.push([]);
      return paths;
    },

    // Generates a flat list of column-measure combinations
    columnsList() {
      const list = [];
      const colPaths = this.colPathsForRender;
      const valuesConfig = this.pivotData.valuesConfig || [];
      
      for (const colPath of colPaths) {
        valuesConfig.forEach((valCfg, valIdx) => {
          const pathKey = colPath.join(KEY_SEPARATOR);
          list.push({
            colPath,
            valueConfig: valCfg,
            valueIndex: valIdx,
            key: `${pathKey}_v_${valIdx}`
          });
        });
      }
      return list;
    },

    // Generates the merged HTML table header matrix
    headerRows() {
      const columnsConfig = this.pivotData.columnsConfig || [];
      const valuesConfig = this.pivotData.valuesConfig || [];
      const columnsList = this.columnsList;
      
      const numLevels = columnsConfig.length;
      const hasMultipleValues = valuesConfig.length > 1;
      const numHeaderRows = Math.max(1, numLevels + (hasMultipleValues ? 1 : 0));
      
      if (columnsList.length === 0) return [];

      // Create an empty grid
      const grid = Array.from({ length: numHeaderRows }, () => 
        Array.from({ length: columnsList.length }, () => null)
      );

      for (let c = 0; c < columnsList.length; c++) {
        const col = columnsList[c];
        const path = col.colPath;
        
        if (path.length === 0) {
          // Grand Total
          grid[0][c] = {
            text: 'Totale Generale',
            rowspan: numLevels || 1,
            colspan: 1,
            isGrandTotal: true,
            pathKey: 'grand-total'
          };
        } else {
          for (let r = 0; r < numLevels; r++) {
            if (r >= path.length) {
              // Subtotal column, span down
              if (r === path.length) {
                grid[r][c] = {
                  text: `Totale ${path[path.length - 1]}`,
                  rowspan: numLevels - r,
                  colspan: 1,
                  isTotal: true,
                  pathKey: path.join(KEY_SEPARATOR) + '_subtotal'
                };
              }
            } else {
              grid[r][c] = {
                text: path[r],
                rowspan: 1,
                colspan: 1,
                isTotal: false,
                pathKey: path.slice(0, r + 1).join(KEY_SEPARATOR)
              };
            }
          }
        }
        
        if (hasMultipleValues) {
          grid[numHeaderRows - 1][c] = {
            text: col.valueConfig.label || col.valueConfig.field || 'Valore',
            rowspan: 1,
            colspan: 1,
            pathKey: path.join(KEY_SEPARATOR) + '_val_' + col.valueIndex
          };
        }
      }

      // Merge horizontally
      for (let r = 0; r < numHeaderRows; r++) {
        for (let c = 0; c < columnsList.length; c++) {
          const cell = grid[r][c];
          if (!cell) continue;
          
          let k = 1;
          while (c + k < columnsList.length) {
            const nextCell = grid[r][c + k];
            if (nextCell && 
                nextCell.text === cell.text && 
                nextCell.rowspan === cell.rowspan && 
                nextCell.pathKey === cell.pathKey &&
                // Never merge the bottom value label row
                !(hasMultipleValues && r === numLevels)
            ) {
              cell.colspan += nextCell.colspan;
              grid[r][c + k] = null;
              k++;
            } else {
              break;
            }
          }
          c += k - 1; // skip merged
        }
      }

      return grid;
    },

    // List of row paths filtered by collapse status and search query
    visibleRowPaths() {
      return this.rowPathsForRender.filter(path => {
        // 1. Filter by Collapse state
        // Check if any of its parent paths are collapsed
        for (let i = 1; i < path.length; i++) {
          const parentPath = path.slice(0, i);
          if (this.collapsedRows.has(this.getPathKey(parentPath))) {
            return false;
          }
        }

        // 2. Filter by Search Query (if applicable)
        if (this.searchQuery && path.length > 0) {
          const query = this.searchQuery.toLowerCase();
          const label = path[path.length - 1].toLowerCase();
          
          // Row matches if its label matches or if any child matches (handled simply by checking own label first)
          // For simplicity, we match the label itself
          if (!label.includes(query)) {
            // Also check if any parent matches
            const parentMatches = path.some(pVal => pVal.toLowerCase().includes(query));
            if (!parentMatches) return false;
          }
        }

        return true;
      });
    },

    // Headers for the drill-down modal table
    drillDownHeaders() {
      if (!this.drillDownCell || this.drillDownCell.records.length === 0) return [];
      return Object.keys(this.drillDownCell.records[0]);
    }
  },
  methods: {
    getPathKey(path) {
      return path.join(KEY_SEPARATOR);
    },
    
    getRowLabel(path) {
      if (path.length === 0) return 'Totale Generale';
      const label = path[path.length - 1];
      
      // If the path is a subtotal, represent it accordingly
      const rowsConfig = this.pivotData.rowsConfig || [];
      if (path.length < rowsConfig.length) {
        return `Totale ${label}`;
      }
      return label;
    },

    isPathSubtotal(path, config) {
      return path.length > 0 && path.length < config.length;
    },

    hasChildren(path) {
      if (!this.pivotData || !this.pivotData.rowPaths) return false;
      const rowsConfig = this.pivotData.rowsConfig || [];
      
      // A path can have children if its length is less than the grouping configuration length
      // and it's not the grand total row
      return path.length > 0 && path.length < rowsConfig.length;
    },

    isCollapsed(path) {
      return this.collapsedRows.has(this.getPathKey(path));
    },

    toggleCollapse(path) {
      const key = this.getPathKey(path);
      if (this.collapsedRows.has(key)) {
        this.collapsedRows.delete(key);
      } else {
        this.collapsedRows.add(key);
      }
      // Trigger updates in Vue 3 reactivity
      this.collapsedRows = new Set(this.collapsedRows);
    },

    expandAll() {
      this.collapsedRows.clear();
      this.collapsedRows = new Set();
    },

    collapseAll() {
      if (!this.pivotData || !this.pivotData.rowPaths) return;
      const rowsConfig = this.pivotData.rowsConfig || [];
      
      // Collapse all paths that can have children (length < rowsConfig.length)
      const toCollapse = new Set();
      this.pivotData.rowPaths.forEach(path => {
        if (path.length > 0 && path.length < rowsConfig.length) {
          toCollapse.add(this.getPathKey(path));
        }
      });
      this.collapsedRows = toCollapse;
    },

    getCellValue(rowPath, colPath, valueIndex) {
      const rKey = this.getPathKey(rowPath);
      const cKey = this.getPathKey(colPath);
      
      const cellDataList = this.pivotData.cells?.[rKey]?.[cKey];
      if (cellDataList && cellDataList[valueIndex]) {
        return cellDataList[valueIndex].formattedValue;
      }
      return '-';
    },

    openDrillDown(rowPath, colPath, valueIndex) {
      const rKey = this.getPathKey(rowPath);
      const cKey = this.getPathKey(colPath);
      
      const cellDataList = this.pivotData.cells?.[rKey]?.[cKey];
      if (cellDataList && cellDataList[valueIndex]) {
        const records = cellDataList[valueIndex].sourceRecords || [];
        if (records.length > 0) {
          this.drillDownCell = {
            rowLabel: this.getRowLabel(rowPath),
            colLabel: colPath.length > 0 ? colPath.join(' - ') : 'Totale Generale',
            records
          };
        }
      }
    },

    closeDrillDown() {
      this.drillDownCell = null;
    }
  }
};
</script>
