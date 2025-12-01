/**
 * FIXTURE PLANNER PRO v1.2
 * Motor de Plantillas + Importación de Modelos
 */

// --- BASE DE DATOS DE MODELOS (Pre-cargada con 8x3 Normal - Fase 1) ---
const DEFAULT_TEMPLATES = {
    "8x3_normal": [
        // Ejemplo de estructura interna basada en tus CSVs
        // Día 1 - Ronda 1
        { d: 1, t: 0.375, c: 1, z: "A", h: 1, a: 2 }, // 09:00 AAA
        { d: 1, t: 0.375, c: 2, z: "C", h: 7, a: 8 }, // 09:00 BBB
        { d: 1, t: 0.416, c: 1, z: "B", h: 4, a: 5 }, // 10:00 AAA
        { d: 1, t: 0.416, c: 2, z: "D", h: 10, a: 11 },
        { d: 1, t: 0.458, c: 1, z: "E", h: 13, a: 14 },
        { d: 1, t: 0.458, c: 2, z: "G", h: 19, a: 20 },
        { d: 1, t: 0.500, c: 1, z: "F", h: 16, a: 17 },
        { d: 1, t: 0.500, c: 2, z: "H", h: 22, a: 23 },
        // Día 1 - Ronda 2 (Parcial)
        { d: 1, t: 0.656, c: 1, z: "A", h: 2, a: 3 }, 
        { d: 1, t: 0.656, c: 2, z: "C", h: 8, a: 9 },
        // ... El sistema permitirá importar el CSV completo para tener todo
    ]
};

// --- ESTADO GLOBAL ---
const State = {
    config: {
        tournamentName: "",
        model: "8x3_normal", 
        startDate: "",
        daysCount: 5,
        matchDuration: 60,
        minRest: 60,
        hasLoserBracket: false,
        doubleBronze: false,
        courtsCount: 2
    },
    courts: [], 
    teams: [], 
    matches: [],
    templates: { ...DEFAULT_TEMPLATES } // Copia para permitir ediciones
};

// --- UTILS ---
function safeId() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }

// Convierte fracción Excel (0.375) a "09:00"
function excelTimeToString(fraction) {
    if (!fraction || isNaN(fraction)) return "00:00";
    const totalSeconds = Math.round(fraction * 24 * 3600);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;
}

