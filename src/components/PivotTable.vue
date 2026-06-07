<template>
  <div class="pivot-container" :class="{ 'pv-light': theme === 'light' }" :style="{ width: width, height: height }">
    <!-- Toolbar -->
    <div class="pivot-toolbar">
      <div class="pivot-title">
        <span>{{ title }}</span>
        <span class="pivot-title-tag">Vue Aggregatore</span>
      </div>

      <div class="pivot-actions">
        <!-- Show/Hide Builder Panel -->
        <button 
          @click="showBuilder = !showBuilder" 
          class="pivot-btn pivot-btn-secondary"
          :title="showBuilder ? 'Nascondi configuratore' : 'Mostra configuratore'"
        >
          <span>{{ showBuilder ? '👁️ Nascondi Campi' : '🛠️ Configura Campi' }}</span>
        </button>

        <!-- Import Excel/CSV Button -->
        <button 
          v-if="allowImport"
          @click="$refs.excelInput.click()" 
          class="pivot-btn pivot-btn-secondary"
          title="Importa file Excel (.xlsx, .xls) o CSV"
        >
          <span>📂 Importa Excel</span>
        </button>
        <input 
          v-if="allowImport"
          type="file" 
          ref="excelInput" 
          accept=".xlsx, .xls, .csv" 
          style="display: none;" 
          @change="handleExcelUpload" 
        />

        <!-- Export Dropdown -->
        <div v-if="allowExport" style="position: relative; display: inline-block;">
          <button @click="showExportMenu = !showExportMenu" class="pivot-btn">
            <span>💾 Esporta</span>
            <span style="font-size: 0.7rem;">▼</span>
          </button>
          
          <div 
            v-if="showExportMenu" 
            style="position: absolute; right: 0; top: 105%; background-color: var(--pv-bg-card); border: 1px solid var(--pv-border); border-radius: 8px; box-shadow: var(--pv-shadow); z-index: 100; min-width: 170px; display: flex; flex-direction: column; overflow: hidden;"
            @click="showExportMenu = false"
          >
            <button @click="exportToExcel" class="pivot-btn pivot-btn-secondary" style="border: none; border-radius: 0; padding: 10px 14px; justify-content: flex-start; background: transparent; width: 100%;">
              🟢 Esporta in Excel (.xlsx)
            </button>
            <button @click="exportToCSV" class="pivot-btn pivot-btn-secondary" style="border: none; border-radius: 0; padding: 10px 14px; justify-content: flex-start; background: transparent; width: 100%;">
              📄 Esporta in CSV
            </button>
            <button @click="exportToJSON" class="pivot-btn pivot-btn-secondary" style="border: none; border-radius: 0; padding: 10px 14px; justify-content: flex-start; background: transparent; width: 100%;">
              {} Esporta in JSON
            </button>
            <div style="border-top: 1px solid var(--pv-border); margin: 2px 0;"></div>
            <button @click="openPrintModal" class="pivot-btn pivot-btn-secondary" style="border: none; border-radius: 0; padding: 10px 14px; justify-content: flex-start; background: transparent; width: 100%;">
              🖨️ Stampa Report...
            </button>
          </div>
        </div>

        <!-- Theme Toggle -->
        <button 
          v-if="allowThemeToggle"
          @click="toggleTheme" 
          class="pivot-btn pivot-btn-secondary" 
          style="padding: 8px 12px;"
          :title="theme === 'dark' ? 'Attiva Tema Chiaro' : 'Attiva Tema Scuro'"
        >
          <span>{{ theme === 'dark' ? '☀️' : '🌙' }}</span>
        </button>
      </div>
    </div>

    <!-- Hidden Printable Header (only visible during print) -->
    <div class="pivot-print-header" v-if="internalData && internalData.length > 0">
      <h1 class="print-title">{{ printTitle }}</h1>
      <p class="print-subtitle" v-if="printSubtitle">{{ printSubtitle }}</p>
      <div class="print-metadata">Generato il: {{ currentPrintDate }}</div>
    </div>

    <!-- Layout: Configurator & Grid -->
    <div v-if="internalData && internalData.length > 0" :style="layoutStyle" class="pivot-layout">
      <!-- Builder Panel (Configurator) -->
      <PivotBuilder 
        v-if="showBuilder"
        v-model:rows="rows"
        v-model:columns="columns"
        v-model:values="values"
        :data="internalData"
      />

      <!-- Pivot Table Grid -->
      <PivotGrid 
        :pivot-data="pivotData"
        :height="height"
        :style="{ gridColumn: showBuilder ? 'auto' : 'span 2' }"
      />
    </div>

    <!-- Empty State / Drag & Drop Uploader -->
    <div 
      v-else 
      class="pivot-empty-state" 
      :class="{ dragover: allowImport && isDragOver }"
      @dragover.prevent="allowImport ? (isDragOver = true) : null"
      @dragleave.prevent="isDragOver = false"
      @drop.prevent="allowImport ? handleFileDrop($event) : null"
    >
      <div class="pivot-empty-card">
        <div class="pivot-empty-icon">{{ allowImport ? '📂' : '📊' }}</div>
        <h3>{{ allowImport ? 'Carica i tuoi Dati' : 'Nessun Dato Disponibile' }}</h3>
        <p v-if="allowImport">Trascina un file Excel (.xlsx, .xls) o CSV qui, oppure selezionalo dal computer per iniziare l'analisi pivot.</p>
        <p v-else>Non sono stati forniti dati per l'analisi pivot.</p>
        
        <button v-if="allowImport" class="pivot-btn" @click="$refs.excelInput.click()">
          Scegli un file Excel/CSV
        </button>
        
        <div v-if="allowImport" class="pivot-empty-formats">
          Formati supportati: <code>.xlsx</code>, <code>.xls</code>, <code>.csv</code>
        </div>
      </div>
    </div>

    <!-- Print Options Modal Dialog -->
    <div v-if="showPrintModal" class="pivot-modal-overlay" @click.self="showPrintModal = false">
      <div class="pivot-modal" style="max-width: 450px; background-color: var(--pv-bg-card); border: 1px solid var(--pv-border); box-shadow: var(--pv-shadow);">
        <div class="pivot-modal-header" style="border-bottom: 1px solid var(--pv-border); padding: 16px 20px;">
          <h3 class="pivot-modal-title" style="margin: 0; font-size: 1.2rem; color: var(--pv-text-primary);">Configura Stampa</h3>
          <button @click="showPrintModal = false" class="pivot-modal-close" style="background: none; border: none; font-size: 1.5rem; cursor: pointer; color: var(--pv-text-muted);">&times;</button>
        </div>
        <div class="pivot-modal-body" style="padding: 20px; display: flex; flex-direction: column; gap: 15px;">
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 0.9rem; font-weight: 500; color: var(--pv-text-primary); text-align: left;">Titolo Report (Intestazione)</label>
            <input 
              v-model="printTitle" 
              type="text" 
              placeholder="Inserisci un titolo per la stampa..." 
              class="grid-search"
              style="width: 100%; box-sizing: border-box; background-color: var(--pv-bg); border: 1px solid var(--pv-border); color: var(--pv-text-primary); padding: 8px 12px; border-radius: 6px;"
            />
          </div>
          <div style="display: flex; flex-direction: column; gap: 6px;">
            <label style="font-size: 0.9rem; font-weight: 500; color: var(--pv-text-primary); text-align: left;">Sottotitolo / Info Aggiuntive (opzionale)</label>
            <input 
              v-model="printSubtitle" 
              type="text" 
              placeholder="Esempio: Anno 2026, Reparto Vendite..." 
              class="grid-search"
              style="width: 100%; box-sizing: border-box; background-color: var(--pv-bg); border: 1px solid var(--pv-border); color: var(--pv-text-primary); padding: 8px 12px; border-radius: 6px;"
            />
          </div>
          
          <div style="display: flex; justify-content: flex-end; gap: 10px; margin-top: 15px; border-top: 1px solid var(--pv-border); padding-top: 15px;">
            <button class="pivot-btn pivot-btn-secondary" @click="showPrintModal = false" style="padding: 8px 16px;">
              Annulla
            </button>
            <button class="pivot-btn" @click="triggerPrint" style="padding: 8px 16px; background-color: var(--pv-accent); color: white; border: none; border-radius: 6px; cursor: pointer;">
              🖨️ Stampa Ora
            </button>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import PivotBuilder from './PivotBuilder.vue';
