/**
 * FIXTURE PLANNER PRO v1.0
 * Desarrollo desde cero.
 */

// --- ESTADO GLOBAL ---
const State = {
    config: {
        tournamentName: "",
        model: "", // 8x3_normal, etc.
        startDate: "",
        daysCount: 5,
        matchDuration: 60,
        minRest: 60,
        hasLoserBracket: false,
        doubleBronze: false,
        courtsCount: 2
    },
    courts: [], // Array de objetos {id, name, timeStart, timeEnd, hasBreak}
    teams: [], // Array de objetos {id, name, zone}
    matches: []
};

// --- MÓDULO PRINCIPAL (APP) ---
const App = {
    init: function() {
        console.log("Iniciando Fixture Planner Pro...");
        this.loadState(); // Cargar persistencia
        this.bindEvents();
        this.renderCourts(); 
        this.renderTeams(); // Renderizar equipos si existen
        this.updateUI(); 
    },

    // --- NAVEGACIÓN ---
    goToStep: function(stepNumber) {
        if (stepNumber === 2 && !this.validateStep1()) return;
        if (stepNumber === 3) this.saveCourtsState();
        if (stepNumber === 4 && State.teams.length < 2) {
            alert("Por favor carga al menos 2 equipos antes de generar el fixture.");
            return;
        }

        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        const targetPanel = document.getElementById(`step-${stepNumber}`);
        if(targetPanel) targetPanel.classList.add('active');
        
        document.querySelectorAll('.step-btn').forEach(btn => {
            btn.classList.remove('active');
            if(btn.dataset.step == stepNumber) {
                btn.classList.add('active');
                btn.removeAttribute('disabled');
            }
        });

        this.saveState();
    },

    // --- PASO 1: CONFIGURACIÓN ---
    validateStep1: function() {
        const name = document.getElementById('cfg-name').value;
        const model = document.getElementById('cfg-model').value;
        const date = document.getElementById('cfg-start-date').value;

        if (!name || !model || !date) {
            alert("Por favor completa los campos obligatorios: Nombre, Modelo y Fecha.");
            return false;
        }
        
        State.config.tournamentName = name;
        State.config.model = model;
        State.config.startDate = date;
        State.config.daysCount = parseInt(document.getElementById('cfg-days-count').value) || 5;
        State.config.matchDuration = parseInt(document.getElementById('cfg-match-duration').value) || 60;
        State.config.minRest = parseInt(document.getElementById('cfg-min-rest').value) || 60;
        
        State.config.hasLoserBracket = document.getElementById('cfg-has-loser-bracket').checked;
        State.config.doubleBronze = document.getElementById('cfg-double-bronze').checked;

        return true;
    },

    // --- PASO 2: CANCHAS ---
    generateCourtSlots: function() {
        const count = parseInt(document.getElementById('cfg-courts-count').value) || 1;
        State.courts = []; 

        for (let i = 1; i <= count; i++) {
            State.courts.push({
                id: i,
                name: `Cancha ${i}`,
                openTime: "09:00",
                closeTime: "22:00",
                hasBreak: false,
                breakStart: "13:00",
                breakEnd: "14:00"
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
            const div = document.createElement('div');
            div.className = 'court-card';
            div.innerHTML = `
                <div class="form-group">
                    <label>Nombre</label>
                    <input type="text" value="${court.name}" onchange="App.updateCourt(${index}, 'name', this.value)">
                </div>
                <div class="form-group">
                    <label>Apertura</label>
                    <input type="time" value="${court.openTime}" onchange="App.updateCourt(${index}, 'openTime', this.value)">
                </div>
                <div class="form-group">
                    <label>Cierre</label>
                    <input type="time" value="${court.closeTime}" onchange="App.updateCourt(${index}, 'closeTime', this.value)">
                </div>
                <div class="form-group" style="justify-content:center">
                    <label class="toggle">
                        <input type="checkbox" ${court.hasBreak ? 'checked' : ''} onchange="App.updateCourt(${index}, 'hasBreak', this.checked)">
                        <span class="slider"></span>
                    </label>
                    <small>Corte</small>
                </div>
                
                ${court.hasBreak ? `
                <div class="break-row">
                    <label><i class="fa-solid fa-mug-hot"></i> Horario de Corte:</label>
                    <input type="time" value="${court.breakStart}" onchange="App.updateCourt(${index}, 'breakStart', this.value)">
                    <span>a</span>
                    <input type="time" value="${court.breakEnd}" onchange="App.updateCourt(${index}, 'breakEnd', this.value)">
                </div>
                ` : ''}
            `;
            container.appendChild(div);
        });
    },

    updateCourt: function(index, field, value) {
        State.courts[index][field] = value;
        if (field === 'hasBreak') this.renderCourts();
    },

    saveCourtsState: function() {
        this.saveState();
    },

    // --- PASO 3: EQUIPOS ---
    
    // Función para manejar la subida del CSV
    handleCsvUpload: function(event) {
        const file = event.target.files[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = function(e) {
            const text = e.target.result;
            App.processCsvData(text);
        };
        reader.readAsText(file);
        
        // Resetear input para permitir recargar el mismo archivo
        event.target.value = ''; 
    },

    processCsvData: function(csvText) {
        const lines = csvText.split(/\r\n|\n/);
        // Detectar si hay encabezado (asumimos que si la primera línea tiene 'Zona' o 'Equipo' es encabezado)
        let startIndex = 0;
        if (lines[0].toLowerCase().includes('zona') || lines[0].toLowerCase().includes('equipo')) {
            startIndex = 1;
        }

        let addedCount = 0;

        for (let i = startIndex; i < lines.length; i++) {
            const line = lines[i].trim();
            if (!line) continue;

            // Detectar delimitador: probamos punto y coma, luego coma
            let parts = line.split(';');
            if (parts.length < 2) parts = line.split(',');

            // Esperamos formato: Zona;Equipo o Equipo;Zona (pero el ejemplo del usuario es Zona;Equipos)
            // Asumimos orden: Zona, Nombre
            let zone = parts[0] ? parts[0].trim().toUpperCase() : '?';
            let name = parts[1] ? parts[1].trim() : '';

            // Validación básica
            if (name) {
                State.teams.push({
                    id: Date.now() + Math.random().toString(36).substr(2, 5),
                    name: name,
                    zone: zone
                });
                addedCount++;
            }
        }

        if (addedCount > 0) {
            this.renderTeams();
            this.saveState();
            alert(`Se importaron ${addedCount} equipos correctamente.`);
        } else {
            alert("No se pudieron leer equipos. Verifica que el archivo CSV tenga el formato: Zona;Nombre");
        }
    },

    addManualTeam: function() {
        const nameInput = document.getElementById('manual-team-name');
        const zoneInput = document.getElementById('manual-team-zone');
        
        const name = nameInput.value.trim();
        const zone = zoneInput.value.trim().toUpperCase();

        if (!name) {
            alert("El nombre del equipo es obligatorio.");
            return;
        }

        State.teams.push({
            id: Date.now() + Math.random().toString(36).substr(2, 5),
            name: name,
            zone: zone || "?" // Zona ? si no se especifica
        });

        nameInput.value = "";
        zoneInput.value = "";
        nameInput.focus();

        this.renderTeams();
        this.saveState();
    },

    deleteTeam: function(id) {
        if(confirm("¿Eliminar este equipo?")) {
            State.teams = State.teams.filter(t => t.id !== id);
            this.renderTeams();
            this.saveState();
        }
    },

    deleteAllTeams: function() {
        if (State.teams.length === 0) return;
        if(confirm("¿Estás seguro de BORRAR TODOS los equipos? Esta acción no se puede deshacer.")) {
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

        // Ordenar por Zona y luego por Nombre para mejor visualización
        const sortedTeams = [...State.teams].sort((a, b) => {
            if (a.zone === b.zone) return a.name.localeCompare(b.name);
            return a.zone.localeCompare(b.zone);
        });

        sortedTeams.forEach((team, index) => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>${index + 1}</td>
                <td><span class="stats-badge" style="background:var(--primary); color:white">${team.zone}</span></td>
                <td><strong>${team.name}</strong></td>
                <td style="text-align: right;">
                    <button class="btn-icon" onclick="App.deleteTeam('${team.id}')" title="Eliminar">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    },

    // --- PERSISTENCIA ---
    saveState: function() {
        localStorage.setItem('fixtureProState', JSON.stringify(State));
    },

    loadState: function() {
        const saved = localStorage.getItem('fixtureProState');
        if (saved) {
            try {
                const parsed = JSON.parse(saved);
                Object.assign(State, parsed);
            } catch (e) {
                console.error("Error cargando estado", e);
            }
        }
    },

    updateUI: function() {
        // Restaurar Paso 1
        if(State.config.tournamentName) document.getElementById('cfg-name').value = State.config.tournamentName;
        if(State.config.model) document.getElementById('cfg-model').value = State.config.model;
        if(State.config.startDate) document.getElementById('cfg-start-date').value = State.config.startDate;
        if(State.config.daysCount) document.getElementById('cfg-days-count').value = State.config.daysCount;
        
        document.getElementById('cfg-has-loser-bracket').checked = State.config.hasLoserBracket;
        document.getElementById('cfg-double-bronze').checked = State.config.doubleBronze;
        
        // Restaurar Paso 2
        if(State.courts.length > 0) {
            document.getElementById('cfg-courts-count').value = State.courts.length;
        }
    },

    bindEvents: function() {
        document.getElementById('btn-reset').addEventListener('click', () => {
            if(confirm("¿Estás seguro de borrar toda la configuración actual?")) {
                localStorage.removeItem('fixtureProState');
                location.reload();
            }
        });
        
        if (State.courts.length === 0) {
            this.generateCourtSlots();
        }
    }
};

// Inicializar al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});
