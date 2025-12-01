/**
 * FIXTURE PLANNER PRO v2.0
 * Generación completa + Importación de Modelos Excel
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
    templates: {} // Se llenará dinámicamente
};

// --- UTILS ---
function safeId() { return Date.now().toString(36) + Math.random().toString(36).substr(2); }

function excelTimeToString(fraction) {
    if (!fraction || isNaN(fraction)) return "09:00"; // Default
    const totalSeconds = Math.round(fraction * 24 * 3600);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;
}

// --- GENERADORES DE ESTRUCTURA (Lógica de tus Modelos) ---
// Estos generadores crean la estructura "abstracta" (quién juega con quién)
// y la distribuyen en slots genéricos si no hay un Excel cargado.

const ModelGenerators = {
    "8x3_normal": function(teams) {
        // Estructura oficial 8x3 (24 equipos / 8 zonas)
        let slots = [];
        
        // --- FASE 1: ZONAS (Día 1 y 2) ---
        // Zonas A a H (1-8). Equipos 1,2,3 en A, etc.
        const zonas = ['A','B','C','D','E','F','G','H'];
        
        // Rondas genéricas de zona triangular (1vs2, 2vs3, 3vs1)
        const rondasZona = [
            {r:1, m:[1,2]}, {r:2, m:[2,3]}, {r:3, m:[3,1]} // Índices relativos (1,2,3)
        ];

        let matchCounter = 0;
        
        zonas.forEach((zona, zIdx) => {
            const baseTeamIdx = zIdx * 3; // 0, 3, 6...
            rondasZona.forEach(ronda => {
                // Cálculo simple de día/hora para el default
                // Día 1: Rondas 1 y parte de 2. Día 2: Resto.
                matchCounter++;
                let dia = matchCounter <= 12 ? 1 : 2; 
                let cancha = (matchCounter % 2) + 1;
                
                // Hora simulada (0.375 = 9am, + 1h cada 2 partidos)
                let timeBase = 0.375 + (Math.floor((matchCounter-1)/2) * (1/24)); 
                if (dia === 2) timeBase = 0.375 + (Math.floor((matchCounter-13)/2) * (1/24));

                slots.push({
                    d: dia, t: timeBase, c: cancha, z: zona,
                    h: (baseTeamIdx + ronda.m[0]).toString(), // ID Equipo "1", "2"...
                    a: (baseTeamIdx + ronda.m[1]).toString()
                });
            });
        });

        // --- FASE 2: A1/A2 (Días 3, 4, 5) ---
        // A1: 1° de A, D, E, H (Simulado: Eq 1, 10, 13, 22)
        // A2: 1° de B, C, F, G (Simulado: Eq 4, 7, 16, 19)
        // En el template default usamos placeholders de texto para fases finales
        const matchesF2 = [
            // A1
            { h: "1° Zona A", a: "1° Zona D" }, { h: "1° Zona E", a: "1° Zona H" },
            { h: "1° Zona A", a: "1° Zona E" }, { h: "1° Zona D", a: "1° Zona H" },
            { h: "1° Zona A", a: "1° Zona H" }, { h: "1° Zona D", a: "1° Zona E" },
            // A2
            { h: "1° Zona B", a: "1° Zona C" }, { h: "1° Zona F", a: "1° Zona G" },
            { h: "1° Zona B", a: "1° Zona F" }, { h: "1° Zona C", a: "1° Zona G" },
            { h: "1° Zona B", a: "1° Zona G" }, { h: "1° Zona C", a: "1° Zona F" }
        ];

        matchesF2.forEach((m, i) => {
            let dia = 3 + Math.floor(i/4); // Días 3, 4, 5
            slots.push({ d: dia, t: 0.5 + (i%2)*0.05, c: (i%2)+1, z: i<6?"Zona A1":"Zona A2", h: m.h, a: m.a });
        });

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
        
        // Inicializar templates por defecto si no existen
        if (!State.templates["8x3_normal"]) {
            // Generamos la estructura base para que el usuario vea algo al principio
            State.templates["8x3_normal"] = ModelGenerators["8x3_normal"]();
        }
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
        // ... guardar resto
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
        
        // Buscar índices flexibles
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

            // Procesar Cancha: Soporte para AAA, 1, Cancha 1
            let cVal = cols[idxCourt].trim();
            let cNum = 1;
            if (['AAA','1','Cancha 1'].includes(cVal)) cNum = 1;
            else if (['BBB','2','Cancha 2'].includes(cVal)) cNum = 2;
            else if (['CCC','3','Cancha 3'].includes(cVal)) cNum = 3;
            else if (['DDD','4','Cancha 4'].includes(cVal)) cNum = 4;
            else if (['EEE','5','Cancha 5'].includes(cVal)) cNum = 5;
            else if (['FFF','6','Cancha 6'].includes(cVal)) cNum = 6;
            else cNum = parseInt(cVal) || 1;

            newTemplate.push({
                d: parseFloat(cols[idxDay].replace(',', '.')), // Días pueden ser 1.0
                t: parseFloat(cols[idxTime].replace(',', '.')), // Horas Excel
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
        // Si no existe, usamos el default
        let template = State.templates[modelKey];
        if (!template && ModelGenerators[modelKey]) {
            template = ModelGenerators[modelKey](State.teams); // Generar on-the-fly
        }

        if (!template || template.length === 0) {
            alert("No hay plantilla para este modelo. Por favor sube el archivo CSV del modelo.");
            return;
        }

        if (State.teams.length < 2) return alert("Faltan equipos.");

        // Mapeo de Equipos: Ordenamos por Zona para coincidir con índices 1, 2, 3...
        const sortedTeams = [...State.teams].sort((a, b) => a.zone.localeCompare(b.zone));
        const teamMap = {};
        sortedTeams.forEach((t, i) => {
            const idx = (i+1).toString();
            teamMap[idx] = t.name;
            teamMap[idx + ".0"] = t.name; // Soporte Excel "1.0"
        });

        const matches = [];
        const startDate = new Date(State.config.startDate + "T00:00:00");

        template.forEach((slot, idx) => {
            const matchDate = new Date(startDate);
            matchDate.setDate(startDate.getDate() + (Math.floor(slot.d) - 1));

            // Resolver nombres: Si es número, busca en mapa. Si es texto, úsalo literal.
            let hName = teamMap[slot.h] || slot.h;
            let aName = teamMap[slot.a] || slot.a;

            // Nombre cancha
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
