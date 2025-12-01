/**
 * FIXTURE PLANNER PRO v2.2
 * Corrección de Caché y Generación Completa (52 Partidos)
 */

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
    templates: {} 
};

// --- UTILS ---
function safeId() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }

function excelTimeToString(fraction) {
    if (!fraction || isNaN(fraction)) return "09:00"; 
    const totalSeconds = Math.round(fraction * 24 * 3600);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;
}

// --- GENERADORES DE ESTRUCTURA (Lógica 52 Partidos) ---
const ModelGenerators = {
    "8x3_normal": function() {
        let slots = [];
        let matchCounter = 0;

        // Helper para agregar partido
        const add = (d, t, c, z, h, a) => {
            matchCounter++;
            slots.push({ d, t, c, z, h, a });
        };

        // --- FASE 1: ZONAS (24 Partidos) ---
        // Distribución teórica en Días 1 y 2
        // Zonas A..H. Equipos relativos: A(1,2,3), B(4,5,6)...
        const zonas = ['A','B','C','D','E','F','G','H'];
        // Rondas: 1vs2, 2vs3, 3vs1 (Indices relativos 0,1,2)
        const rondas = [[0,1], [1,2], [2,0]]; 

        zonas.forEach((zona, zIdx) => {
            const base = zIdx * 3; // Offset de equipo
            rondas.forEach((r, rIdx) => {
                // Cálculo simple para distribuir en D1/D2
                const globalMatch = (zIdx * 3) + rIdx + 1;
                const dia = globalMatch <= 12 ? 1 : 2;
                const hora = 0.375 + (rIdx * 0.05); 
                const cancha = (zIdx % 2) + 1;
                
                add(dia, hora, cancha, `Zona ${zona}`, (base + r[0] + 1).toString(), (base + r[1] + 1).toString());
            });
        });

        // --- FASE 2: ZONAS A1 / A2 (12 Partidos) ---
        // A1: 1° de A, D, E, H
        // A2: 1° de B, C, F, G
        const fase2 = [
            // Ronda 1
            {z:'A1', h:'1ºA', a:'1ºD'}, {z:'A1', h:'1ºE', a:'1ºH'},
            {z:'A2', h:'1ºB', a:'1ºC'}, {z:'A2', h:'1ºF', a:'1ºG'},
            // Ronda 2
            {z:'A1', h:'1ºA', a:'1ºE'}, {z:'A1', h:'1ºD', a:'1ºH'},
            {z:'A2', h:'1ºB', a:'1ºF'}, {z:'A2', h:'1ºC', a:'1ºG'},
            // Ronda 3
            {z:'A1', h:'1ºA', a:'1ºH'}, {z:'A1', h:'1ºD', a:'1ºE'},
            {z:'A2', h:'1ºB', a:'1ºG'}, {z:'A2', h:'1ºC', a:'1ºF'}
        ];
        
        fase2.forEach((m, i) => {
            let dia = 3 + Math.floor(i/4); // Días 3, 4, 5
            add(dia, 0.375 + (i%4)*0.04, (i%2)+1, `Zona ${m.z}`, m.h, m.a);
        });

        // --- FASE 3: LLAVE B (2dos Puestos) - 8 Partidos ---
        // Cuartos
        const b_qf = [
            {h:'2ºA', a:'2ºD'}, {h:'2ºE', a:'2ºH'}, {h:'2ºB', a:'2ºC'}, {h:'2ºF', a:'2ºG'}
        ];
        b_qf.forEach((m, i) => add(3, 0.6, (i%2)+1, 'Llave B (4tos)', m.h, m.a));
        
        // Semis
        add(4, 0.6, 1, 'Llave B (Semis)', 'GP Q1', 'GP Q2');
        add(4, 0.6, 2, 'Llave B (Semis)', 'GP Q3', 'GP Q4');
        
        // Finales
        add(5, 0.6, 1, 'Llave B (Final)', 'GP S1', 'GP S2');
        add(5, 0.6, 2, 'Llave B (3er)', 'PP S1', 'PP S2');

        // --- FASE 4: LLAVE C (3eros Puestos) - 8 Partidos ---
        // Cuartos
        const c_qf = [
            {h:'3ºA', a:'3ºD'}, {h:'3ºE', a:'3ºH'}, {h:'3ºB', a:'3ºC'}, {h:'3ºF', a:'3ºG'}
        ];
        c_qf.forEach((m, i) => add(3, 0.7, (i%2)+1, 'Llave C (4tos)', m.h, m.a));
        
        // Semis
        add(4, 0.7, 1, 'Llave C (Semis)', 'GP Q1', 'GP Q2');
        add(4, 0.7, 2, 'Llave C (Semis)', 'GP Q3', 'GP Q4');
        
        // Finales
        add(5, 0.7, 1, 'Llave C (Final)', 'GP S1', 'GP S2');
        add(5, 0.7, 2, 'Llave C (3er)', 'PP S1', 'PP S2');

        return slots;
    }
};

