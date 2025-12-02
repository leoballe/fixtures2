/**
 * FIXTURE PLANNER PRO v5.2 (Lógica 64 Partidos)
 * Incluye lógica para Llave de Perdedores
 */

// --- ESTADO GLOBAL ---
const State = {
    config: {
        name: "",
        model: "8x3_normal",
        startDate: "",
        days: 5,
        matchDuration: 60,
        minRest: 60,
        hasLoser: false, // Esta variable controla si son 56 o 64 partidos
        doubleBronze: false,
        courtsCount: 2
    },
    courts: [],
    teams: [],
    matches: []
};

// --- UTILS ---
function safeId() {
    return "id_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 5);
}

function excelTimeToString(fraction) {
    if (!fraction || isNaN(fraction)) return "09:00";
    const totalSeconds = Math.round(fraction * 24 * 3600);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;
}

// --- LÓGICA MATEMÁTICA DEL FIXTURE ---
const FixtureEngine = {
    // Estructura base para Fase 2 (Grupos A1 y A2)
    model_8x3: {
        phase2_structure: [
            { name: "Zona A1", slots: ["1ºA", "1ºD", "1ºE", "1ºH"] },
            { name: "Zona A2", slots: ["1ºB", "1ºC", "1ºF", "1ºG"] }
        ]
    },

    generate: function(teams, config) {
        const matches = [];
        let matchId = 1; // Contador de ID de partido (1, 2, 3...)

        // 1. ORGANIZAR EQUIPOS EN ZONAS
        const zoneMap = {};
        teams.forEach(t => {
            if (!zoneMap[t.zone]) zoneMap[t.zone] = [];
            zoneMap[t.zone].push(t);
        });
        const activeZones = Object.keys(zoneMap).sort();

        // -----------------------------------------------------
        // FASE 1: ZONAS (Partidos de grupo)
        // -----------------------------------------------------
        activeZones.forEach((zChar) => {
            const teamList = zoneMap[zChar];
            const count = teamList.length;

            // Si son 3 equipos: 3 partidos (Round Robin)
            if (count === 3) {
                this.addMatch(matches, matchId++, 1, 0.375, 1, `Zona ${zChar}`, teamList[0].name, teamList[1].name);
                this.addMatch(matches, matchId++, 1, 0.45, 1, `Zona ${zChar}`, teamList[1].name, teamList[2].name);
                this.addMatch(matches, matchId++, 2, 0.375, 1, `Zona ${zChar}`, teamList[2].name, teamList[0].name);
            } 
            // Si son 2 equipos: 2 partidos (Ida y Vuelta)
            else if (count === 2) {
                this.addMatch(matches, matchId++, 1, 0.375, 1, `Zona ${zChar}`, teamList[0].name, teamList[1].name);
                this.addMatch(matches, matchId++, 2, 0.375, 1, `Zona ${zChar}`, teamList[1].name, teamList[0].name);
            }
        });

        // -----------------------------------------------------
        // FASE 2: GRUPOS A1 / A2 (Del 1º al 8º puesto general)
        // -----------------------------------------------------
        const p2 = this.model_8x3.phase2_structure;
        p2.forEach(group => {
            const realSlots = group.slots.map(slotName => {
                const zoneReq = slotName.charAt(2); // La letra de la zona (A, B...)
                if (activeZones.includes(zoneReq)) return slotName;
                return "Mejor 2º"; // Si la zona no existe (ej: H en torneo de 20 equipos)
            });

            const dBase = 3; // Empiezan el Día 3
            // Fecha 1
            this.addMatch(matches, matchId++, dBase, 0.4, 1, group.name, realSlots[0], realSlots[3]);
            this.addMatch(matches, matchId++, dBase, 0.4, 2, group.name, realSlots[1], realSlots[2]);
            // Fecha 2
            this.addMatch(matches, matchId++, dBase + 1, 0.4, 1, group.name, realSlots[0], realSlots[2]);
            this.addMatch(matches, matchId++, dBase + 1, 0.4, 2, group.name, realSlots[3], realSlots[1]);
            // Fecha 3
            this.addMatch(matches, matchId++, dBase + 2, 0.4, 1, group.name, realSlots[0], realSlots[1]);
            this.addMatch(matches, matchId++, dBase + 2, 0.4, 2, group.name, realSlots[2], realSlots[3]);
        });

        // -----------------------------------------------------
        // FASE 3: LLAVES (Del 9º al 24º puesto)
        // Aquí es donde aplica el botón "Llave de Perdedores"
        // -----------------------------------------------------
        
        // Llave B (Segundos de zona)
        this.generateBracket(matches, "Llave B (2dos)", 
            ["2ºA","2ºB","2ºC","2ºD","2ºE","2ºF","2ºG","2ºH"], 
            activeZones, 3, config.hasLoser);
        
        // Llave C (Terceros de zona)
        this.generateBracket(matches, "Llave C (3ros)", 
            ["3ºA","3ºB","3ºC","3ºD","3ºE","3ºF","3ºG","3ºH"], 
            activeZones, 3, config.hasLoser);

        // -----------------------------------------------------
        // FASE 4: FINALES A1/A2 (Del 1º al 8º puesto)
        // -----------------------------------------------------
        // Como ya generamos muchos partidos en las llaves, usamos IDs altos 
        // o dejamos que el sistema los renumere al final.
        this.addMatch(matches, 0, 5, 0.7, 1, "Final", "1º Zona A1", "1º Zona A2");
        this.addMatch(matches, 0, 5, 0.7, 2, "3er Puesto", "2º Zona A1", "2º Zona A2");
        this.addMatch(matches, 0, 5, 0.4, 1, "5to Puesto", "3º Zona A1", "3º Zona A2");
        this.addMatch(matches, 0, 5, 0.4, 2, "7mo Puesto", "4º Zona A1", "4º Zona A2");

        // RENUMERACIÓN FINAL: IDs consecutivos del 1 al 64
        matches.forEach((m, i) => m.id = i + 1);
        
        return matches;
    },

    // Función auxiliar para crear el objeto partido
    createMatch: function(id, day, time, court, zone, home, away) {
        return {
            id: id,
            date: "", 
            dayIndex: day, 
            timeVal: time, 
            courtIndex: court, 
            zone: zone,
            home: home,
            away: away
        };
    },

    // Agrega partido a la lista global
    addMatch: function(list, id, day, time, courtIdx, zone, home, away) {
        list.push(this.createMatch(id, day, time, courtIdx, zone, home, away));
    },

    // Generador de Llaves Eliminatorias
    generateBracket: function(matchesArray, zoneName, slots, activeZones, startDay, withLoserBracket) {
        // Filtramos las zonas que no existen (se convierten en BYE)
        const validSlots = slots.map(s => {
            const zoneChar = s.slice(-1);
            return activeZones.includes(zoneChar) ? s : "BYE";
        });

        // --- CUARTOS DE FINAL (Ronda 1) ---
        // 4 Partidos: A vs D, B vs C, E vs H, F vs G
        const qf = [
            { h: validSlots[0], a: validSlots[3] },
            { h: validSlots[1], a: validSlots[2] },
            { h: validSlots[4], a: validSlots[7] },
            { h: validSlots[5], a: validSlots[6] }
        ];

        qf.forEach((m, i) => {
            // Si hay un BYE, no generamos partido
            if (m.h === "BYE" || m.a === "BYE") return;
            this.addMatch(matchesArray, 0, startDay, 0.5 + (i * 0.05), 1, zoneName + " (4tos)", m.h, m.a);
        });

        // --- SEMIFINALES GANADORES (Ronda 2) ---
        // 2 Partidos
        this.addMatch(matchesArray, 0, startDay + 1, 0.6, 1, zoneName + " (Semi Gan)", "Ganador Q1", "Ganador Q2");
        this.addMatch(matchesArray, 0, startDay + 1, 0.6, 2, zoneName + " (Semi Gan)", "Ganador Q3", "Ganador Q4");

        // --- SEMIFINALES PERDEDORES (Ronda 2) - SOLO SI ESTÁ ACTIVADO ---
        if (withLoserBracket) {
            // 2 Partidos extra
            this.addMatch(matchesArray, 0, startDay + 1, 0.5, 1, zoneName + " (Semi Perd)", "Perdedor Q1", "Perdedor Q2");
            this.addMatch(matchesArray, 0, startDay + 1, 0.5, 2, zoneName + " (Semi Perd)", "Perdedor Q3", "Perdedor Q4");
        }

        // --- FINALES (Ronda 3) ---
        // Final de la Llave (Definición del mejor puesto de este grupo)
        this.addMatch(matchesArray, 0, startDay + 2, 0.7, 1, zoneName + " (Final)", "Ganador Semi G1", "Ganador Semi G2");
        
        // 3er Puesto de la llave
        this.addMatch(matchesArray, 0, startDay + 2, 0.7, 2, zoneName + " (3er)", "Perdedor Semi G1", "Perdedor Semi G2");

        // --- FINALES DE PERDEDORES (Ronda 3) - SOLO SI ESTÁ ACTIVADO ---
        if (withLoserBracket) {
            // Final de Perdedores (Definición de puestos intermedios)
            this.addMatch(matchesArray, 0, startDay + 2, 0.5, 1, zoneName + " (Final Perd)", "Ganador Semi P1", "Ganador Semi P2");
            // Último puesto de la llave
            this.addMatch(matchesArray, 0, startDay + 2, 0.5, 2, zoneName + " (7mo)", "Perdedor Semi P1", "Perdedor Semi P2");
        }
    }
};

