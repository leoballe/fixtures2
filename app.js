/**
 * FIXTURE PLANNER PRO v3.1 (Base v3.0 + PDF Mejorado)
 * Generación Adaptativa + Exportación Profesional por Días
 */

// --- ESTADO GLOBAL ---
const State = {
    config: {
        tournamentName: "",
        model: "8x3_adaptable", // Único modelo inteligente
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
    matches: []
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

// --- LÓGICA DE NEGOCIO "HARDCODEADA" PERO ADAPTABLE ---
const FixtureLogic = {
    // Definición de la estructura ideal para 24 equipos (8 Zonas x 3)
    structure24: {
        zones: ['A','B','C','D','E','F','G','H'],
        phase2_matches: [
            // A1 (1ros de A, D, E, H)
            { z: "A1", h: "1ºA", a: "1ºD" }, { z: "A1", h: "1ºE", a: "1ºH" },
            { z: "A1", h: "1ºA", a: "1ºE" }, { z: "A1", h: "1ºD", a: "1ºH" },
            { z: "A1", h: "1ºA", a: "1ºH" }, { z: "A1", h: "1ºD", a: "1ºE" },
            // A2 (1ros de B, C, F, G)
            { z: "A2", h: "1ºB", a: "1ºC" }, { z: "A2", h: "1ºF", a: "1ºG" },
            { z: "A2", h: "1ºB", a: "1ºF" }, { z: "A2", h: "1ºC", a: "1ºG" },
            { z: "A2", h: "1ºB", a: "1ºG" }, { z: "A2", h: "1ºC", a: "1ºF" }
        ],
        // Llaves B (2dos) y C (3ros) se calculan por cruces estándar
    },

    generate: function(teams) {
        const matches = [];
        let matchId = 1;

        // 1. ORGANIZAR EQUIPOS EN ZONAS REALES
        const zoneMap = {};
        teams.forEach(t => {
            if (!zoneMap[t.zone]) zoneMap[t.zone] = [];
            zoneMap[t.zone].push(t);
        });
        
        const activeZones = Object.keys(zoneMap).sort(); // Ej: ['A', 'B', 'C'...]

        // --- FASE 1: GRUPOS (Todos contra todos en cada zona) ---
        activeZones.forEach(zone => {
            const zoneTeams = zoneMap[zone];
            const count = zoneTeams.length;
            
            // Lógica para zona de 3
            if (count === 3) {
                matches.push(this.createMatch(matchId++, 1, 0.375, 1, `Zona ${zone}`, zoneTeams[0].name, zoneTeams[1].name)); // 1vs2
                matches.push(this.createMatch(matchId++, 1, 0.375, 1, `Zona ${zone}`, zoneTeams[1].name, zoneTeams[2].name)); // 2vs3
                matches.push(this.createMatch(matchId++, 2, 0.375, 1, `Zona ${zone}`, zoneTeams[2].name, zoneTeams[0].name)); // 3vs1
            } 
            // Lógica para zona de 2 (Ida y Vuelta) - Caso 20 equipos
            else if (count === 2) {
                matches.push(this.createMatch(matchId++, 1, 0.375, 1, `Zona ${zone}`, zoneTeams[0].name, zoneTeams[1].name)); // Ida
                matches.push(this.createMatch(matchId++, 2, 0.375, 1, `Zona ${zone}`, zoneTeams[1].name, zoneTeams[0].name)); // Vuelta
            }
        });

        // --- FASE 2: CLASIFICACIÓN A1 / A2 ---
        const slotsA1 = ["1ºA", "1ºD", "1ºE", "1ºH"];
        const slotsA2 = ["1ºB", "1ºC", "1ºF", "1ºG"];

        // Adaptación de slots si faltan zonas
        if (!activeZones.includes('H')) {
            const idx = slotsA1.indexOf("1ºH");
            if(idx !== -1) slotsA1[idx] = "Mejor 2º";
        }
        if (!activeZones.includes('G')) {
            const idx = slotsA2.indexOf("1ºG");
            if(idx !== -1) slotsA2[idx] = "2do Mejor 2º";
        }

        // Generar partidos A1 (Todos contra todos - 3 fechas)
        this.generateGroupMatches(matches, "Zona A1", slotsA1, 3); // Día 3 inicio
        this.generateGroupMatches(matches, "Zona A2", slotsA2, 3);

        // --- FASE 3: LLAVES ---
        this.generateBracket(matches, "Llave B (2dos)", ["2ºA","2ºB","2ºC","2ºD","2ºE","2ºF","2ºG","2ºH"], activeZones, 3);
        this.generateBracket(matches, "Llave C (3ros)", ["3ºA","3ºB","3ºC","3ºD","3ºE","3ºF","3ºG","3ºH"], activeZones, 3);

        // --- FASE 4: FINALES (1-8) ---
        // Día 5
        matches.push(this.createMatch(900, 5, 0.5, 1, "Final", "1º Zona A1", "1º Zona A2"));
        matches.push(this.createMatch(901, 5, 0.5, 2, "3er Puesto", "2º Zona A1", "2º Zona A2"));
        matches.push(this.createMatch(902, 5, 0.4, 1, "5to Puesto", "3º Zona A1", "3º Zona A2"));
        matches.push(this.createMatch(903, 5, 0.4, 2, "7mo Puesto", "4º Zona A1", "4º Zona A2"));

        // Reordenar IDs consecutivos para que se vean bien
        matches.forEach((m, i) => m.id = i + 1);
        
        return matches;
    },

    createMatch: function(id, day, time, court, zone, home, away) {
        return {
            id: id,
            date: "", // Se calculará después
            dayIndex: day, // 1-5
            timeVal: time, // decimal excel
            courtIndex: court, // 1-n
            zone: zone,
            home: home,
            away: away
        };
    },

    generateGroupMatches: function(matchesArray, zoneName, teams, startDay) {
        // F1
        matchesArray.push(this.createMatch(0, startDay, 0.375, 1, zoneName, teams[0], teams[3]));
        matchesArray.push(this.createMatch(0, startDay, 0.375, 2, zoneName, teams[1], teams[2]));
        // F2
        matchesArray.push(this.createMatch(0, startDay+1, 0.375, 1, zoneName, teams[0], teams[2]));
        matchesArray.push(this.createMatch(0, startDay+1, 0.375, 2, zoneName, teams[3], teams[1]));
        // F3
        matchesArray.push(this.createMatch(0, startDay+2, 0.375, 1, zoneName, teams[0], teams[1]));
        matchesArray.push(this.createMatch(0, startDay+2, 0.375, 2, zoneName, teams[2], teams[3]));
    },

    generateBracket: function(matchesArray, zoneName, slots, activeZones, startDay) {
        const validSlots = slots.map(s => {
            const zoneChar = s.slice(-1); // Última letra "A" de "2ºA"
            return activeZones.includes(zoneChar) ? s : "BYE";
        });

        // Cuartos (Día 3)
        const qf = [
            {h: validSlots[0], a: validSlots[3]}, // A vs D
            {h: validSlots[1], a: validSlots[2]}, // B vs C
            {h: validSlots[4], a: validSlots[7]}, // E vs H
            {h: validSlots[5], a: validSlots[6]}  // F vs G
        ];

        qf.forEach((m, i) => {
            if (m.h === "BYE" || m.a === "BYE") return; 
            matchesArray.push(this.createMatch(0, startDay, 0.5 + (i*0.05), 1, zoneName + " (4tos)", m.h, m.a));
        });

        // Semis y Finales
        matchesArray.push(this.createMatch(0, startDay+1, 0.6, 1, zoneName + " (Semi)", "Ganador Q1", "Ganador Q2"));
        matchesArray.push(this.createMatch(0, startDay+1, 0.6, 2, zoneName + " (Semi)", "Ganador Q3", "Ganador Q4"));
        matchesArray.push(this.createMatch(0, startDay+2, 0.7, 1, zoneName + " (Final)", "Ganador S1", "Ganador S2"));
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
    },

    goToStep: function(n) {
        if (n===2 && !this.validateStep1()) return;
        if (n===3) this.saveCourtsState();
        if (n===4 && State.teams.length < 2) return alert("Carga equipos.");
        
        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`step-${n}`).classList.add('active');
        document.querySelectorAll('.step-btn').forEach(b => {
            b.classList.remove('active');
            if(b.dataset.step == n) { b.classList.add('active'); b.removeAttribute('disabled'); }
        });
        this.saveState();
    },

    // --- STEP 1 & 2 ---
    validateStep1: function() {
        const name = document.getElementById('cfg-name').value;
        const date = document.getElementById('cfg-start-date').value;
        if (!name || !date) return alert("Falta nombre o fecha") && false;
        
        State.config.tournamentName = name;
        State.config.startDate = date;
        State.config.daysCount = parseInt(document.getElementById('cfg-days-count').value) || 5;
        return true;
    },

    generateCourtSlots: function() {
        const n = parseInt(document.getElementById('cfg-courts-count').value);
        State.courts = [];
        for(let i=1; i<=n; i++) State.courts.push({ id:i, name:`Cancha ${i}` });
        this.renderCourts();
        this.saveState();
    },

    renderCourts: function() {
        const c = document.getElementById('courts-container');
        if(!c) return;
        c.innerHTML = State.courts.map((ct, i) => `
            <div class="court-card"><label>Nombre:</label><input type="text" value="${ct.name}" onchange="State.courts[${i}].name=this.value;App.saveState()"></div>
        `).join('');
    },
    saveCourtsState: () => App.saveState(),

    // --- STEP 3: EQUIPOS ---
    handleCsvUpload: function(e) {
        const f = e.target.files[0];
        if(!f) return;
        const r = new FileReader();
        r.onload = (ev) => this.parseTeams(ev.target.result);
        r.readAsText(f);
        e.target.value = '';
    },

    parseTeams: function(txt) {
        const lines = txt.split(/\r\n|\n/).filter(l => l.trim());
        if(lines.length < 2) return alert("CSV vacío");
        const delim = lines[0].includes(';') ? ';' : ',';
        
        let newTeams = [];
        for(let i=1; i<lines.length; i++) {
            const cols = lines[i].split(delim);
            if(cols.length >= 2) newTeams.push({ id: safeId(), zone: cols[0].trim().toUpperCase(), name: cols[1].trim() });
        }
        
        newTeams.sort((a,b) => a.zone.localeCompare(b.zone));
        State.teams = newTeams;
        this.renderTeams();
        this.saveState();
        alert(`Cargados ${newTeams.length} equipos.`);
    },

    addManualTeam: function() {
        const n = document.getElementById('manual-team-name').value;
        const z = document.getElementById('manual-team-zone').value;
        if(n) {
            State.teams.push({ id: safeId(), name: n, zone: z.toUpperCase() || "?" });
            this.renderTeams();
            this.saveState();
            document.getElementById('manual-team-name').value = "";
        }
    },

    deleteTeam: function(id) {
        State.teams = State.teams.filter(t => t.id !== id);
        this.renderTeams(); this.saveState();
    },
    deleteAllTeams: function() {
        if(confirm("¿Borrar todos?")) { State.teams = []; this.renderTeams(); this.saveState(); }
    },

    renderTeams: function() {
        const tb = document.getElementById('teams-list-body');
        document.getElementById('team-count').innerText = State.teams.length;
        if(!tb) return;
        
        if(State.teams.length === 0) {
            document.getElementById('empty-teams-msg').style.display = 'block';
            document.getElementById('teams-table').style.display = 'none';
            return;
        }
        document.getElementById('empty-teams-msg').style.display = 'none';
        document.getElementById('teams-table').style.display = 'table';

        tb.innerHTML = State.teams.map((t, i) => `
            <tr>
                <td>${i+1}</td><td><span class="stats-badge">${t.zone}</span></td><td>${t.name}</td>
                <td style="text-align:right"><button class="btn-icon" onclick="App.deleteTeam('${t.id}')"><i class="fa-solid fa-trash"></i></button></td>
            </tr>
        `).join('');
    },

    // --- GENERACIÓN ---
    generateFixture: function() {
        if(State.teams.length < 2) return alert("Faltan equipos");
        
        const matches = FixtureLogic.generate(State.teams);
        
        const startDate = new Date(State.config.startDate + "T00:00:00");
        matches.forEach(m => {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + (m.dayIndex - 1));
            m.dateStr = d.toLocaleDateString();
            m.timeStr = excelTimeToString(m.timeVal);
            const cObj = State.courts[m.courtIndex - 1];
            m.courtName = cObj ? cObj.name : `Cancha ${m.courtIndex}`;
        });

        State.matches = matches;
        this.renderFixture();
        this.saveState();
        alert(`Fixture generado: ${matches.length} partidos.`);
    },

    renderFixture: function() {
        const tb = document.getElementById('fixture-body');
        if(!tb) return;
        
        if(State.matches.length === 0) {
            document.getElementById('empty-fixture-msg').style.display = 'block';
            return;
        }
        document.getElementById('empty-fixture-msg').style.display = 'none';
        
        tb.innerHTML = State.matches.map(m => `
            <tr>
                <td>${m.id}</td>
                <td>Día ${m.dayIndex}</td>
                <td>${m.dateStr}</td>
                <td>${m.timeStr}</td>
                <td>${m.courtName}</td>
                <td><span class="stats-badge">${m.zone}</span></td>
                <td><strong>${m.home}</strong> vs <strong>${m.away}</strong></td>
            </tr>
        `).join('');
    },

    // --- PDF EXPORT (MEJORADO) ---
    exportPDF: function() {
        if (State.matches.length === 0) return alert("Genera el fixture primero.");
        if (!window.jspdf) return alert("Error: Librería PDF no cargada.");
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        // Título del PDF
        doc.setFontSize(22);
        doc.setTextColor(40, 40, 40);
        doc.text(State.config.tournamentName || "Fixture", 14, 20);
        
        doc.setFontSize(11);
        doc.setTextColor(100, 100, 100);
        doc.text(`Fecha de inicio: ${State.config.startDate}`, 14, 28);
        doc.text(`Total de partidos: ${State.matches.length}`, 14, 34);

        let startY = 45;

        // Agrupamos por Fecha para que el PDF sea más legible
        // Creamos un mapa: { "25/11/2025": [match1, match2], ... }
        const matchesByDate = {};
        State.matches.forEach(m => {
            if (!matchesByDate[m.dateStr]) matchesByDate[m.dateStr] = [];
            matchesByDate[m.dateStr].push(m);
        });

        // Iteramos por cada fecha encontrada
        Object.keys(matchesByDate).forEach((dateKey) => {
            const dayMatches = matchesByDate[dateKey];

            // Título del Día
            // Si nos acercamos al final de la página, añadimos una nueva
            if (startY > 270) {
                doc.addPage();
                startY = 20;
            }

            doc.setFontSize(14);
            doc.setTextColor(0, 0, 0); // Negro
            doc.setFillColor(240, 240, 240); // Fondo gris claro
            doc.rect(14, startY - 6, 182, 8, 'F'); // Barra de fondo para el día
            doc.text(`Fecha: ${dateKey}`, 16, startY);
            startY += 5;

            // Datos de la tabla para este día
            const rows = dayMatches.map(m => [
                m.timeStr,
                m.courtName,
                m.zone,
                m.home,
                "vs",
                m.away,
                m.id // Columna ID para depurar
            ]);

            doc.autoTable({
                startY: startY,
                head: [['Hora', 'Cancha', 'Zona/Fase', 'Local', '', 'Visitante', 'ID']],
                body: rows,
                theme: 'plain',
                styles: { fontSize: 10, cellPadding: 3 },
                headStyles: { fillColor: [59, 130, 246], textColor: 255, fontStyle: 'bold' },
                columnStyles: {
                    0: { cellWidth: 20 }, // Hora
                    1: { cellWidth: 30 }, // Cancha
                    2: { cellWidth: 35 }, // Zona
                    3: { cellWidth: 35, halign: 'right', fontStyle: 'bold' }, // Local
                    4: { cellWidth: 10, halign: 'center' }, // vs
                    5: { cellWidth: 35, fontStyle: 'bold' }, // Visitante
                    6: { cellWidth: 15, halign: 'center' }  // ID
                },
                margin: { left: 14, right: 14 }
            });

            // Actualizamos la posición Y para el siguiente día
            startY = doc.lastAutoTable.finalY + 15;
        });
        
        doc.save("fixture_profesional.pdf");
    },

    saveState: function() { localStorage.setItem('fp_state_v3', JSON.stringify(State)); },
    loadState: function() {
        const s = localStorage.getItem('fp_state_v3');
        if(s) Object.assign(State, JSON.parse(s));
    },
    updateUI: function() {
        if(State.config.tournamentName) document.getElementById('cfg-name').value = State.config.tournamentName;
        if(State.config.startDate) document.getElementById('cfg-start-date').value = State.config.startDate;
        if(State.courts.length) document.getElementById('cfg-courts-count').value = State.courts.length;
    },
    bindEvents: function() {
        document.getElementById('btn-reset').addEventListener('click', () => {
            if(confirm("¿Reiniciar?")) { localStorage.clear(); location.reload(); }
        });
        if(State.courts.length===0) this.generateCourtSlots();
    }
};

window.App = App;
document.addEventListener('DOMContentLoaded', () => App.init());
