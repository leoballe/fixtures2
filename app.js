/**
 * FIXTURE PLANNER PRO v1.1
 * Módulo de Generación + Plantillas
 */

// --- BASE DE DATOS DE MODELOS (Templates extraídos de tus CSVs) ---
// Nota: En un futuro podríamos cargar esto desde archivos externos, 
// pero tenerlo aquí lo hace más rápido y robusto.
const TEMPLATES = {
    "8x3_normal": [
        // Día 1
        { d: 1, t: 0.375, c: 1, z: "A", h: 1, a: 2 }, // 09:00
        { d: 1, t: 0.375, c: 2, z: "C", h: 7, a: 8 },
        { d: 1, t: 0.416, c: 1, z: "B", h: 4, a: 5 }, // 10:00 aprox (0.4166)
        { d: 1, t: 0.416, c: 2, z: "D", h: 10, a: 11 },
        { d: 1, t: 0.458, c: 1, z: "E", h: 13, a: 14 }, // 11:00
        { d: 1, t: 0.458, c: 2, z: "G", h: 19, a: 20 },
        { d: 1, t: 0.500, c: 1, z: "F", h: 16, a: 17 }, // 12:00
        { d: 1, t: 0.500, c: 2, z: "H", h: 22, a: 23 },
        // ... (Aquí expandiremos con todos los partidos del Excel)
        // Ejemplo de lógica para mostrar que funciona:
        { d: 1, t: 0.656, c: 1, z: "A", h: 2, a: 3 }, // Tarde
        { d: 1, t: 0.656, c: 2, z: "C", h: 8, a: 9 },
    ]
};