// --- APP ---
const App = {
    init: function() {
        this.loadState();
        this.bindEvents();
        this.renderCourts(); 
        this.renderTeams();
        this.updateUI(); 
        
        // --- CORRECCIÓN CRÍTICA ---
        // Forzamos la regeneración del template por defecto con la lógica nueva
        // sobrescribiendo cualquier versión vieja guardada en localStorage.
        State.templates["8x3_normal"] = ModelGenerators["8x3_normal"]();
        this.saveState(); // Guardamos inmediatamente el template actualizado
    },

    goToStep: function(stepNumber) {
        if (stepNumber === 2 && !this.validateStep1()) return;
        if (stepNumber === 3) this.saveCourtsState();
        if (stepNumber === 4) {
            if (State.teams.length < 2) {
                alert("Carga equipos antes de generar.");
                return;
            }
            if (State.matches.length > 0) this.renderFixture();
        }

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
        const model = document.getElementById('cfg-model').value;
        const date = document.getElementById('cfg-start-date').value;

        if (!name || !model || !date) return alert("Completa Nombre, Modelo y Fecha.") && false;
        
        State.config.tournamentName = name;
        State.config.model = model;
        State.config.startDate = date;
        State.config.daysCount = parseInt(document.getElementById('cfg-days-count').value) || 5;
        return true;
    },

    generateCourtSlots: function() {
        const count = parseInt(document.getElementById('cfg-courts-count').value) || 1;
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

    // --- STEP 3: EQUIPOS ---
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
        if (lines.length < 2) return alert("CSV vacío.");

        const header = lines[0];
        const delimiter = (header.match(/;/g)||[]).length > (header.match(/,/g)||[]).length ? ';' : ',';
        const headers = header.split(delimiter).map(h => h.trim().toLowerCase());
        
        let zoneIdx = headers.findIndex(h => h.includes('zona'));
        let nameIdx = headers.findIndex(h => h.includes('equipo') || h.includes('nombre'));
        if (zoneIdx === -1) zoneIdx = 0; 
        if (nameIdx === -1) nameIdx = 1;

        let added = 0;
        for (let i = 1; i < lines.length; i++) {
            const parts = lines[i].split(delimiter);
            let name = parts[nameIdx] ? parts[nameIdx].trim() : "";
            let zone = parts[zoneIdx] ? parts[zoneIdx].trim().toUpperCase() : "?";
            
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
        const zone = document.getElementById('manual-team-zone').value.toUpperCase();
        if(name) {
            State.teams.push({ id: safeId(), name, zone: zone || "?" });
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

    // --- STEP 4: GESTIÓN DE MODELOS ---
    handleModelUpload: function(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => {
            if(App.parseModelCsv(e.target.result, file.name)) {
                alert("Modelo cargado exitosamente. Seleccionado automáticamente.");
            }
        };
        reader.readAsText(file);
        event.target.value = '';
    },

    parseModelCsv: function(csvText, fileName) {
        const lines = csvText.split(/\r\n|\n/).filter(l => l.trim());
        if(lines.length < 2) return false;

        const delimiter = (lines[0].match(/;/g)||[]).length > (lines[0].match(/,/g)||[]).length ? ';' : ',';
        const headers = lines[0].toLowerCase().split(delimiter);
        
        const idxDay = headers.findIndex(h => h.includes('día') || h.includes('dia'));
        const idxTime = headers.findIndex(h => h.includes('hora'));
        const idxCourt = headers.findIndex(h => h.includes('cancha'));
        const idxZone = headers.findIndex(h => h.includes('zona'));
        const idxHome = headers.findIndex(h => h.includes('equipo l'));
        const idxAway = headers.findIndex(h => h.includes('equipo v'));

        if(idxDay === -1 || idxTime === -1) {
            alert("Error: El CSV del modelo debe tener columnas 'Día' y 'Hora'.");
            return false;
        }

        const newTemplate = [];
        for(let i=1; i<lines.length; i++) {
            const cols = lines[i].split(delimiter);
            if(cols.length < 5) continue;

            let cVal = cols[idxCourt].trim();
            let cNum = 1;
            if (['AAA','1','Cancha 1'].includes(cVal)) cNum = 1;
            else if (['BBB','2','Cancha 2'].includes(cVal)) cNum = 2;
            else cNum = parseInt(cVal) || 1;

            newTemplate.push({
                d: parseFloat(cols[idxDay].replace(',', '.')), 
                t: parseFloat(cols[idxTime].replace(',', '.')),
                c: cNum,
                z: cols[idxZone] ? cols[idxZone].trim() : "-",
                h: cols[idxHome].trim(),
                a: cols[idxAway].trim()
            });
        }

        const modelId = "custom_" + Date.now();
        State.templates[modelId] = newTemplate;
        
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

        // Fallback robusto
        if (!template && ModelGenerators[modelKey]) {
            template = ModelGenerators[modelKey]();
        }

        if (!template || template.length === 0) {
            alert("No hay plantilla para este modelo.");
            return;
        }

        if (State.teams.length < 2) return alert("Faltan equipos.");

        const sortedTeams = [...State.teams].sort((a, b) => a.zone.localeCompare(b.zone));
        const teamMap = {};
        
        sortedTeams.forEach((t, i) => {
            const idx = (i+1).toString();
            teamMap[idx] = t.name;
            teamMap[idx + ".0"] = t.name;
        });

        const matches = [];
        const startDate = new Date(State.config.startDate + "T00:00:00");

        template.forEach((slot, idx) => {
            const matchDate = new Date(startDate);
            matchDate.setDate(startDate.getDate() + (Math.floor(slot.d) - 1));

            let hName = teamMap[slot.h] || slot.h;
            let aName = teamMap[slot.a] || slot.a;

            const courtName = State.courts[slot.c - 1] ? State.courts[slot.c - 1].name : `Cancha ${slot.c}`;

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
        alert(`Fixture generado: ${matches.length} partidos.`);
    },

    renderFixture: function() {
        const tbody = document.getElementById('fixture-body');
        if(!tbody) return;
        
        if (State.matches.length === 0) {
            document.getElementById('empty-fixture-msg').style.display = 'block';
            return;
        }
        document.getElementById('empty-fixture-msg').style.display = 'none';
        document.getElementById('match-count').textContent = State.matches.length;

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
    },

    saveState: function() { localStorage.setItem('fixtureProState', JSON.stringify(State)); },
    loadState: function() {
        const saved = localStorage.getItem('fixtureProState');
        if (saved) {
            const parsed = JSON.parse(saved);
            Object.assign(State, parsed);
            if(parsed.templates) Object.assign(State.templates, parsed.templates);
        }
    },
    updateUI: function() {
        if(State.config.tournamentName) document.getElementById('cfg-name').value = State.config.tournamentName;
        if(State.config.startDate) document.getElementById('cfg-start-date').value = State.config.startDate;
        
        const select = document.getElementById('cfg-model');
        Object.keys(State.templates).forEach(key => {
            if(key.startsWith('custom_')) {
                const opt = document.createElement('option');
                opt.value = key;
                opt.text = "Modelo Importado"; 
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
        if (State.courts.length === 0) this.generateCourtSlots();
    }
};

document.addEventListener('DOMContentLoaded', () => { App.init(); });
