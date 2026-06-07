# Vue Aggregatore (Vue Pivot Table)

Un componente per **Vue 3** potente, interattivo e ad alte prestazioni per la creazione di **tabelle pivot (Pivot Tables) e aggregazioni multidimensionali**.

Permette agli utenti di esplorare, aggregare e analizzare dataset complessi direttamente nel browser tramite un'interfaccia utente premium (supporto tema Dark/Light, drag-and-drop e visualizzazione gerarchica).

---

## ✨ Caratteristiche Principali

* 📊 **Motore di Aggregazione Indipendente**: Raggruppamento multidimensionale su righe e colonne con calcolo di subtotali e totali generali.
* 🔢 **Operazioni Matematiche**: Supporto per **Somma (Sum)**, **Media (Average)**, **Conteggio (Count)**, **Minimo (Min)**, **Massimo (Max)** e **Prodotto (Product)**.
* 🎛️ **Configuratore Campi (Builder)**: Interfaccia Drag & Drop nativa (HTML5) per disporre al volo i campi in Righe, Colonne e Valori (con selettori di aggregazione). Menù contestuali a click per dispositivi touch.
* 🌲 **Griglia Gerarchica**: Visualizzazione ad albero comprimibile/espandibile per esplorare i dati con intestazioni fisse (**sticky headers**).
* 🔍 **Filtro di Ricerca**: Ricerca testuale istantanea per filtrare le righe.
* 🔎 **Drill-Down Dati**: Doppio clic su qualsiasi cella numerica per aprire una modale contenente l'elenco dei singoli record di origine associati a quella cella.
* 💾 **Esportazione**: Funzionalità integrate per esportare la griglia pivot elaborata in file nativi **Excel (.xlsx)**, **CSV** (formattato e ottimizzato per Microsoft Excel con BOM) e **JSON**.
* 📂 **Importazione Excel/CSV**: Pulsante integrato nella barra degli strumenti per caricare direttamente file Excel (`.xlsx`, `.xls`) o file `.csv`, convertendoli all'istante nel dataset attivo del componente.
* ⚙️ **Configuratore JSON (`report`)**: Carica al volo dati e layout con una singola prop JSON, supportando sia formati semplificati che formati strutturati complessi.

---

## 📦 Installazione

Puoi includere la libreria all'interno dei tuoi progetti Vue 3.

### 1. Collegamento Locale (per sviluppo)
Se desideri includere la libreria localmente nel tuo progetto senza pubblicarla su npm, aggiungila alle dipendenze del tuo `package.json` (es. in `reports-web`):

```json
{
  "dependencies": {
    "vue-aggregatore": "file:../aggregatore"
  }
}
```
*Sostituisci il percorso `file:...` con il percorso relativo corretto della cartella della libreria aggregatore.*

Esegui poi:
```bash
npm install
```

---

## 🚀 Utilizzo Base

