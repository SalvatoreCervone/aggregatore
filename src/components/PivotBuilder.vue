<template>
  <div class="pivot-builder">
    <!-- Section: Available Fields -->
    <div>
      <h4 class="builder-section-title">
        <span>Campi Disponibili</span>
        <span class="pivot-title-tag" style="font-size: 0.65rem;">Trascina o clicca</span>
      </h4>
      <div 
        class="fields-pool"
        @dragover.prevent
        @drop="onDrop($event, 'pool')"
      >
        <div 
          v-for="field in availableFields" 
          :key="'field-' + field"
          class="field-chip"
          draggable="true"
          @dragstart="onDragStart($event, field, 'pool')"
          @click="showFieldMenu(field, $event)"
          title="Trascina in una sezione o clicca per configurare"
        >
          <span style="font-size: 0.75rem;">☰</span>
          <span>{{ field }}</span>
        </div>
        <div v-if="availableFields.length === 0" style="color: var(--pv-text-muted); font-size: 0.8rem; width: 100%; text-align: center; padding: 10px 0;">
          Tutti i campi sono stati assegnati.
        </div>
      </div>
    </div>

    <!-- Drop Zones Container -->
    <div class="dropzone-container">
      <!-- Zone: Rows (Righe) -->
      <div>
        <h4 class="builder-section-title">Righe (Gruppi Verticali)</h4>
        <div 
          class="dropzone"
          :class="{ 'dragover': dragOverZone === 'rows' }"
          @dragover.prevent="onDragOver('rows')"
          @dragleave="onDragLeave"
          @drop="onDrop($event, 'rows')"
        >
          <div 
            v-for="(field, index) in rows" 
            :key="'row-chip-' + field"
            class="field-chip"
            draggable="true"
            @dragstart="onDragStart($event, field, 'rows', index)"
            @click="showFieldSortMenu(field, 'rows')"
            style="cursor: pointer;"
            title="Clicca per configurare ordinamento o trascina"
          >
            <span>☰</span>
            <span>{{ field }}</span>
            <select 
              v-if="detectedDateFields && detectedDateFields.includes(field)"
              :value="groupings[field] || ''"
              @change="setFieldGrouping(field, $event.target.value)"
              @click.stop
              title="Raggruppamento data"
              class="pivot-date-select"
            >
              <option value="">Data intera</option>
              <option value="year">Anno</option>
              <option value="month">Mese</option>
              <option value="year-month">Anno-Mese</option>
              <option value="year-quarter">Anno-Trimestre</option>
            </select>
            <span v-if="getFieldSortLabel(field)" class="pivot-title-tag" style="font-size: 0.65rem; margin-left: 4px; background-color: var(--pv-accent); color: white;">
              {{ getFieldSortLabel(field) }}
            </span>
            <button @click.stop="removeField('rows', index)" class="remove-btn" title="Rimuovi">&times;</button>
          </div>
        </div>
      </div>

      <!-- Zone: Columns (Colonne) -->
      <div>
        <h4 class="builder-section-title">Colonne (Gruppi Orizzontali)</h4>
        <div 
          class="dropzone"
          :class="{ 'dragover': dragOverZone === 'columns' }"
          @dragover.prevent="onDragOver('columns')"
          @dragleave="onDragLeave"
          @drop="onDrop($event, 'columns')"
        >
          <div 
            v-for="(field, index) in columns" 
            :key="'col-chip-' + field"
            class="field-chip"
            draggable="true"
            @dragstart="onDragStart($event, field, 'columns', index)"
            @click="showFieldSortMenu(field, 'columns')"
            style="cursor: pointer;"
            title="Clicca per configurare ordinamento o trascina"
          >
            <span>☰</span>
            <span>{{ field }}</span>
            <select 
              v-if="detectedDateFields && detectedDateFields.includes(field)"
              :value="groupings[field] || ''"
              @change="setFieldGrouping(field, $event.target.value)"
              @click.stop
              title="Raggruppamento data"
              class="pivot-date-select"
            >
              <option value="">Data intera</option>
              <option value="year">Anno</option>
              <option value="month">Mese</option>
              <option value="year-month">Anno-Mese</option>
              <option value="year-quarter">Anno-Trimestre</option>
            </select>
            <span v-if="getFieldSortLabel(field)" class="pivot-title-tag" style="font-size: 0.65rem; margin-left: 4px; background-color: var(--pv-accent); color: white;">
              {{ getFieldSortLabel(field) }}
            </span>
            <button @click.stop="removeField('columns', index)" class="remove-btn" title="Rimuovi">&times;</button>
          </div>
        </div>
      </div>

      <!-- Zone: Values (Misure) -->
      <div>
        <h4 class="builder-section-title">Valori (Misure Aggregate)</h4>
        <div 
          class="dropzone"
          :class="{ 'dragover': dragOverZone === 'values' }"
          @dragover.prevent="onDragOver('values')"
          @dragleave="onDragLeave"
          @drop="onDrop($event, 'values')"
        >
          <div 
            v-for="(valCfg, index) in values" 
            :key="'val-chip-' + index"
            class="field-chip value-chip"
          >
            <span style="font-weight: 600; color: var(--pv-accent);">{{ valCfg.field || 'Conteggio' }}</span>
            
            <select 
              v-model="valCfg.aggregator" 
              @change="onAggregatorChange(index)"
              title="Tipo di aggregazione"
            >
              <option value="sum">Somma</option>
              <option value="avg">Media</option>
              <option value="count">Conteggio</option>
              <option value="min">Minimo</option>
              <option value="max">Massimo</option>
              <option value="product">Prodotto</option>
            </select>
            
            <button @click="removeField('values', index)" class="remove-btn" title="Rimuovi">&times;</button>
          </div>
        </div>
      </div>

      <!-- Zone: Sorts Rows (Ordinamento Righe) -->
      <div>
        <h4 class="builder-section-title">Ordinamento Righe</h4>
        <div 
          class="dropzone"
          :class="{ 'dragover': dragOverZone === 'sorts-rows' }"
          @dragover.prevent="onDragOver('sorts-rows')"
          @dragleave="onDragLeave"
          @drop="onDrop($event, 'sorts-rows')"
        >
          <div 
            v-for="(sortCfg, index) in rowSortsList" 
            :key="'row-sort-chip-' + sortCfg.field"
            class="field-chip sort-chip"
            draggable="true"
            @dragstart="onDragStart($event, sortCfg.field, 'sorts-rows', index)"
          >
            <span style="font-size: 0.75rem; color: var(--pv-text-muted);">☰</span>
            <span style="font-weight: 600;">{{ sortCfg.field }}</span>
            <span v-if="sortCfg.sortBy !== sortCfg.field" class="pivot-title-tag" style="font-size: 0.65rem; margin-left: 2px;">
              su {{ sortCfg.sortBy }}
            </span>
            
            <div class="sort-actions-group" style="display: inline-flex; align-items: center; gap: 4px; margin-left: auto;">
              <!-- Toggle sort direction button -->
              <button 
                @click="toggleSortOrder(index, 'rows')" 
                class="sort-btn-pill"
                style="padding: 2px 6px; font-size: 0.7rem; border-radius: 4px; border: 1px solid var(--pv-border); background-color: var(--pv-bg); color: var(--pv-text-primary); cursor: pointer;"
                :title="sortCfg.sortOrder === 'asc' ? 'Crescente (A-Z / 0-9). Clicca per invertire.' : 'Decrescente (Z-A / 9-0). Clicca per invertire.'"
              >
                {{ sortCfg.sortOrder === 'asc' ? '▲ ASC' : '▼ DESC' }}
              </button>

              <!-- Advanced sort settings -->
              <button 
                @click="openAdvancedSort(sortCfg.field, 'rows')" 
                class="sort-btn-pill" 
                style="padding: 2px 6px; font-size: 0.7rem; border-radius: 4px; border: 1px solid var(--pv-border); background-color: var(--pv-bg); color: var(--pv-text-primary); cursor: pointer;"
                title="Ordinamento avanzato"
              >
                ⚙
              </button>

              <!-- Move Priority Buttons -->
              <button 
                @click="moveSortPriority(index, -1, 'rows')" 
                :disabled="index === 0" 
                class="sort-priority-btn"
                style="padding: 2px 4px; font-size: 0.65rem; border: none; background: transparent; cursor: pointer; color: var(--pv-text-primary);"
                :style="{ opacity: index === 0 ? 0.3 : 1 }"
              >
                ▲
              </button>
              <button 
                @click="moveSortPriority(index, 1, 'rows')" 
                :disabled="index === rowSortsList.length - 1" 
                class="sort-priority-btn"
                style="padding: 2px 4px; font-size: 0.65rem; border: none; background: transparent; cursor: pointer; color: var(--pv-text-primary);"
                :style="{ opacity: index === rowSortsList.length - 1 ? 0.3 : 1 }"
              >
                ▼
              </button>
            </div>
            
            <button @click="removeField('sorts-rows', index)" class="remove-btn" title="Rimuovi">&times;</button>
          </div>
          <div v-if="rowSortsList.length === 0" style="color: var(--pv-text-muted); font-size: 0.8rem; width: 100%; text-align: center; padding: 10px 0;">
            Trascina qui per ordinare le Righe
          </div>
        </div>
      </div>

      <!-- Zone: Sorts Columns (Ordinamento Colonne) -->
      <div>
        <h4 class="builder-section-title">Ordinamento Colonne</h4>
        <div 
          class="dropzone"
          :class="{ 'dragover': dragOverZone === 'sorts-columns' }"
          @dragover.prevent="onDragOver('sorts-columns')"
          @dragleave="onDragLeave"
          @drop="onDrop($event, 'sorts-columns')"
        >
          <div 
            v-for="(sortCfg, index) in colSortsList" 
            :key="'col-sort-chip-' + sortCfg.field"
            class="field-chip sort-chip"
            draggable="true"
            @dragstart="onDragStart($event, sortCfg.field, 'sorts-columns', index)"
          >
            <span style="font-size: 0.75rem; color: var(--pv-text-muted);">☰</span>
            <span style="font-weight: 600;">{{ sortCfg.field }}</span>
            <span v-if="sortCfg.sortBy !== sortCfg.field" class="pivot-title-tag" style="font-size: 0.65rem; margin-left: 2px;">
              su {{ sortCfg.sortBy }}
            </span>
            
            <div class="sort-actions-group" style="display: inline-flex; align-items: center; gap: 4px; margin-left: auto;">
              <!-- Toggle sort direction button -->
              <button 
                @click="toggleSortOrder(index, 'columns')" 
                class="sort-btn-pill"
                style="padding: 2px 6px; font-size: 0.7rem; border-radius: 4px; border: 1px solid var(--pv-border); background-color: var(--pv-bg); color: var(--pv-text-primary); cursor: pointer;"
                :title="sortCfg.sortOrder === 'asc' ? 'Crescente (A-Z / 0-9). Clicca per invertire.' : 'Decrescente (Z-A / 9-0). Clicca per invertire.'"
              >
                {{ sortCfg.sortOrder === 'asc' ? '▲ ASC' : '▼ DESC' }}
              </button>

              <!-- Advanced sort settings -->
              <button 
                @click="openAdvancedSort(sortCfg.field, 'columns')" 
                class="sort-btn-pill" 
                style="padding: 2px 6px; font-size: 0.7rem; border-radius: 4px; border: 1px solid var(--pv-border); background-color: var(--pv-bg); color: var(--pv-text-primary); cursor: pointer;"
                title="Ordinamento avanzato"
              >
                ⚙
              </button>

              <!-- Move Priority Buttons -->
              <button 
                @click="moveSortPriority(index, -1, 'columns')" 
                :disabled="index === 0" 
                class="sort-priority-btn"
                style="padding: 2px 4px; font-size: 0.65rem; border: none; background: transparent; cursor: pointer; color: var(--pv-text-primary);"
                :style="{ opacity: index === 0 ? 0.3 : 1 }"
              >
                ▲
              </button>
              <button 
                @click="moveSortPriority(index, 1, 'columns')" 
                :disabled="index === colSortsList.length - 1" 
                class="sort-priority-btn"
                style="padding: 2px 4px; font-size: 0.65rem; border: none; background: transparent; cursor: pointer; color: var(--pv-text-primary);"
                :style="{ opacity: index === colSortsList.length - 1 ? 0.3 : 1 }"
              >
                ▼
              </button>
            </div>
            
            <button @click="removeField('sorts-columns', index)" class="remove-btn" title="Rimuovi">&times;</button>
          </div>
          <div v-if="colSortsList.length === 0" style="color: var(--pv-text-muted); font-size: 0.8rem; width: 100%; text-align: center; padding: 10px 0;">
            Trascina qui per ordinare le Colonne
          </div>
        </div>
      </div>
    </div>

    <!-- Custom Sorting Menu (Context Modal) -->
    <div 
      v-if="activeSortField" 
      class="pivot-modal-overlay" 
      style="background-color: rgba(0, 0, 0, 0.4); z-index: 1100;" 
      @click="activeSortField = null"
    >
      <div 
        class="pivot-modal" 
        style="max-width: 320px; box-shadow: var(--pv-shadow);" 
        @click.stop
      >
        <div class="pivot-modal-header" style="padding: 12px 16px;">
          <h4 class="pivot-modal-title" style="font-size: 1rem;">Ordinamento: <strong>{{ activeSortField }}</strong></h4>
          <button @click="activeSortField = null" class="pivot-modal-close" style="font-size: 1.2rem;">&times;</button>
        </div>
        <div class="pivot-modal-body" style="padding: 16px; display: flex; flex-direction: column; gap: 12px;">
          
          <!-- Select Sort By Field -->
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <label style="font-size: 0.8rem; font-weight: 500; color: var(--pv-text-muted);">Ordina in base al campo:</label>
            <select 
              v-model="activeSortConfig.sortBy"
              style="width: 100%; padding: 8px; border: 1px solid var(--pv-border); border-radius: 6px; background-color: var(--pv-bg-card); color: var(--pv-text); font-size: 0.9rem;"
            >
              <option v-for="f in allFields" :key="'sort-opt-' + f" :value="f">
                {{ f }}
              </option>
            </select>
          </div>

          <!-- Select Sort Order -->
          <div style="display: flex; flex-direction: column; gap: 4px;">
            <label style="font-size: 0.8rem; font-weight: 500; color: var(--pv-text-muted);">Direzione ordinamento:</label>
            <select 
              v-model="activeSortConfig.sortOrder"
              style="width: 100%; padding: 8px; border: 1px solid var(--pv-border); border-radius: 6px; background-color: var(--pv-bg-card); color: var(--pv-text); font-size: 0.9rem;"
            >
              <option value="asc">Crescente (A-Z / 0-9)</option>
              <option value="desc">Decrescente (Z-A / 9-0)</option>
            </select>
          </div>

          <!-- Actions -->
          <div style="display: flex; gap: 8px; margin-top: 8px; justify-content: flex-end;">
            <button 
              @click="activeSortField = null" 
              class="pivot-btn pivot-btn-secondary" 
              style="padding: 6px 12px; font-size: 0.85rem;"
            >
              Annulla
            </button>
            <button 
              @click="saveFieldSort" 
              class="pivot-btn" 
              style="padding: 6px 12px; font-size: 0.85rem;"
            >
              Salva
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Quick Click Fallback Menu (Context Modal) -->
    <div 
      v-if="activeMenuField" 
      class="pivot-modal-overlay" 
      style="background-color: rgba(0, 0, 0, 0.4); z-index: 1100;" 
      @click="activeMenuField = null"
    >
      <div 
        class="pivot-modal" 
        style="max-width: 320px; box-shadow: var(--pv-shadow);" 
        @click.stop
      >
        <div class="pivot-modal-header" style="padding: 12px 16px;">
          <h4 class="pivot-modal-title" style="font-size: 1rem;">Aggiungi campo: <strong>{{ activeMenuField }}</strong></h4>
          <button @click="activeMenuField = null" class="pivot-modal-close" style="font-size: 1.2rem;">&times;</button>
        </div>
        <div class="pivot-modal-body" style="padding: 16px; display: flex; flex-direction: column; gap: 8px;">
          <button @click="moveFieldToZone(activeMenuField, 'rows')" class="pivot-btn pivot-btn-secondary" style="justify-content: flex-start;">
            ➕ Aggiungi a Righe
          </button>
          <button @click="moveFieldToZone(activeMenuField, 'columns')" class="pivot-btn pivot-btn-secondary" style="justify-content: flex-start;">
            ➕ Aggiungi a Colonne
          </button>
          <button @click="moveFieldToZone(activeMenuField, 'values')" class="pivot-btn pivot-btn-secondary" style="justify-content: flex-start;">
            📊 Aggiungi a Valori
          </button>
          <button @click="moveFieldToZone(activeMenuField, 'sorts-rows')" class="pivot-btn pivot-btn-secondary" style="justify-content: flex-start;">
            ⇅ Aggiungi a Ord. Righe
          </button>
          <button @click="moveFieldToZone(activeMenuField, 'sorts-columns')" class="pivot-btn pivot-btn-secondary" style="justify-content: flex-start;">
            ⇅ Aggiungi a Ord. Colonne
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
export default {
  name: 'PivotBuilder',
  props: {
    data: {
      type: Array,
      required: true
    },
    rows: {
      type: Array,
      required: true
    },
    columns: {
      type: Array,
      required: true
    },
    values: {
      type: Array,
      required: true
    },
    sorts: {
      type: Object,
      default: () => ({ rows: [], columns: [] })
    },
    groupings: {
      type: Object,
      default: () => ({})
    },
    detectedDateFields: {
      type: Array,
      default: () => []
    }
  },
  emits: ['update:rows', 'update:columns', 'update:values', 'update:sorts', 'update:groupings'],
  data() {
    return {
      dragOverZone: null,
      activeMenuField: null,
      activeSortField: null,
      activeSortType: null, // 'rows' or 'columns'
      activeSortConfig: { sortBy: '', sortOrder: 'asc' }
    };
  },
  computed: {
    // Extract all unique headers/fields from the raw dataset
    allFields() {
      if (!this.data || this.data.length === 0) return [];
      return Object.keys(this.data[0]);
    },

    // Fields that are not currently placed in Rows or Columns (Values can repeat fields)
    availableFields() {
      const assigned = new Set([...this.rows, ...this.columns]);
      return this.allFields.filter(f => !assigned.has(f));
    },

    // Normalizes sorts to { rows, columns } representation
    normalizedSorts() {
      if (!this.sorts) return { rows: [], columns: [] };
      if (this.sorts.rows && this.sorts.columns) return this.sorts;
      
      const res = { rows: [], columns: [] };
      const list = Array.isArray(this.sorts) 
        ? this.sorts 
        : Object.entries(this.sorts).map(([field, cfg]) => ({
            field,
            sortBy: cfg.sortBy || field,
            sortOrder: cfg.sortOrder || 'asc'
          }));

      list.forEach(s => {
        if (this.rows.includes(s.field)) {
          res.rows.push(s);
        } else if (this.columns.includes(s.field)) {
          res.columns.push(s);
        } else {
          res.rows.push(s);
        }
      });
      return res;
    },
    rowSortsList() {
      return this.normalizedSorts.rows;
    },
    colSortsList() {
      return this.normalizedSorts.columns;
    }
  },
  methods: {
    onDragStart(event, field, source, index = null) {
      event.dataTransfer.effectAllowed = 'move';
      event.dataTransfer.setData('text/plain', JSON.stringify({
        field,
        source,
        index
      }));
    },

    onDragOver(zone) {
      this.dragOverZone = zone;
    },

    onDragLeave() {
      this.dragOverZone = null;
    },

    onDrop(event, targetZone) {
      this.dragOverZone = null;
      try {
        const payloadStr = event.dataTransfer.getData('text/plain');
        if (!payloadStr) return;
        
        let field, source, index;
        try {
          const parsed = JSON.parse(payloadStr);
          field = parsed.field;
          source = parsed.source;
          index = parsed.index;
        } catch (e) {
          // Fallback if data is not JSON (e.g. raw text or automation payload)
          field = payloadStr.trim();
          source = 'pool';
          index = null;
        }

        if (!field) return;

        // Don't do anything if dropping back on the same zone
        if (source === targetZone) return;

        // If it's a move between rows & columns, addFieldToZone handles the removal
        // of the field from the opposing zone cleanly.
        // For other moves (e.g. from a sort zone, or from values), we remove it explicitly first:
        if (source !== 'pool' && source !== 'rows' && source !== 'columns' && index !== null) {
          this.removeField(source, index);
        } else if ((source === 'rows' || source === 'columns') && targetZone !== 'rows' && targetZone !== 'columns' && index !== null) {
          this.removeField(source, index);
        }

        // Add to target zone
        this.addFieldToZone(field, targetZone);
      } catch (err) {
        console.error('Errore durante il drag-and-drop', err);
      }
    },

    addFieldToZone(field, zone) {
      if (zone === 'rows') {
        // Remove from columns if it exists there
        const colIdx = this.columns.indexOf(field);
        if (colIdx !== -1) {
          const newCols = [...this.columns];
          newCols.splice(colIdx, 1);
          this.$emit('update:columns', newCols);
        }
        
        const newRows = [...this.rows];
        if (!newRows.includes(field)) {
          newRows.push(field);
          this.$emit('update:rows', newRows);
        }
      } else if (zone === 'columns') {
        // Remove from rows if it exists there
        const rowIdx = this.rows.indexOf(field);
        if (rowIdx !== -1) {
          const newRows = [...this.rows];
          newRows.splice(rowIdx, 1);
          this.$emit('update:rows', newRows);
        }

        const newCols = [...this.columns];
        if (!newCols.includes(field)) {
          newCols.push(field);
          this.$emit('update:columns', newCols);
        }
      } else if (zone === 'values') {
        const newValues = [...this.values];
        const isNumeric = this.checkIfNumericField(field);
        
        newValues.push({
          field,
          aggregator: isNumeric ? 'sum' : 'count',
          label: `${field} (${isNumeric ? 'Somma' : 'Conteggio'})`
        });
        this.$emit('update:values', newValues);
      } else if (zone === 'sorts-rows') {
        const newSortsRows = [...this.rowSortsList];
        const existing = newSortsRows.find(s => s.field === field);
        if (!existing) {
          newSortsRows.push({
            field,
            sortBy: field,
            sortOrder: 'asc'
          });
          this.$emit('update:sorts', {
            rows: newSortsRows,
            columns: [...this.colSortsList]
          });
        }
      } else if (zone === 'sorts-columns') {
        const newSortsCols = [...this.colSortsList];
        const existing = newSortsCols.find(s => s.field === field);
        if (!existing) {
          newSortsCols.push({
            field,
            sortBy: field,
            sortOrder: 'asc'
          });
          this.$emit('update:sorts', {
            rows: [...this.rowSortsList],
            columns: newSortsCols
          });
        }
      }
    },

    removeField(zone, index) {
      if (zone === 'rows') {
        const newRows = [...this.rows];
        newRows.splice(index, 1);
        this.$emit('update:rows', newRows);
      } else if (zone === 'columns') {
        const newCols = [...this.columns];
        newCols.splice(index, 1);
        this.$emit('update:columns', newCols);
      } else if (zone === 'values') {
        const newValues = [...this.values];
        newValues.splice(index, 1);
        this.$emit('update:values', newValues);
      } else if (zone === 'sorts-rows') {
        const newSortsRows = [...this.rowSortsList];
        newSortsRows.splice(index, 1);
        this.$emit('update:sorts', {
          rows: newSortsRows,
          columns: [...this.colSortsList]
        });
      } else if (zone === 'sorts-columns') {
        const newSortsCols = [...this.colSortsList];
        newSortsCols.splice(index, 1);
        this.$emit('update:sorts', {
          rows: [...this.rowSortsList],
          columns: newSortsCols
        });
      }
    },

    onAggregatorChange(index) {
      const newValues = [...this.values];
      const cfg = newValues[index];
      const aggNames = {
        sum: 'Somma',
        avg: 'Media',
        count: 'Conteggio',
        min: 'Minimo',
        max: 'Massimo',
        product: 'Prodotto'
      };
      
      cfg.label = cfg.field 
        ? `${cfg.field} (${aggNames[cfg.aggregator]})`
        : `Conteggio`;
        
      this.$emit('update:values', newValues);
    },

    checkIfNumericField(field) {
      if (!this.data || this.data.length === 0) return false;
      // Probe first 10 rows to see if values can be parsed as numbers
      for (let i = 0; i < Math.min(10, this.data.length); i++) {
        const val = this.data[i][field];
        if (val !== undefined && val !== null && val !== '') {
          if (isNaN(Number(val))) return false;
        }
      }
      return true;
    },

    showFieldMenu(field, event) {
      this.activeMenuField = field;
    },

    moveFieldToZone(field, zone) {
      this.addFieldToZone(field, zone);
      this.activeMenuField = null;
    },

    showFieldSortMenu(field, type = 'rows') {
      const list = type === 'rows' ? this.rowSortsList : this.colSortsList;
      const existing = list.find(s => s.field === field);
      if (!existing) {
        const newList = [...list];
        newList.push({
          field,
          sortBy: field,
          sortOrder: 'asc'
        });
        this.$emit('update:sorts', {
          rows: type === 'rows' ? newList : [...this.rowSortsList],
          columns: type === 'columns' ? newList : [...this.colSortsList]
        });
      }
      this.openAdvancedSort(field, type);
    },

    openAdvancedSort(field, type = 'rows') {
      this.activeSortField = field;
      this.activeSortType = type;
      const list = type === 'rows' ? this.rowSortsList : this.colSortsList;
      const currentSort = list.find(s => s.field === field) || { sortBy: field, sortOrder: 'asc' };
      this.activeSortConfig = {
        sortBy: currentSort.sortBy || field,
        sortOrder: currentSort.sortOrder || 'asc'
      };
    },

    saveFieldSort() {
      const type = this.activeSortType || 'rows';
      const list = type === 'rows' ? this.rowSortsList : this.colSortsList;
      const newList = list.map(s => {
        if (s.field === this.activeSortField) {
          return {
            ...s,
            sortBy: this.activeSortConfig.sortBy,
            sortOrder: this.activeSortConfig.sortOrder
          };
        }
        return s;
      });
      
      this.$emit('update:sorts', {
        rows: type === 'rows' ? newList : [...this.rowSortsList],
        columns: type === 'columns' ? newList : [...this.colSortsList]
      });
      this.activeSortField = null;
      this.activeSortType = null;
    },

    toggleSortOrder(index, type) {
      const list = type === 'rows' ? this.rowSortsList : this.colSortsList;
      const newList = [...list];
      const cfg = newList[index];
      cfg.sortOrder = cfg.sortOrder === 'asc' ? 'desc' : 'asc';
      
      this.$emit('update:sorts', {
        rows: type === 'rows' ? newList : [...this.rowSortsList],
        columns: type === 'columns' ? newList : [...this.colSortsList]
      });
    },

    moveSortPriority(index, direction, type) {
      const list = type === 'rows' ? this.rowSortsList : this.colSortsList;
      const newList = [...list];
      const targetIndex = index + direction;
      if (targetIndex >= 0 && targetIndex < newList.length) {
        const temp = newList[index];
        newList[index] = newList[targetIndex];
        newList[targetIndex] = temp;
        
        this.$emit('update:sorts', {
          rows: type === 'rows' ? newList : [...this.rowSortsList],
          columns: type === 'columns' ? newList : [...this.colSortsList]
        });
      }
    },

    getFieldSortLabel(field) {
      const sort = this.rowSortsList.find(s => s.field === field) || this.colSortsList.find(s => s.field === field);
      if (!sort) return '';
      const isDesc = sort.sortOrder === 'desc';
      const arrow = isDesc ? '▼' : '▲';
      if (sort.sortBy && sort.sortBy !== field) {
        return `${arrow} ${sort.sortBy}`;
      }
      return isDesc ? '▼ Z-A' : '▲ A-Z';
    },

    setFieldGrouping(field, value) {
      const newGroupings = { ...this.groupings };
      if (value) {
        newGroupings[field] = value;
      } else {
        delete newGroupings[field];
      }
      this.$emit('update:groupings', newGroupings);
    }
  }
};
</script>