import PivotGrid from './PivotGrid.vue';
import { computePivot, parseReportConfig } from '../utils/pivotEngine';
import * as XLSX from 'xlsx';

export default {
  name: 'PivotTable',
  components: {
    PivotBuilder,
    PivotGrid
  },
  props: {
    data: {
      type: Array,
      required: false,
      default: () => []
    },
    initialConfig: {
      type: Object,
      default: () => ({
        rows: [],
        columns: [],
        values: []
      })
    },
    report: {
      type: [Object, String],
      default: null
    },
    title: {
      type: String,
      default: 'Analisi Dati'
    },
    height: {
      type: String,
      default: '550px'
    },
    defaultTheme: {
      type: String,
      default: 'light' // 'dark' | 'light'
    },
    allowImport: {
      type: Boolean,
      default: false
    },
    allowThemeToggle: {
      type: Boolean,
      default: false
    },
    allowExport: {
      type: Boolean,
      default: false
    },
    width: {
      type: String,
      default: '100%'
    }
  },
  emits: ['change', 'export'],
  data() {
    return {
      internalData: [],
      rows: [],
      columns: [],
      values: [],
      showBuilder: true,
      showExportMenu: false,
      isDragOver: false,
      showPrintModal: false,
      printTitle: 'Report Aggregatore Pivot',
      printSubtitle: '',
      theme: this.defaultTheme
    };
  },
  computed: {
    pivotData() {
      const data = computePivot(this.internalData, this.rows, this.columns, this.values);
      // Emit config changes to parent application
      this.$emit('change', {
        rows: this.rows,
        columns: this.columns,
        values: this.values
      });
      return data;
    },
    layoutStyle() {
      return {
        gridTemplateColumns: this.showBuilder ? 'auto 1fr' : '1fr'
      };
    },
    currentPrintDate() {
      return new Intl.DateTimeFormat('it-IT', {
        dateStyle: 'medium',
        timeStyle: 'short'
      }).format(new Date());
    }
  },
  watch: {
    report: {
      handler() {
        this.loadReportConfig();
      },
      deep: true
    },
    data: {
      handler() {
        if (!this.report) {
          this.loadReportConfig();
        }
      },
      deep: true
    },
    initialConfig: {
      handler() {
        if (!this.report) {
          this.loadReportConfig();
        }
      },
      deep: true
    }
  },
  created() {
    this.loadReportConfig();
  },
  mounted() {
    // Close export dropdown if clicked outside
    document.addEventListener('click', this.handleOutsideClick);
  },
  beforeUnmount() {
    document.removeEventListener('click', this.handleOutsideClick);
  },
  methods: {
    loadReportConfig() {
      if (this.report) {
        const parsed = parseReportConfig(this.report);
        if (parsed) {
          this.internalData = parsed.data || [];
          this.rows = parsed.rows || [];
          this.columns = parsed.columns || [];
          this.values = parsed.values || [];
          return;
        }
      }
      // Fallback
      this.internalData = this.data || [];
      this.rows = [...(this.initialConfig?.rows || [])];
      this.columns = [...(this.initialConfig?.columns || [])];
      this.values = JSON.parse(JSON.stringify(this.initialConfig?.values || []));
    },
    toggleTheme() {
      this.theme = this.theme === 'dark' ? 'light' : 'dark';
    },

    handleOutsideClick(e) {
      if (!this.$el.contains(e.target)) {
        this.showExportMenu = false;
      }
    },

    openPrintModal() {
      this.showPrintModal = true;
      // Pre-fill with the title of the table if available
      this.printTitle = this.title || 'Report Aggregatore Pivot';
    },

    triggerPrint() {
      this.showPrintModal = false;
      
      const preparePrint = () => {
        const container = this.$el;
        document.body.classList.add('pv-body-printing');
        let parent = container.parentElement;
        while (parent && parent !== document.body) {
          parent.classList.add('pv-ancestor-printing');
          parent = parent.parentElement;
        }
      };

      const cleanupPrint = () => {
        document.body.classList.remove('pv-body-printing');
        const elements = document.querySelectorAll('.pv-ancestor-printing');
        elements.forEach(el => el.classList.remove('pv-ancestor-printing'));
      };

      window.addEventListener('beforeprint', preparePrint, { once: true });
      window.addEventListener('afterprint', cleanupPrint, { once: true });

      this.$nextTick(() => {
        window.print();
      });
    },

    // Handle drag and drop files
    handleFileDrop(e) {
      this.isDragOver = false;
      const files = e.dataTransfer?.files;
      if (files && files.length > 0) {
        this.handleExcelUpload({ target: { files } });
      }
    },

    // Import data from Excel (.xlsx, .xls) or CSV
    handleExcelUpload(e) {
      const file = e.target.files[0];
      if (!file) return;

      const reader = new FileReader();
      
      reader.onload = (evt) => {
        try {
          const data = evt.target.result;
          const workbook = XLSX.read(data, { type: 'binary' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const jsonData = XLSX.utils.sheet_to_json(worksheet);
          
          if (!Array.isArray(jsonData) || jsonData.length === 0) {
            alert('Il file non contiene dati validi o fogli leggibili.');
            return;
          }

          // Load it as internal data
          this.internalData = jsonData;
          
          // Reset configuration to default: first field as row, count as metric
          const fields = Object.keys(jsonData[0]);
          this.rows = [fields[0]];
          this.columns = [];
          this.values = [{ field: null, aggregator: 'count', label: 'Conteggio Record' }];
          
          // Clear input and alert
          e.target.value = '';
          alert(`Importazione completata con successo! Caricati ${jsonData.length} record.`);
        } catch (err) {
          console.error(err);
          alert('Errore nella lettura del file Excel/CSV: ' + err.message);
        }
      };
      
      reader.readAsBinaryString(file);
    },

    // Generates a binary Excel file (.xlsx) containing the rendered grid layout
    exportToExcel() {
      const data = this.pivotData;
      if (!data || !data.rowPaths || data.rowPaths.length <= 1) {
        alert('Nessun dato da esportare.');
        return;
      }

      const rowsConfig = data.rowsConfig;
      const columnsConfig = data.columnsConfig;
      const valuesConfig = data.valuesConfig;
      
      const KEY_SEPARATOR = '\u0000';

      // 1. Prepare Columns List (sorted)
      const colPaths = [...data.colPaths.filter(p => p.length > 0)];
      colPaths.sort((a, b) => {
        const minLen = Math.min(a.length, b.length);
        for (let i = 0; i < minLen; i++) {
          if (a[i] !== b[i]) {
            const numA = Number(a[i]);
            const numB = Number(b[i]);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a[i].localeCompare(b[i]);
          }
        }
        return b.length - a.length;
      });
      colPaths.push([]); // grand total column

      // 2. Prepare Rows List (sorted)
      const rowPaths = [...data.rowPaths.filter(p => p.length > 0)];
      rowPaths.sort((a, b) => {
        const minLen = Math.min(a.length, b.length);
        for (let i = 0; i < minLen; i++) {
          if (a[i] !== b[i]) {
            const numA = Number(a[i]);
            const numB = Number(b[i]);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a[i].localeCompare(b[i]);
          }
        }
        return b.length - a.length;
      });
      rowPaths.push([]); // grand total row

      const gridData = [];

      // Render column headers
      const numLevels = columnsConfig.length;
      const hasMultipleValues = valuesConfig.length > 1;

      for (let r = 0; r < numLevels; r++) {
        const line = [];
        if (r === 0) {
          line.push(rowsConfig.join(' > '));
        } else {
          line.push('');
        }

        for (const colPath of colPaths) {
          valuesConfig.forEach(() => {
            if (colPath.length === 0) {
              line.push('Totale Generale');
            } else if (r >= colPath.length) {
              line.push(`Totale ${colPath[colPath.length - 1]}`);
            } else {
              line.push(colPath[r]);
            }
          });
        }
        gridData.push(line);
      }

      // Render value headers row if multiple values
      if (hasMultipleValues) {
        const line = [''];
        for (const colPath of colPaths) {
          valuesConfig.forEach(cfg => {
            line.push(cfg.label || cfg.field || 'Valore');
          });
        }
        gridData.push(line);
      }

      // Render data rows
      for (const rowPath of rowPaths) {
        const line = [];
        
        if (rowPath.length === 0) {
          line.push('Totale Generale');
        } else if (rowPath.length < rowsConfig.length) {
          line.push(`Totale ${rowPath[rowPath.length - 1]}`);
        } else {
          line.push(rowPath[rowPath.length - 1]);
        }

        // Cell values
        const rKey = rowPath.join(KEY_SEPARATOR);
        for (const colPath of colPaths) {
          const cKey = colPath.join(KEY_SEPARATOR);
          
          valuesConfig.forEach((valCfg, valIdx) => {
            const cellData = data.cells?.[rKey]?.[cKey]?.[valIdx];
            const value = cellData ? cellData.value : null;
            if (value === null || value === undefined) {
              line.push('');
            } else {
              line.push(value); // Let SheetJS handle standard types (numbers, dates, strings)
            }
          });
        }
        gridData.push(line);
      }

      try {
        const ws = XLSX.utils.aoa_to_sheet(gridData);
        const wb = XLSX.utils.book_new();
        XLSX.utils.book_append_sheet(wb, ws, 'Pivot Table');
        
        const wbout = XLSX.write(wb, { bookType: 'xlsx', type: 'array' });
        const blob = new Blob([wbout], { type: 'application/octet-stream' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.setAttribute('href', url);
        link.setAttribute('download', 'esportazione-pivot.xlsx');
        link.style.visibility = 'hidden';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        this.$emit('export', { format: 'xlsx', data: gridData });
      } catch (err) {
        console.error('Errore nell\'esportazione Excel:', err);
        alert('Si è verificato un errore durante la generazione del file Excel.');
      }
    },

    // Generates a nice CSV representation of the rendered grid
    exportToCSV() {
      const data = this.pivotData;
      if (!data || !data.rowPaths || data.rowPaths.length <= 1) {
        alert('Nessun dato da esportare.');
        return;
      }

      const rowsConfig = data.rowsConfig;
      const columnsConfig = data.columnsConfig;
      const valuesConfig = data.valuesConfig;
      
      const KEY_SEPARATOR = '\u0000';

      // 1. Prepare Columns List (sorted)
      const colPaths = [...data.colPaths.filter(p => p.length > 0)];
      colPaths.sort((a, b) => {
        const minLen = Math.min(a.length, b.length);
        for (let i = 0; i < minLen; i++) {
          if (a[i] !== b[i]) {
            const numA = Number(a[i]);
            const numB = Number(b[i]);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a[i].localeCompare(b[i]);
          }
        }
        return b.length - a.length;
      });
      colPaths.push([]); // grand total column

      // 2. Prepare Rows List (sorted)
      const rowPaths = [...data.rowPaths.filter(p => p.length > 0)];
      rowPaths.sort((a, b) => {
        const minLen = Math.min(a.length, b.length);
        for (let i = 0; i < minLen; i++) {
          if (a[i] !== b[i]) {
            const numA = Number(a[i]);
            const numB = Number(b[i]);
            if (!isNaN(numA) && !isNaN(numB)) return numA - numB;
            return a[i].localeCompare(b[i]);
          }
        }
        return b.length - a.length;
      });
      rowPaths.push([]); // grand total row

      // 3. Build CSV Rows
      const csvLines = [];

      // Render column headers
      const numLevels = columnsConfig.length;
      const hasMultipleValues = valuesConfig.length > 1;

      for (let r = 0; r < numLevels; r++) {
        const line = [];
        // Top-left spacing for row config names
        if (r === 0) {
          line.push(`"${rowsConfig.join(' > ')}"`);
        } else {
          line.push('');
        }

        // Add column values
        for (const colPath of colPaths) {
          valuesConfig.forEach(() => {
            if (colPath.length === 0) {
              line.push('"Totale Generale"');
            } else if (r >= colPath.length) {
              line.push(`"Totale ${colPath[colPath.length - 1]}"`);
            } else {
              line.push(`"${colPath[r]}"`);
            }
          });
        }
        csvLines.push(line.join(';'));
      }

      // Render value headers row if multiple values
      if (hasMultipleValues) {
        const line = [''];
        for (const colPath of colPaths) {
          valuesConfig.forEach(cfg => {
            line.push(`"${cfg.label || cfg.field || 'Valore'}"`);
          });
        }
        csvLines.push(line.join(';'));
      }

      // Render data rows
      for (const rowPath of rowPaths) {
        const line = [];
        
        // Row header label
        if (rowPath.length === 0) {
          line.push('"Totale Generale"');
        } else if (rowPath.length < rowsConfig.length) {
          line.push(`"Totale ${rowPath[rowPath.length - 1]}"`);
        } else {
          line.push(`"${rowPath[rowPath.length - 1]}"`);
        }

        // Cell values
        const rKey = rowPath.join(KEY_SEPARATOR);
        for (const colPath of colPaths) {
          const cKey = colPath.join(KEY_SEPARATOR);
          
          valuesConfig.forEach((valCfg, valIdx) => {
            const cellData = data.cells?.[rKey]?.[cKey]?.[valIdx];
            const value = cellData ? cellData.value : null;
            if (value === null || value === undefined) {
              line.push('');
            } else {
              line.push(typeof value === 'number' ? value.toString().replace('.', ',') : `"${value}"`);
            }
          });
        }
        csvLines.push(line.join(';'));
      }

      const csvString = '\uFEFF' + csvLines.join('\n'); // add BOM for Excel compatibility
      this.triggerDownload(csvString, 'text/csv;charset=utf-8;', 'esportazione-pivot.csv');
      this.$emit('export', { format: 'csv', data: csvLines });
    },

    exportToJSON() {
      const jsonString = JSON.stringify(this.pivotData, null, 2);
      this.triggerDownload(jsonString, 'application/json;charset=utf-8;', 'esportazione-pivot.json');
      this.$emit('export', { format: 'json', data: this.pivotData });
    },

    triggerDownload(content, mimeType, filename) {
      const blob = new Blob([content], { type: mimeType });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  }
};
</script>

<style src="../styles/pivot.css"></style>
