<template>
  <div class="app-container">
    <!-- Premium Header / Navbar -->
    <header class="app-header">
      <div class="app-logo">
        <span class="logo-icon">📊</span>
        <span class="logo-text">Aggregatore <span class="logo-subtext">Pivot</span></span>
      </div>
      <div class="app-tabs">
        <button 
          :class="['tab-btn', { active: activeTab === 'clean' }]" 
          @click="activeTab = 'clean'"
        >
          📂 Analisi Libera
        </button>
        <button 
          :class="['tab-btn', { active: activeTab === 'demo' }]" 
          @click="activeTab = 'demo'"
        >
          📈 Demo Dati di Esempio
        </button>
      </div>
    </header>

    <!-- Main Content Area -->
    <main class="app-content">
      <!-- Clean Tab (starts empty, ready for file upload) -->
      <PivotTable 
        v-if="activeTab === 'clean'"
        title="Analisi Libera"
        height="calc(100vh - 160px)"
        default-theme="dark"
        :key="'clean-view'"
      />

      <!-- Demo Tab (preloaded with sales mock data) -->
      <PivotTable 
        v-else-if="activeTab === 'demo'"
        :report="reportData"
        title="Demo Dati Vendite"
        height="calc(100vh - 160px)"
        default-theme="dark"
        :key="'demo-view'"
      />
    </main>
  </div>
</template>

<script>
import PivotTable from './components/PivotTable.vue';
import { salesData } from './utils/mockData';

export default {
  name: 'App',
  components: {
    PivotTable
  },
  data() {
    return {
      activeTab: 'clean', // Starts with clean upload page
      reportData: {
        data: salesData,
        rows: ['Regione', 'Categoria'],
        columns: ['Anno'],
        values: [
          { field: 'Fatturato', aggregator: 'sum', label: 'Fatturato Totale' },
          { field: 'Quantità', aggregator: 'sum', label: 'Pezzi Venduti' }
        ]
      }
    };
  }
};
</script>

<style>
/* Reset base e layout a tutto schermo per l'aggregatore */
body {
  margin: 0;
  padding: 0;
  background-color: #020617;
  color: #f8fafc;
  font-family: 'Outfit', -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
  -webkit-font-smoothing: antialiased;
}

.app-container {
  padding: 0;
  min-height: 100vh;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  background-color: #020617;
}

.app-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 16px 24px;
  background: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(12px);
  border-bottom: 1px solid #1e293b;
  position: sticky;
  top: 0;
  z-index: 100;
}

.app-logo {
  display: flex;
  align-items: center;
  gap: 10px;
}

.logo-icon {
  font-size: 1.8rem;
}

.logo-text {
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: -0.025em;
  background: linear-gradient(135deg, #f8fafc 0%, #cbd5e1 100%);
  -webkit-background-clip: text;
  -webkit-text-fill-color: transparent;
}

.logo-subtext {
  color: #6366f1;
  -webkit-text-fill-color: initial;
}

.app-tabs {
  display: flex;
  background-color: #0f172a;
  padding: 4px;
  border-radius: 10px;
  border: 1px solid #1e293b;
  gap: 4px;
}

.tab-btn {
  background: none;
  border: none;
  color: #94a3b8;
  padding: 8px 16px;
  border-radius: 8px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  display: flex;
  align-items: center;
  gap: 8px;
}

.tab-btn:hover {
  color: #f8fafc;
  background-color: rgba(255, 255, 255, 0.03);
}

.tab-btn.active {
  background-color: #1e293b;
  color: #f8fafc;
  box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06);
}

.app-content {
  flex: 1;
  padding: 24px;
  box-sizing: border-box;
}
</style>
