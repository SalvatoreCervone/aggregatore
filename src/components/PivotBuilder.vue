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
          >
            <span>☰</span>
            <span>{{ field }}</span>
            <button @click="removeField('rows', index)" class="remove-btn" title="Rimuovi">&times;</button>
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
          >
            <span>☰</span>
            <span>{{ field }}</span>
            <button @click="removeField('columns', index)" class="remove-btn" title="Rimuovi">&times;</button>
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
    }
  },
  emits: ['update:rows', 'update:columns', 'update:values'],
  data() {
    return {
      dragOverZone: null,
      activeMenuField: null
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
        
        const { field, source, index } = JSON.parse(payloadStr);

        // Don't do anything if dropping back on the same zone
        if (source === targetZone) return;

        // 1. Remove from source zone if it wasn't the fields pool
        if (source !== 'pool') {
          this.removeField(source, index, false);
        }

        // 2. Add to target zone
        this.addFieldToZone(field, targetZone);
      } catch (err) {
        console.error('Errore durante il drag-and-drop', err);
      }
    },

    addFieldToZone(field, zone) {
      if (zone === 'rows') {
        const newRows = [...this.rows];
        if (!newRows.includes(field)) {
          // If it is in columns, remove it first
          const colIdx = this.columns.indexOf(field);
          if (colIdx !== -1) this.removeField('columns', colIdx, false);
          
          newRows.push(field);
          this.$emit('update:rows', newRows);
        }
      } else if (zone === 'columns') {
        const newCols = [...this.columns];
        if (!newCols.includes(field)) {
          // If it is in rows, remove it first
          const rowIdx = this.rows.indexOf(field);
          if (rowIdx !== -1) this.removeField('rows', rowIdx, false);

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
      }
    },

    removeField(zone, index, triggerEmit = true) {
      if (zone === 'rows') {
        const newRows = [...this.rows];
        newRows.splice(index, 1);
        if (triggerEmit) this.$emit('update:rows', newRows);
        else this.rows.splice(index, 1);
      } else if (zone === 'columns') {
        const newCols = [...this.columns];
        newCols.splice(index, 1);
        if (triggerEmit) this.$emit('update:columns', newCols);
        else this.columns.splice(index, 1);
      } else if (zone === 'values') {
        const newValues = [...this.values];
        newValues.splice(index, 1);
        if (triggerEmit) this.$emit('update:values', newValues);
        else this.values.splice(index, 1);
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
    }
  }
};
</script>