// --- ESTADO GLOBAL ---
const State = {
    config: {
        tournamentName: "",
        model: "", 
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
    matches: [] // Aquí se guardará el resultado final
};

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
        if (stepNumber === 4) {
            if (State.teams.length < 2) {
                alert("Carga equipos antes de generar.");
                return;
            }
            // Si ya hay fixture generado, lo mostramos
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

    // --- PASO 1 Y 2 (Config & Canchas) ---
    validateStep1: function() {
        const name = document.getElementById('cfg-name').value;
        const model = document.getElementById('cfg-model').value;
        const date = document.getElementById('cfg-start-date').value;

        if (!name || !model || !date) {
            alert("Completa Nombre, Modelo y Fecha.");
            return false;
        }
        
        State.config.tournamentName = name;
        State.config.model = model;
        State.config.startDate = date;
        State.config.daysCount = parseInt(document.getElementById('cfg-days-count').value) || 5;
        State.config.matchDuration = parseInt(document.getElementById('cfg-match-duration').value) || 60;
        State.config.courtsCount = parseInt(document.getElementById('cfg-courts-count')?.value) || 2;
        
        return true;
    },

    generateCourtSlots: function() {
        const count = parseInt(document.getElementById('cfg-courts-count').value) || 1;
        State.courts = []; 
        for (let i = 1; i <= count; i++) {
            State.courts.push({
                id: i, name: `Cancha ${i}`, openTime: "09:00", closeTime: "22:00",
                hasBreak: false, breakStart: "13:00", breakEnd: "14:00"
            });
        }
        this.renderCourts();
        this.saveState();
    },

    renderCourts: function() {
        const container = document.getElementById('courts-container');
        if (!container) return;
        container.innerHTML = "";
        State.courts.forEach((court, index) => {
            container.innerHTML += `
                <div class="court-card">
                    <div class="form-group"><label>Nombre</label><input type="text" value="${court.name}" onchange="App.updateCourt(${index}, 'name', this.value)"></div>
                    <div class="form-group"><label>Apertura</label><input type="time" value="${court.openTime}" onchange="App.updateCourt(${index}, 'openTime', this.value)"></div>
                    <div class="form-group"><label>Cierre</label><input type="time" value="${court.closeTime}" onchange="App.updateCourt(${index}, 'closeTime', this.value)"></div>
                </div>`;
        });
    },

    updateCourt: function(index, field, value) {
        State.courts[index][field] = value;
    },
    saveCourtsState: function() { this.saveState(); },

    // --- PASO 3: EQUIPOS ---
    handleCsvUpload: function(event) {
        const file = event.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (e) => App.processCsvData(e.target.result);
        reader.readAsText(file);
        event.target.value = ''; 
    },

    processCsvData: function(csvText) {
        const lines = csvText.split(/\r\n|\n/);
        let addedCount = 0;
        // Limpiamos equipos anteriores si se importa uno nuevo
        // State.teams = []; 

        for (let i = 1; i < lines.length; i++) { // Asumiendo header en fila 0
            const line = lines[i].trim();
            if (!line) continue;
            let parts = line.split(';');
            if (parts.length < 2) parts = line.split(',');
            
            let zone = parts[0] ? parts[0].trim().toUpperCase() : '?';
            let name = parts[1] ? parts[1].trim() : '';

            if (name) {
                // Verificar duplicados
                if (!State.teams.some(t => t.name === name)) {
                    State.teams.push({ id: safeId("tm"), name, zone });
                    addedCount++;
                }
            }
        }
        if (addedCount > 0) {
            this.renderTeams();
            this.saveState();
            alert(`Se importaron ${addedCount} equipos.`);
        }
    },

    addManualTeam: function() {
        const name = document.getElementById('manual-team-name').value.trim();
        const zone = document.getElementById('manual-team-zone').value.trim().toUpperCase();
        if (!name) return alert("Nombre obligatorio.");
        State.teams.push({ id: safeId("tm"), name, zone: zone || "?" });
        document.getElementById('manual-team-name').value = "";
        document.getElementById('manual-team-zone').value = "";
        this.renderTeams();
        this.saveState();
    },

    deleteTeam: function(id) {
        if(confirm("¿Eliminar?")) {
            State.teams = State.teams.filter(t => t.id !== id);
            this.renderTeams();
            this.saveState();
        }
    },
    deleteAllTeams: function() {
        if(confirm("¿Borrar TODOS?")) {
            State.teams = [];
            this.renderTeams();
            this.saveState();
        }
    },

    renderTeams: function() {
        const tbody = document.getElementById('teams-list-body');
        const countSpan = document.getElementById('team-count');
        const emptyMsg = document.getElementById('empty-teams-msg');
        if (!tbody) return;

        tbody.innerHTML = "";
        countSpan.textContent = State.teams.length;
        if (State.teams.length === 0) {
            emptyMsg.style.display = "block";
            document.getElementById('teams-table').style.display = "none";
            return;
        }
        emptyMsg.style.display = "none";
        document.getElementById('teams-table').style.display = "table";

        // Ordenar por Zona (A, B, C...)
        const sorted = [...State.teams].sort((a,b) => a.zone.localeCompare(b.zone));

        sorted.forEach((t, i) => {
            tbody.innerHTML += `
                <tr>
                    <td>${i+1}</td>
                    <td><span class="stats-badge" style="background:var(--primary);color:white">${t.zone}</span></td>
                    <td>${t.name}</td>
                    <td style="text-align:right"><button class="btn-icon" onclick="App.deleteTeam('${t.id}')"><i class="fa-solid fa-trash"></i></button></td>
                </tr>`;
        });
    },

    // --- PASO 4: GENERACIÓN DEL FIXTURE (EL MOTOR) ---
    generateFixture: function() {
        const modelKey = State.config.model;
        const template = TEMPLATES[modelKey];

        if (!template) {
            alert(`El modelo "${modelKey}" aún no tiene la plantilla cargada en el sistema. Selecciona "8x3_normal" para probar.`);
            return;
        }

        // 1. Preparar Equipos: Los ordenamos por Zona para que coincidan con los índices del Template (1 al 24)
        // Nota: Es CRÍTICO que el orden de los equipos coincida con lo que espera la plantilla.
        // La plantilla espera: 1,2,3 sean Zona A; 4,5,6 sean Zona B, etc.
        const sortedTeams = [...State.teams].sort((a, b) => {
            if (a.zone === b.zone) return a.name.localeCompare(b.name);
            return a.zone.localeCompare(b.zone);
        });

        // Mapa de ID plantilla -> Nombre Equipo Real
        const teamMap = {};
        sortedTeams.forEach((team, index) => {
            teamMap[index + 1] = team.name; // ID 1 basado en índice 0
        });

        // 2. Procesar Plantilla
        const matches = [];
        const startDate = new Date(State.config.startDate + "T00:00:00");

        template.forEach((slot, index) => {
            // Calcular Fecha Real
            const matchDate = new Date(startDate);
            matchDate.setDate(startDate.getDate() + (slot.d - 1)); // d=1 es el día de inicio

            // Calcular Hora Real (Excel fraction to Time String)
            const timeString = this.fractionToTime(slot.t);

            // Buscar Nombres de Equipos
            const homeName = teamMap[slot.h] || `Eq ${slot.h}`;
            const awayName = teamMap[slot.a] || `Eq ${slot.a}`;
            
            // Buscar Nombre de Cancha
            // Asumimos que State.courts[0] es la cancha 1 (AAA), etc.
            const courtName = State.courts[slot.c - 1] ? State.courts[slot.c - 1].name : `Cancha ${slot.c}`;

            matches.push({
                id: index + 1,
                date: matchDate.toLocaleDateString(),
                time: timeString,
                court: courtName,
                zone: slot.z,
                home: homeName,
                away: awayName
            });
        });

        State.matches = matches;
        this.renderFixture();
        this.saveState();
        alert("Fixture generado exitosamente.");
    },

    renderFixture: function() {
        const tbody = document.getElementById('fixture-body');
        const empty = document.getElementById('empty-fixture-msg');
        const count = document.getElementById('match-count');
        
        if (!tbody) return;
        tbody.innerHTML = "";
        count.textContent = State.matches.length;

        if (State.matches.length === 0) {
            empty.style.display = "block";
            return;
        }
        empty.style.display = "none";

        State.matches.forEach(m => {
            tbody.innerHTML += `
                <tr>
                    <td>${m.id}</td>
                    <td>${m.date}</td>
                    <td>${m.time}</td>
                    <td>${m.court}</td>
                    <td><span class="stats-badge">${m.zone}</span></td>
                    <td><strong>${m.home}</strong> vs <strong>${m.away}</strong></td>
                </tr>
            `;
        });
    },

    // Utilidad: Convierte fracción de Excel (0.375) a "09:00"
    fractionToTime: function(fraction) {
        const totalSeconds = Math.floor(fraction * 24 * 3600);
        const hours = Math.floor(totalSeconds / 3600);
        const minutes = Math.floor((totalSeconds % 3600) / 60);
        return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;
    },

    // --- UTILS & INIT ---
    saveState: function() { localStorage.setItem('fixtureProState', JSON.stringify(State)); },
    loadState: function() {
        const saved = localStorage.getItem('fixtureProState');
        if (saved) Object.assign(State, JSON.parse(saved));
    },
    updateUI: function() {
        // Restaurar UI básica
        if(State.config.tournamentName) document.getElementById('cfg-name').value = State.config.tournamentName;
        if(State.config.model) document.getElementById('cfg-model').value = State.config.model;
        if(State.config.startDate) document.getElementById('cfg-start-date').value = State.config.startDate;
        if(State.courts.length > 0) document.getElementById('cfg-courts-count').value = State.courts.length;
    },
    bindEvents: function() {
        document.getElementById('btn-reset').addEventListener('click', () => {
            if(confirm("¿Reiniciar todo?")) { localStorage.removeItem('fixtureProState'); location.reload(); }
        });
        if (State.courts.length === 0) this.generateCourtSlots();
    }
};

document.addEventListener('DOMContentLoaded', () => { App.init(); });
