/**
 * FIXTURE PLANNER PRO v1.0
 * Arquitectura modular limpia.
 */

// --- ESTADO GLOBAL (Fuente de Verdad) ---
const State = {
    config: {
        tournamentName: "",
        model: "", // 8x3_normal, 4x6_sembrado, etc.
        startDate: "",
        daysCount: 5,
        matchDuration: 60,
        minRest: 60,
        hasLoserBracket: false,
        doubleBronze: false,
        courtsCount: 2
    },
    courts: [], // Array de objetos {id, name, openTime, closeTime, hasBreak, ...}
    teams: [],
    matches: []
};

// --- MÓDULO PRINCIPAL (APP) ---
const App = {
    init: function() {
        console.log("Iniciando Fixture Planner Pro...");
        this.loadState(); // Cargar persistencia
        this.bindEvents();
        this.renderCourts(); // Render inicial si hay datos
        this.updateUI(); // Sincronizar inputs con estado
    },

    // --- NAVEGACIÓN ---
    goToStep: function(stepNumber) {
        // Validaciones antes de avanzar
        if (stepNumber === 2 && !this.validateStep1()) return;
        if (stepNumber === 3) this.saveCourtsState(); // Guardar paso 2 al salir

        // Actualizar UI Paneles
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        const targetPanel = document.getElementById(`step-${stepNumber}`);
        if(targetPanel) targetPanel.classList.add('active');
        
        // Actualizar UI Sidebar
        document.querySelectorAll('.step-btn').forEach(btn => {
            btn.classList.remove('active');
            if(btn.dataset.step == stepNumber) {
                btn.classList.add('active');
                btn.removeAttribute('disabled');
            }
        });

        this.saveState(); // Persistir todo
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
        
        // Guardar en State
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
        State.courts = []; // Reset

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
        if (field === 'hasBreak') this.renderCourts(); // Re-render para mostrar/ocultar inputs
        // No guardamos state aquí para rendimiento, se guarda al salir del paso
    },

    saveCourtsState: function() {
        // Método explícito para asegurar guardado al avanzar
        this.saveState();
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
        // Restaurar valores en Paso 1
        if(State.config.tournamentName) document.getElementById('cfg-name').value = State.config.tournamentName;
        if(State.config.model) document.getElementById('cfg-model').value = State.config.model;
        if(State.config.startDate) document.getElementById('cfg-start-date').value = State.config.startDate;
        if(State.config.daysCount) document.getElementById('cfg-days-count').value = State.config.daysCount;
        
        document.getElementById('cfg-has-loser-bracket').checked = State.config.hasLoserBracket;
        document.getElementById('cfg-double-bronze').checked = State.config.doubleBronze;
        
        // Restaurar conteo de canchas si existe
        if(State.courts.length > 0) {
            document.getElementById('cfg-courts-count').value = State.courts.length;
        }
    },

    bindEvents: function() {
        // Botón Reiniciar
        document.getElementById('btn-reset').addEventListener('click', () => {
            if(confirm("¿Estás seguro de borrar toda la configuración actual?")) {
                localStorage.removeItem('fixtureProState');
                location.reload();
            }
        });
        
        // Inicializar canchas por defecto si está vacío
        if (State.courts.length === 0) {
            this.generateCourtSlots();
        }
    }
};

// Inicializar al cargar el DOM
document.addEventListener('DOMContentLoaded', () => {
    App.init();
});