### 1. Importazione dei file
Nel tuo file di ingresso (o all'interno del tuo componente Vue):

```javascript
import { PivotTable } from 'vue-aggregatore';
import 'vue-aggregatore/style.css'; // Importa gli stili premium del componente
```

### 2. Uso con Props Classiche (`data` + `initial-config`)
In questo scenario, passi il dataset come array di oggetti e la configurazione iniziale come oggetto separato:

```html
<template>
  <PivotTable 
    :data="clientiVendite"
    :initial-config="pivotConfig"
    title="Rapporto Vendite"
    height="500px"
    default-theme="dark"
  />
</template>

<script>
import { PivotTable } from 'vue-aggregatore';
import 'vue-aggregatore/style.css';

export default {
  components: { PivotTable },
  data() {
    return {
      clientiVendite: [
        { Regione: 'Nord', Categoria: 'Elettronica', Fatturato: 15000, Anno: 2024 },
        { Regione: 'Nord', Categoria: 'Abbigliamento', Fatturato: 8000, Anno: 2024 },
        { Regione: 'Sud', Categoria: 'Elettronica', Fatturato: 22000, Anno: 2025 }
      ],
      pivotConfig: {
        rows: ['Regione', 'Categoria'],
        columns: ['Anno'],
        values: [
          { field: 'Fatturato', aggregator: 'sum', label: 'Fatturato Totale' }
        ]
      }
    };
  }
};
</script>
```

### 3. Uso con soli Dati (Senza configurazione iniziale)
È possibile passare anche solo l'array di dati grezzi. In questo caso, le colonne, le righe e le misure aggregate partiranno vuote e il configuratore sul pannello sinistro permetterà all'utente di impostarle in qualsiasi momento. I campi disponibili vengono estratti automaticamente dal dataset:

```html
<template>
  <PivotTable :data="dataset" title="Esplorazione Dati Libera" />
</template>

<script>
import { PivotTable } from 'vue-aggregatore';
import 'vue-aggregatore/style.css';

export default {
  components: { PivotTable },
  data() {
    return {
      dataset: [
        { Prodotto: 'A', Mese: 'Gennaio', Vendite: 100 },
        { Prodotto: 'B', Mese: 'Gennaio', Vendite: 150 },
        { Prodotto: 'A', Mese: 'Febbraio', Vendite: 200 }
      ]
    };
  }
};
</script>
```

---

## ⚙️ Uso Avanzato: Configurazione JSON Singola (`report`)

È possibile configurare sia la sorgente dati che il layout (incluso l'ordinamento e le aggregazioni dei valori) passando un singolo file o stringa JSON tramite la prop `:report`.

### Formato Strutturato
```html
<template>
  <PivotTable :report="reportJSON" />
</template>

<script>
import { PivotTable } from 'vue-aggregatore';
import 'vue-aggregatore/style.css';

export default {
  components: { PivotTable },
  data() {
    return {
      reportJSON: {
        dataSource: {
          data: [
            { Prodotto: 'Smart TV', Marca: 'Samsung', Anno: 2024, Unità: 15, Ricavo: 12000 },
            { Prodotto: 'Smart TV', Marca: 'LG', Anno: 2024, Unità: 22, Ricavo: 15400 }
          ]
        },
        slice: {
          rows: [
            { uniqueName: 'Prodotto' },
            { uniqueName: 'Marca' }
          ],
          columns: [
            { uniqueName: 'Anno' }
          ],
          measures: [
            { uniqueName: 'Ricavo', aggregation: 'sum', caption: 'Fatturato' },
            { uniqueName: 'Unità', aggregation: 'average', caption: 'Media Unità' }
          ]
        }
      }
    };
  }
};
</script>
```
*Nota: Il componente parser mappa in modo trasparente le proprietà `uniqueName` ➔ `field`, `aggregation` ➔ `aggregator` e `caption` ➔ `label`.*

---

## 📖 Riferimento API

### Props

| Proprietà | Tipo | Predefinito | Descrizione |
| :--- | :--- | :--- | :--- |
| `report` | `Object` \| `String` | `null` | Configurazione singola del report (formato strutturato o formato semplice). Ha la priorità su `data` e `initialConfig`. |
| `data` | `Array` | `[]` | Dataset grezzo (utilizzato se `report` non è fornito). |
| `initialConfig` | `Object` | `{ rows: [], columns: [], values: [] }` | Campi righe, colonne e valori iniziali (utilizzato se `report` non è fornito). |
| `title` | `String` | `'Analisi Dati'` | Titolo visualizzato nella barra superiore del componente. |
| `height` | `String` | `'550px'` | Altezza fissa del contenitore della griglia (supporta `px`, `vh`, `calc()`). |
| `defaultTheme` | `String` | `'dark'` | Tema iniziale del componente (`'dark'` o `'light'`). |

### Eventi Emessi (`emits`)

* **`change`**: Emesso ogni volta che la configurazione del report (righe, colonne, valori) cambia a seguito di modifiche da parte dell'utente nel pannello builder.
  * Argomenti: `{ rows: Array, columns: Array, values: Array }`
* **`export`**: Emesso al completamento dell'esportazione di un report.
  * Argomenti: `{ format: 'csv' | 'json', data: Any }`

---

## 🛠️ Comandi di Sviluppo (All'interno del pacchetto)

Se stai modificando il codice sorgente della libreria:

* **Eseguire il Server Demo in Locale**:
  ```bash
  npm run dev
  ```
  *(Avvia il server Vite a http://localhost:5173/)*

* **Compilare per la Produzione (Modalità Libreria)**:
  ```bash
  npm run build
  ```
  *(Genera i file in `dist/` pronti per la pubblicazione)*

* **Verificare la Build Locale**:
  ```bash
  npm run preview
  ```