// --- APP ---
const App = {
    init: function() {
        this.loadState();
        this.bindEvents();
        this.renderCourts(); 
        this.renderTeams();
        this.updateUI(); 
    },

    goToStep: function(stepNumber) {
        if (stepNumber === 2 && !this.validateStep1()) return;
        if (stepNumber === 3) this.saveCourtsState();
        
        // UI Updates
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`step-${stepNumber}`).classList.add('active');
        document.querySelectorAll('.step-btn').forEach(btn => {
            btn.classList.remove('active');
            if(btn.dataset.step == stepNumber) {
                btn.classList.add('active');
                btn.removeAttribute('disabled');
            }
        });
        this.saveState();
    },

    // --- STEP 1 & 2 ---
    validateStep1: function() {
        const name = document.getElementById('cfg-name').value;
        const date = document.getElementById('cfg-start-date').value;
        if (!name || !date) return alert("Falta Nombre o Fecha.") && false;
        
        State.config.tournamentName = name;
        State.config.model = document.getElementById('cfg-model').value;
        State.config.startDate = date;
        State.config.daysCount = parseInt(document.getElementById('cfg-days-count').value);
        // ... resto de configs
        return true;
    },

    generateCourtSlots: function() {
        const count = parseInt(document.getElementById('cfg-courts-count').value);
        State.courts = [];
        for(let i=1; i<=count; i++) {
            State.courts.push({ id: i, name: `Cancha ${i}`, openTime:"09:00", closeTime:"22:00", hasBreak:false });
        }
        this.renderCourts();
        this.saveState();
    },

    renderCourts: function() {
        const c = document.getElementById('courts-container');
        if(!c) return;
        c.innerHTML = State.courts.map((court, i) => `
            <div class="court-card">
                <div class="form-group"><label>Nombre</label><input type="text" value="${court.name}" onchange="App.updateCourt(${i},'name',this.value)"></div>
            </div>
        `).join('');
    },
    updateCourt: (i, k, v) => State.courts[i][k] = v,
    saveCourtsState: () => App.saveState(),

    // --- STEP 3: EQUIPOS (IMPORTACIÓN ROBUSTA) ---
    handleCsvUpload: function(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => App.processCsvData(e.target.result);
        reader.readAsText(file);
        event.target.value = ''; 
    },

    processCsvData: function(csvText) {
        const lines = csvText.split(/\r\n|\n/).filter(line => line.trim() !== "");
        if (lines.length < 2) return alert("CSV vacío o sin datos.");

        // Detectar delimitador
        const header = lines[0];
        const delimiter = (header.match(/;/g)||[]).length > (header.match(/,/g)||[]).length ? ';' : ',';
        
        // Detectar columnas
        const headers = header.split(delimiter).map(h => h.trim().toLowerCase());
        let zoneIdx = headers.findIndex(h => h.includes('zona'));
        let nameIdx = headers.findIndex(h => h.includes('equipo') || h.includes('nombre'));
        if (zoneIdx === -1) zoneIdx = 0; // Fallback
        if (nameIdx === -1) nameIdx = 1;

        let added = 0;
        for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(delimiter);
            const name = parts[nameIdx] ? parts[nameIdx].trim() : "";
            const zone = parts[zoneIdx] ? parts[zoneIdx].trim().toUpperCase() : "?";
            
            if (name && !State.teams.some(t => t.name === name)) {
                State.teams.push({ id: safeId(), name, zone });
                added++;
            }
        }
        this.renderTeams();
        this.saveState();
        if(added > 0) alert(`Importados ${added} equipos.`);
    },

    addManualTeam: function() {
        const name = document.getElementById('manual-team-name').value;
        const zone = document.getElementById('manual-team-zone').value;
        if(name) {
            State.teams.push({ id: safeId(), name, zone: zone.toUpperCase() || "?" });
            this.renderTeams();
            this.saveState();
            document.getElementById('manual-team-name').value = "";
        }
    },

    deleteTeam: function(id) {
        State.teams = State.teams.filter(t => t.id !== id);
        this.renderTeams();
        this.saveState();
    },
    deleteAllTeams: function() {
        if(confirm("¿Borrar todos?")) { State.teams = []; this.renderTeams(); this.saveState(); }
    },

    renderTeams: function() {
        const tbody = document.getElementById('teams-list-body');
        if(!tbody) return;
        document.getElementById('team-count').textContent = State.teams.length;
        
        if(State.teams.length === 0) {
            document.getElementById('empty-teams-msg').style.display = 'block';
            document.getElementById('teams-table').style.display = 'none';
            return;
        }
        document.getElementById('empty-teams-msg').style.display = 'none';
        document.getElementById('teams-table').style.display = 'table';

        // Ordenar por Zona
        const sorted = [...State.teams].sort((a,b) => a.zone.localeCompare(b.zone));
        
        tbody.innerHTML = sorted.map((t, i) => `
            <tr>
                <td>${i+1}</td>
                <td><span class="stats-badge" style="background:var(--primary);color:white">${t.zone}</span></td>
                <td>${t.name}</td>
                <td style="text-align:right"><button class="btn-icon" onclick="App.deleteTeam('${t.id}')"><i class="fa-solid fa-trash"></i></button></td>
            </tr>
        `).join('');
    },

    // --- STEP 4: GESTIÓN DE MODELOS (NUEVO) ---
    
    // Importar el archivo CSV de Modelo (Ej: "8x3 normal...csv")
    handleModelUpload: function(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            const success = App.parseModelCsv(e.target.result, file.name);
            if(success) alert(`Modelo "${file.name}" cargado exitosamente. Seleccionalo en el menú.`);
        };
        reader.readAsText(file);
        event.target.value = '';
    },

    parseModelCsv: function(csvText, fileName) {
        const lines = csvText.split(/\r\n|\n/).filter(l => l.trim());
        if(lines.length < 2) return false;

        const delimiter = (lines[0].match(/;/g)||[]).length > (lines[0].match(/,/g)||[]).length ? ';' : ',';
        // Asumimos orden del Excel: Nro, Día, Hora, Cancha, Zona, Equipo L, Equipo V
        // O buscamos cabeceras
        const headers = lines[0].toLowerCase().split(delimiter);
        const idxDay = headers.findIndex(h => h.includes('día') || h.includes('dia'));
        const idxTime = headers.findIndex(h => h.includes('hora'));
        const idxCourt = headers.findIndex(h => h.includes('cancha'));
        const idxZone = headers.findIndex(h => h.includes('zona'));
        const idxHome = headers.findIndex(h => h.includes('equipo l'));
        const idxAway = headers.findIndex(h => h.includes('equipo v'));

        if(idxDay === -1 || idxTime === -1) {
            alert("El CSV del modelo no tiene columnas válidas (Día, Hora, Cancha, Equipo L, Equipo V).");
            return false;
        }

        const newTemplate = [];
        for(let i=1; i<lines.length; i++) {
            const cols = lines[i].split(delimiter);
            if(cols.length < 5) continue;

            // Mapeo de Cancha (AAA -> 1, BBB -> 2, etc)
            let cVal = cols[idxCourt].trim();
            let cNum = 1;
            if(cVal === 'AAA') cNum = 1;
            else if(cVal === 'BBB') cNum = 2;
            else if(cVal === 'CCC') cNum = 3;
            else if(cVal === 'DDD') cNum = 4;
            else if(cVal === 'EEE') cNum = 5;
            else if(cVal === 'FFF') cNum = 6;
            else cNum = parseInt(cVal) || 1;

            newTemplate.push({
                d: parseInt(cols[idxDay]),
                t: parseFloat(cols[idxTime].replace(',', '.')), // Asegurar punto decimal
                c: cNum,
                z: cols[idxZone].trim(),
                h: cols[idxHome].trim(), // Puede ser número "1.0" o texto "1er. 1º"
                a: cols[idxAway].trim()
            });
        }

        // Guardar en el estado con un nombre simplificado
        const modelId = "custom_" + Date.now();
        State.templates[modelId] = newTemplate;
        
        // Agregar opción al select de modelos
        const select = document.getElementById('cfg-model');
        const option = document.createElement('option');
        option.value = modelId;
        option.text = fileName.replace('.csv', '');
        option.selected = true;
        select.add(option);
        
        State.config.model = modelId;
        this.saveState();
        return true;
    },

    generateFixture: function() {
        const modelKey = State.config.model;
        let template = State.templates[modelKey];

        // Fallback a default si no encuentra
        if (!template && DEFAULT_TEMPLATES[modelKey]) {
            template = DEFAULT_TEMPLATES[modelKey];
        }

        if (!template) {
            alert("No hay plantilla cargada para este modelo. Por favor sube el archivo CSV del modelo en el Paso 4.");
            return;
        }

        if (State.teams.length < 2) return alert("Faltan equipos.");

        // 1. Mapear Equipos (Ordenados por Zona -> 1..24)
        const sortedTeams = [...State.teams].sort((a, b) => a.zone.localeCompare(b.zone));
        const teamMap = {}; // ID plantilla -> Nombre Real
        
        sortedTeams.forEach((t, i) => {
            // Asumimos que el Excel usa IDs 1.0, 2.0... para equipos
            teamMap[(i+1).toString()] = t.name;
            teamMap[(i+1).toString() + ".0"] = t.name; // Soporte para "1.0"
        });

        // 2. Generar Partidos
        const matches = [];
        const startDateStr = State.config.startDate + "T00:00:00";
        const startDate = new Date(startDateStr);

        template.forEach((slot, idx) => {
            // Calcular fecha
            const matchDate = new Date(startDate);
            matchDate.setDate(startDate.getDate() + (slot.d - 1));

            // Resolver nombres
            // Si es un número (Fase 1), busca en el mapa. Si es texto (Fase 2 "1ro A"), lo deja tal cual.
            let hName = teamMap[slot.h] || slot.h;
            let aName = teamMap[slot.a] || slot.a;

            // Obtener nombre de cancha real
            const courtObj = State.courts[slot.c - 1];
            const courtName = courtObj ? courtObj.name : `Cancha ${slot.c}`;

            matches.push({
                id: idx + 1,
                date: matchDate.toLocaleDateString(),
                time: excelTimeToString(slot.t),
                court: courtName,
                zone: slot.z,
                home: hName,
                away: aName
            });
        });

        State.matches = matches;
        this.renderFixture();
        this.saveState();
    },

    renderFixture: function() {
        const tbody = document.getElementById('fixture-body');
        if(!tbody) return;
        tbody.innerHTML = State.matches.map(m => `
            <tr>
                <td>${m.id}</td>
                <td>${m.date}</td>
                <td>${m.time}</td>
                <td>${m.court}</td>
                <td><span class="stats-badge">${m.zone}</span></td>
                <td><strong>${m.home}</strong> vs <strong>${m.away}</strong></td>
            </tr>
        `).join('');
        
        document.getElementById('match-count').textContent = State.matches.length;
        document.getElementById('empty-fixture-msg').style.display = State.matches.length ? 'none' : 'block';
    },

    // --- UTILS INIT ---
    saveState: function() { localStorage.setItem('fixtureProState', JSON.stringify(State)); },
    loadState: function() {
        const saved = localStorage.getItem('fixtureProState');
        if (saved) {
            const parsed = JSON.parse(saved);
            Object.assign(State, parsed);
            // Restaurar templates custom
            if(parsed.templates) Object.assign(State.templates, parsed.templates);
        }
    },
    updateUI: function() {
        if(State.config.tournamentName) document.getElementById('cfg-name').value = State.config.tournamentName;
        if(State.config.startDate) document.getElementById('cfg-start-date').value = State.config.startDate;
        
        // Repoblar select con templates custom
        const select = document.getElementById('cfg-model');
        Object.keys(State.templates).forEach(key => {
            if(!DEFAULT_TEMPLATES[key] && key.startsWith('custom_')) {
                const opt = document.createElement('option');
                opt.value = key;
                opt.text = "Modelo Importado"; // Podríamos guardar el nombre original
                select.add(opt);
            }
        });
        if(State.config.model) select.value = State.config.model;
        
        if(State.courts.length > 0) document.getElementById('cfg-courts-count').value = State.courts.length;
    },
    bindEvents: function() {
        document.getElementById('btn-reset').addEventListener('click', () => {
            if(confirm("¿Reiniciar?")) { localStorage.removeItem('fixtureProState'); location.reload(); }
        });
        if(State.courts.length === 0) this.generateCourtSlots();
    }
};

document.addEventListener('DOMContentLoaded', () => { App.init(); });
