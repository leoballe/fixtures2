/**
 * FIXTURE PLANNER PRO v3.1
 * Generación Adaptativa + Corrección de UI (Eliminar Equipos)
 */

// --- ESTADO GLOBAL ---
const State = {
    config: {
        tournamentName: "",
        model: "8x3_adaptable", 
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
    generate: function(teams) {
        const totalTeams = teams.length;
        const matches = [];
        let matchId = 1;

        // 1. ORGANIZAR EQUIPOS EN ZONAS REALES
        const zoneMap = {};
        teams.forEach(t => {
            if (!zoneMap[t.zone]) zoneMap[t.zone] = [];
            zoneMap[t.zone].push(t);
        });
        
        const activeZones = Object.keys(zoneMap).sort();

        // --- FASE 1: GRUPOS ---
        activeZones.forEach(zone => {
            const zoneTeams = zoneMap[zone];
            const count = zoneTeams.length;
            
            if (count === 3) {
                matches.push(this.createMatch(matchId++, 1, 0.375, 1, `Zona ${zone}`, zoneTeams[0].name, zoneTeams[1].name));
                matches.push(this.createMatch(matchId++, 1, 0.375, 1, `Zona ${zone}`, zoneTeams[1].name, zoneTeams[2].name));
                matches.push(this.createMatch(matchId++, 2, 0.375, 1, `Zona ${zone}`, zoneTeams[2].name, zoneTeams[0].name));
            } else if (count === 2) {
                matches.push(this.createMatch(matchId++, 1, 0.375, 1, `Zona ${zone}`, zoneTeams[0].name, zoneTeams[1].name));
                matches.push(this.createMatch(matchId++, 2, 0.375, 1, `Zona ${zone}`, zoneTeams[1].name, zoneTeams[0].name));
            }
        });

        // --- FASE 2: CLASIFICACIÓN A1 / A2 ---
        const slotsA1 = ["1ºA", "1ºD", "1ºE", "1ºH"];
        const slotsA2 = ["1ºB", "1ºC", "1ºF", "1ºG"];

        if (!activeZones.includes('H')) {
            const idx = slotsA1.indexOf("1ºH");
            if(idx !== -1) slotsA1[idx] = "Mejor 2º";
        }
        if (!activeZones.includes('G')) {
            const idx = slotsA2.indexOf("1ºG");
            if(idx !== -1) slotsA2[idx] = "2do Mejor 2º";
        }

        this.generateGroupMatches(matches, "Zona A1", slotsA1, 3);
        this.generateGroupMatches(matches, "Zona A2", slotsA2, 3);

        // --- FASE 3: LLAVES ---
        this.generateBracket(matches, "Llave B (2dos)", ["2ºA","2ºB","2ºC","2ºD","2ºE","2ºF","2ºG","2ºH"], activeZones, 3);
        this.generateBracket(matches, "Llave C (3ros)", ["3ºA","3ºB","3ºC","3ºD","3ºE","3ºF","3ºG","3ºH"], activeZones, 3);

        // --- FASE 4: FINALES (1-8) ---
        matches.push(this.createMatch(900, 5, 0.5, 1, "Final", "1º Zona A1", "1º Zona A2"));
        matches.push(this.createMatch(901, 5, 0.5, 2, "3er Puesto", "2º Zona A1", "2º Zona A2"));
        matches.push(this.createMatch(902, 5, 0.4, 1, "5to Puesto", "3º Zona A1", "3º Zona A2"));
        matches.push(this.createMatch(903, 5, 0.4, 2, "7mo Puesto", "4º Zona A1", "4º Zona A2"));

        matches.forEach((m, i) => m.id = i + 1);
        return matches;
    },

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

    generateGroupMatches: function(matchesArray, zoneName, teams, startDay) {
        matchesArray.push(this.createMatch(0, startDay, 0.375, 1, zoneName, teams[0], teams[3]));
        matchesArray.push(this.createMatch(0, startDay, 0.375, 2, zoneName, teams[1], teams[2]));
        matchesArray.push(this.createMatch(0, startDay+1, 0.375, 1, zoneName, teams[0], teams[2]));
        matchesArray.push(this.createMatch(0, startDay+1, 0.375, 2, zoneName, teams[3], teams[1]));
        matchesArray.push(this.createMatch(0, startDay+2, 0.375, 1, zoneName, teams[0], teams[1]));
        matchesArray.push(this.createMatch(0, startDay+2, 0.375, 2, zoneName, teams[2], teams[3]));
    },

    generateBracket: function(matchesArray, zoneName, slots, activeZones, startDay) {
        const validSlots = slots.map(s => {
            const zoneChar = s.slice(-1);
            return activeZones.includes(zoneChar) ? s : "BYE";
        });

        const qf = [
            {h: validSlots[0], a: validSlots[3]},
            {h: validSlots[1], a: validSlots[2]},
            {h: validSlots[4], a: validSlots[7]},
            {h: validSlots[5], a: validSlots[6]}
        ];

        qf.forEach((m, i) => {
            if (m.h === "BYE" || m.a === "BYE") return; 
            matchesArray.push(this.createMatch(0, startDay, 0.5 + (i*0.05), 1, zoneName + " (4tos)", m.h, m.a));
        });

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

    // EQUIPOS
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
        
        // Ordenar por Zona
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
        // Confirmación opcional
        if(!confirm("¿Eliminar este equipo?")) return;
        
        State.teams = State.teams.filter(t => t.id !== id);
        this.renderTeams(); 
        this.saveState();
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
                <td style="text-align:right">
                    <button class="btn-icon" onclick="App.deleteTeam('${t.id}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    // GENERACIÓN AUTOMÁTICA
    generateFixture: function() {
        if(State.teams.length < 2) return alert("Faltan equipos");
        
        // Ejecutar lógica adaptable
        const matches = FixtureLogic.generate(State.teams);
        
        // Asignar fechas reales
        const startDate = new Date(State.config.startDate + "T00:00:00");
        matches.forEach(m => {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + (m.dayIndex - 1));
            m.dateStr = d.toLocaleDateString();
            
            // Hora legible
            m.timeStr = excelTimeToString(m.timeVal);
            
            // Cancha nombre real
            const cObj = State.courts[m.courtIndex - 1];
            m.courtName = cObj ? cObj.name : `Cancha ${m.courtIndex}`;
        });

        State.matches = matches;
        this.renderFixture();
        this.saveState();
        alert(`Fixture generado: ${matches.length} partidos adaptados a ${State.teams.length} equipos.`);
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

    // EXPORTAR PDF
    exportToPDF: function() {
        if (State.matches.length === 0) return alert("No hay fixture generado para exportar.");
        
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text(`Fixture: ${State.config.tournamentName || 'Torneo'}`, 14, 20);
        
        doc.setFontSize(12);
        doc.text(`Fecha de inicio: ${State.config.startDate}`, 14, 28);
        
        const rows = State.matches.map(m => [
            m.dateStr,
            m.timeStr,
            m.courtName,
            m.zone,
            `${m.home} vs ${m.away}`
        ]);
        
        doc.autoTable({
            head: [['Fecha', 'Hora', 'Cancha', 'Fase/Zona', 'Partido']],
            body: rows,
            startY: 35,
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246] }
        });
        
        doc.save('fixture.pdf');
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

// Hacer App global para que funcione onclick desde HTML
window.App = App;

document.addEventListener('DOMContentLoaded', () => App.init());