// --- CONTROLADOR DE LA APLICACIÓN ---
const App = {
    init: function() {
        console.log("Iniciando App...");
        this.loadState();     // Carga datos guardados
        this.sanitizeData();  // Arregla datos corruptos
        this.renderCourts();  // Dibuja canchas
        this.renderTeams();   // Dibuja equipos
        this.updateUI();      // Pone los valores en los inputs
    },

    // Si hay datos corruptos (sin ID), los arregla
    sanitizeData: function() {
        if (!Array.isArray(State.teams)) State.teams = [];
        let fixed = false;
        State.teams.forEach(t => {
            if (!t.id) { t.id = safeId(); fixed = true; }
        });
        if (fixed) this.saveState();
    },

    resetApp: function() {
        localStorage.removeItem('fp_pro_v1');
        location.reload();
    },

    // --- NAVEGACIÓN ---
    goToStep: function(n) {
        // Validar Paso 1 antes de avanzar
        if (n === 2 && !this.validateConfig()) return;
        
        if (n === 3) this.saveState();
        
        // Validar Paso 4
        if (n === 4) {
            if (State.teams.length < 4) {
                alert("Carga al menos 4 equipos.");
                return;
            }
            this.updateSummary();
        }

        // Cambiar Pantalla
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`step-${n}`).classList.add('active');

        // Actualizar Botones Sidebar
        document.querySelectorAll('.step-btn').forEach(b => {
            b.classList.remove('active');
            if (parseInt(b.dataset.step) === parseInt(n)) {
                b.classList.add('active');
                b.removeAttribute('disabled');
            }
        });
        this.saveState();
    },

    // Lee los valores del Paso 1
    validateConfig: function() {
        const nameInput = document.getElementById('cfg-name');
        const dateInput = document.getElementById('cfg-date');
        const loserInput = document.getElementById('cfg-loser-bracket'); // Checkbox Llave Perdedores
        
        if (nameInput) State.config.name = nameInput.value;
        if (dateInput) State.config.startDate = dateInput.value;
        
        if (loserInput) State.config.hasLoser = loserInput.checked; // IMPORTANTE: Guardamos si está activado

        if (!State.config.name || !State.config.startDate) {
            alert("Faltan datos obligatorios (Nombre, Fecha).");
            return false;
        }
        return true;
    },

    // --- CANCHAS (Paso 2) ---
    generateCourts: function() {
        const n = parseInt(document.getElementById('cfg-court-count').value) || 2;
        State.courts = [];
        for (let i = 1; i <= n; i++) {
            State.courts.push({ id: i, name: `Cancha ${i}`, open: "09:00", close: "22:00" });
        }
        this.renderCourts();
        this.saveState();
    },

    renderCourts: function() {
        const c = document.getElementById('courts-container');
        if (!c) return;
        c.innerHTML = State.courts.map((court, i) => `
            <div class="court-card">
                <div class="court-header">
                    <span>${court.name}</span>
                    <input type="text" value="${court.name}" onchange="State.courts[${i}].name=this.value;App.saveState()" style="width: 120px;">
                </div>
            </div>
        `).join('');
    },

    // --- EQUIPOS (Paso 3) ---
    importCSV: function(e) {
        const file = e.target.files[0];
        if (!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const lines = ev.target.result.split(/\r\n|\n/).filter(l => l.trim());
            const delim = lines[0].includes(';') ? ';' : ',';
            let added = 0;
            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(delim);
                if (cols.length >= 2) {
                    const z = cols[0].trim().toUpperCase();
                    const n = cols[1].trim();
                    if (n) {
                        State.teams.push({ id: safeId(), zone: z, name: n });
                        added++;
                    }
                }
            }
            State.teams.sort((a, b) => a.zone.localeCompare(b.zone));
            this.renderTeams();
            this.saveState();
            alert(`Importados ${added} equipos.`);
        };
        reader.readAsText(file);
        e.target.value = '';
    },

    addManualTeam: function() {
        const z = document.getElementById('manual-zone').value.toUpperCase();
        const n = document.getElementById('manual-name').value;
        if (!n) return alert("Nombre requerido");
        State.teams.push({ id: safeId(), zone: z || "?", name: n });
        State.teams.sort((a, b) => a.zone.localeCompare(b.zone));
        this.renderTeams();
        this.saveState();
        document.getElementById('manual-name').value = "";
    },

    clearTeams: function() {
        if (confirm("¿Borrar todo?")) { State.teams = []; this.renderTeams(); this.saveState(); }
    },

    deleteTeam: function(id) {
        if (!confirm("¿Eliminar?")) return;
        State.teams = State.teams.filter(t => String(t.id) !== String(id));
        this.renderTeams();
        this.saveState();
    },

    renderTeams: function() {
        const tb = document.getElementById('teams-body');
        document.getElementById('team-count').innerText = State.teams.length;
        if (!tb) return;
        tb.innerHTML = "";
        
        if (State.teams.length === 0) {
            document.getElementById('teams-empty').style.display = 'block';
            return;
        }
        document.getElementById('teams-empty').style.display = 'none';
        
        tb.innerHTML = State.teams.map(t => `
            <tr>
                <td><span class="badge">${t.zone}</span></td>
                <td>${t.name}</td>
                <td><button type="button" class="btn-icon-delete" onclick="App.deleteTeam('${t.id}')"><i class="fa-solid fa-trash"></i></button></td>
            </tr>
        `).join('');
    },

    // --- GENERAR (Paso 4) ---
    updateSummary: function() {
        document.getElementById('summary-model').innerText = State.config.model;
        document.getElementById('summary-teams').innerText = State.teams.length;
        document.getElementById('summary-courts').innerText = State.courts.length;
    },

    generateFixture: function() {
        if (State.teams.length === 0) return alert("Sin equipos.");
        
        // AQUÍ SE GENERA EL FIXTURE USANDO LA CONFIGURACIÓN (incluyendo hasLoser)
        const rawMatches = FixtureEngine.generate(State.teams, State.config);
        
        let dateParts = State.config.startDate.split('-');
        if(dateParts.length !== 3) {
             const today = new Date();
             dateParts = [today.getFullYear(), today.getMonth()+1, today.getDate()];
        }
        const startDate = new Date(dateParts[0], dateParts[1] - 1, dateParts[2]);

        State.matches = rawMatches.map(m => {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + (m.dayIndex - 1));
            
            const totalSec = Math.round(m.timeVal * 86400);
            const hh = Math.floor(totalSec / 3600);
            const mm = Math.floor((totalSec % 3600) / 60);
            const timeStr = `${String(hh).padStart(2, '0')}:${String(mm).padStart(2, '0')}`;
            const court = State.courts[m.courtIndex - 1] || { name: `Cancha ${m.courtIndex}` };

            return { ...m, dateStr: d.toLocaleDateString(), timeStr, courtName: court.name };
        });

        this.renderFixture();
        this.saveState();
        alert(`Fixture generado: ${State.matches.length} partidos.`);
    },

    renderFixture: function() {
        const tb = document.getElementById('fixture-body');
        if (!tb) return;
        tb.innerHTML = "";
        
        if(State.matches.length === 0) {
            document.getElementById('fixture-empty').style.display = 'block';
            return;
        }
        document.getElementById('fixture-empty').style.display = 'none';
        
        tb.innerHTML = State.matches.map(m => `
            <tr>
                <td>${m.id}</td><td>Día ${m.dayIndex}</td><td>${m.timeStr}</td><td>${m.courtName}</td>
                <td><span class="badge">${m.zone}</span></td><td><strong>${m.home}</strong> vs <strong>${m.away}</strong></td>
            </tr>
        `).join('');
    },

    // --- EXPORTAR (Paso 5) ---
    exportPDF: function() {
        if (State.matches.length === 0) return alert("Genera primero.");
        if (!window.jspdf) return alert("Error librería PDF.");
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        doc.setFontSize(18);
        doc.text(State.config.name || "Fixture", 14, 20);
        doc.setFontSize(10);
        doc.text(`Inicio: ${State.config.startDate} | Total Partidos: ${State.matches.length}`, 14, 26);

        // Agrupamos por Fecha
        const matchesByDate = {};
        State.matches.forEach(m => {
            if (!matchesByDate[m.dateStr]) matchesByDate[m.dateStr] = [];
            matchesByDate[m.dateStr].push(m);
        });

        let startY = 35;

        Object.keys(matchesByDate).forEach((dateKey) => {
            if (startY > 270) { doc.addPage(); startY = 20; }

            doc.setFontSize(12);
            doc.setTextColor(0);
            doc.setFillColor(230, 230, 230);
            doc.rect(14, startY - 5, 182, 7, 'F');
            doc.text(`Fecha: ${dateKey}`, 16, startY);
            startY += 5;

            const rows = matchesByDate[dateKey].map(m => [
                m.timeStr, m.courtName, m.zone, m.home, "vs", m.away, m.id 
            ]);

            doc.autoTable({
                startY: startY,
                head: [['Hora', 'Cancha', 'Fase', 'Local', '', 'Visitante', 'ID']],
                body: rows,
                theme: 'plain',
                styles: { fontSize: 9, cellPadding: 2 },
                headStyles: { fillColor: [60, 60, 60], textColor: 255 },
                columnStyles: {
                    0: { cellWidth: 15 }, 1: { cellWidth: 25 }, 2: { cellWidth: 30 },
                    3: { cellWidth: 40, halign: 'right' }, 4: { cellWidth: 10, halign: 'center' },
                    5: { cellWidth: 40, fontStyle: 'bold' }, 6: { cellWidth: 10, halign: 'center' }
                },
                margin: { left: 14, right: 14 }
            });
            startY = doc.lastAutoTable.finalY + 10;
        });

        doc.save("fixture_pro.pdf");
    },

    // --- CARGA Y GUARDADO ---
    saveState: function() { localStorage.setItem('fp_pro_v1', JSON.stringify(State)); },
    
    loadState: function() {
        const s = localStorage.getItem('fp_pro_v1');
        if (s) {
            try {
                const p = JSON.parse(s);
                if(p.config) Object.assign(State.config, p.config);
                if(p.teams) State.teams = p.teams;
                if(p.courts) State.courts = p.courts;
                // No cargamos matches para forzar regeneración limpia
            } catch(e) { console.warn("Datos corruptos."); }
        }
    },

    updateUI: function() {
        const nameIn = document.getElementById('cfg-name');
        const dateIn = document.getElementById('cfg-date');
        const loserIn = document.getElementById('cfg-loser-bracket');
        
        if (nameIn) nameIn.value = State.config.name || "";
        if (dateIn) dateIn.value = State.config.startDate || "";
        if (loserIn) loserIn.checked = State.config.hasLoser; 
        
        if (State.courts.length === 0) this.generateCourts();
        
        // Habilitar pasos si hay datos
        if (State.config.name && State.config.startDate) {
             const btn = document.querySelector('[data-step="2"]');
             if(btn) btn.removeAttribute('disabled');
        }
        if (State.teams.length >= 4) {
             const b3 = document.querySelector('[data-step="3"]');
             const b4 = document.querySelector('[data-step="4"]');
             if(b3) b3.removeAttribute('disabled');
             if(b4) b4.removeAttribute('disabled');
        }
    },

    bindEvents: function() {
        const rBtn = document.getElementById('btn-reset');
        if (rBtn) {
            rBtn.addEventListener('click', () => {
                if(confirm("¿Reiniciar?")) this.resetApp();
            });
        }
        document.querySelectorAll('.step-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                if(!btn.hasAttribute('disabled')) this.goToStep(parseInt(btn.dataset.step));
            });
        });
    }
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => setTimeout(() => App.init(), 100));
```

### ✅ Pasos para probar:

1.  **Recarga la página.**
2.  Ve al **Paso 1** y marca la casilla **"Llave de Perdedores"**. Asegúrate de que quede activada.
3.  Ve al Paso 2, Paso 3 (carga equipos si no hay).
4.  En el **Paso 4**, haz clic en "Ejecutar Motor".
5.  El mensaje de alerta debería decirte ahora **"Fixture generado: 64 partidos"** (aproximadamente, dependiendo de los equipos cargados).
6.  En el **Paso 5**, descarga el PDF y verifica que aparezcan los partidos con la etiqueta `(Semi Perd)`, `(Final Perd)` o `(7mo)`.
