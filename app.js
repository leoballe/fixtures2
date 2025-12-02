/**
 * FIXTURE PLANNER PRO - VERSION 3.0 (ARQUITECTURA LIMPIA)
 * Motor Adaptativo para 12-24 Equipos basado en Modelos Evita.
 */

// --- STATE MANAGEMENT ---
const State = {
    config: {
        name: "",
        model: "8x3_normal",
        startDate: "",
        days: 5,
        matchDuration: 60,
        minRest: 60,
        hasLoser: false,
        doubleBronze: false,
        courtsCount: 2
    },
    courts: [],
    teams: [],
    matches: []
};

// --- LOGICA DE MODELOS (Adaptador Matemático) ---
const FixtureEngine = {
    // Definición "Ideal" del modelo 8x3 (24 Equipos)
    // Traducido de tu Excel: Nro, Día, Hora, Cancha, Zona, Local, Visitante
    model_8x3: {
        // FASE 1: Zonas (3 fechas x 8 zonas)
        // Patrón por Zona de 3: 1vs2, 2vs3, 3vs1
        phase1_pattern: [
            { r: 1, m: [0, 1] }, // Eq 1 vs Eq 2
            { r: 2, m: [1, 2] }, // Eq 2 vs Eq 3
            { r: 3, m: [2, 0] }  // Eq 3 vs Eq 1
        ],
        // Definición de las 8 zonas teóricas
        zones: ['A','B','C','D','E','F','G','H'],
        
        // FASE 2: Clasificación A1 / A2 (Días 3,4,5)
        // A1: 1ºA, 1ºD, 1ºE, 1ºH
        // A2: 1ºB, 1ºC, 1ºF, 1ºG
        phase2_structure: [
            { name: "Zona A1", slots: ["1ºA", "1ºD", "1ºE", "1ºH"] },
            { name: "Zona A2", slots: ["1ºB", "1ºC", "1ºF", "1ºG"] }
        ]
    },

    generate: function(teams, config) {
        const matches = [];
        let matchId = 1;

        // 1. CLASIFICAR EQUIPOS EN ZONAS REALES
        const zoneMap = {}; // { A: [t1, t2], B: [t3, t4] }
        teams.forEach(t => {
            if(!zoneMap[t.zone]) zoneMap[t.zone] = [];
            zoneMap[t.zone].push(t);
        });
        const activeZones = Object.keys(zoneMap).sort();

        // 2. GENERAR FASE 1 (ZONAS)
        activeZones.forEach((zChar, zIdx) => {
            const teamList = zoneMap[zChar];
            const count = teamList.length;
            
            // Determinar si es Zona de 3 o Zona de 2
            if (count === 3) {
                // Round Robin 3 equipos (3 partidos)
                this.addMatch(matches, matchId++, 1, 0.375, 1, `Zona ${zChar}`, teamList[0].name, teamList[1].name);
                this.addMatch(matches, matchId++, 1, 0.45, 1, `Zona ${zChar}`, teamList[1].name, teamList[2].name);
                this.addMatch(matches, matchId++, 2, 0.375, 1, `Zona ${zChar}`, teamList[2].name, teamList[0].name);
            } else if (count === 2) {
                // Ida y Vuelta (2 partidos)
                this.addMatch(matches, matchId++, 1, 0.375, 1, `Zona ${zChar}`, teamList[0].name, teamList[1].name);
                this.addMatch(matches, matchId++, 2, 0.375, 1, `Zona ${zChar}`, teamList[1].name, teamList[0].name);
            }
        });

        // 3. GENERAR FASE 2 (A1 / A2) - ADAPTABLE
        // Si falta alguna zona (ej: H), reemplazamos su slot con "Mejor 2do"
        const p2 = this.model_8x3.phase2_structure;
        
        p2.forEach(group => {
            // Adaptar slots a la realidad
            const realSlots = group.slots.map(slotName => {
                const zoneReq = slotName.charAt(2); // "A" de "1ºA"
                if (activeZones.includes(zoneReq)) return slotName;
                return "Mejor 2º Global"; // Fallback si no existe la zona
            });

            // Generar cuadrangular (3 fechas: D3, D4, D5)
            const dBase = 3;
            // Fecha 1
            this.addMatch(matches, matchId++, dBase, 0.4, 1, group.name, realSlots[0], realSlots[3]);
            this.addMatch(matches, matchId++, dBase, 0.4, 2, group.name, realSlots[1], realSlots[2]);
            // Fecha 2
            this.addMatch(matches, matchId++, dBase+1, 0.4, 1, group.name, realSlots[0], realSlots[2]);
            this.addMatch(matches, matchId++, dBase+1, 0.4, 2, group.name, realSlots[3], realSlots[1]);
            // Fecha 3
            this.addMatch(matches, matchId++, dBase+2, 0.4, 1, group.name, realSlots[0], realSlots[1]);
            this.addMatch(matches, matchId++, dBase+2, 0.4, 2, group.name, realSlots[2], realSlots[3]);
        });

        // 4. FINALES (Día 5 tarde)
        this.addMatch(matches, 99, 5, 0.7, 1, "Final", "1º Zona A1", "1º Zona A2");
        this.addMatch(matches, 98, 5, 0.7, 2, "3er Puesto", "2º Zona A1", "2º Zona A2");

        return matches;
    },

    addMatch: function(list, id, day, time, courtIdx, zone, home, away) {
        list.push({
            id: id,
            day: day,
            timeVal: time, // Excel fraction
            courtIdx: courtIdx,
            zone: zone,
            home: home,
            away: away
        });
    }
};

// --- APP CONTROLLER ---
const App = {
    init: function() {
        this.loadState();
        this.renderCourts();
        this.renderTeams();
        this.updateUI();
    },

    // --- NAVIGATION ---
    goToStep: function(n) {
        if (n === 2 && !this.validateConfig()) return;
        if (n === 3) this.saveState(); // Guardar canchas
        if (n === 4) {
            if (State.teams.length < 4) return alert("Carga al menos 4 equipos.");
            this.updateSummary();
        }

        document.querySelectorAll('.panel').forEach(p => p.classList.remove('active'));
        document.getElementById(`step-${n}`).classList.add('active');
        
        document.querySelectorAll('.step-btn').forEach(b => {
            b.classList.remove('active');
            if(b.dataset.step == n) {
                b.classList.add('active');
                b.removeAttribute('disabled');
            }
        });
        this.saveState();
    },

    // --- STEP 1 ---
    validateConfig: function() {
        const name = document.getElementById('cfg-name').value;
        const date = document.getElementById('cfg-date').value;
        if (!name || !date) return alert("Completa Nombre y Fecha") && false;
        
        State.config.name = name;
        State.config.startDate = date;
        State.config.model = document.getElementById('cfg-model').value;
        State.config.days = parseInt(document.getElementById('cfg-days').value);
        return true;
    },

    // --- STEP 2: COURTS ---
    generateCourts: function() {
        const n = parseInt(document.getElementById('cfg-court-count').value);
        State.courts = [];
        for(let i=1; i<=n; i++) {
            State.courts.push({ id: i, name: `Cancha ${i}`, open: "09:00", close: "22:00" });
        }
        this.renderCourts();
        this.saveState();
    },

    renderCourts: function() {
        const c = document.getElementById('courts-container');
        c.innerHTML = State.courts.map((court, i) => `
            <div class="court-card">
                <div class="court-header">
                    <span>${court.name}</span>
                    <input type="text" value="${court.name}" 
                           onchange="State.courts[${i}].name=this.value;App.saveState()" 
                           style="width: 120px; padding: 4px;">
                </div>
                <div class="time-inputs">
                    <input type="time" value="${court.open}" onchange="State.courts[${i}].open=this.value"> 
                    <span>a</span>
                    <input type="time" value="${court.close}" onchange="State.courts[${i}].close=this.value">
                </div>
                <div class="break-config">
                    <label style="display:flex;align-items:center;gap:5px;font-size:0.8rem">
                        <input type="checkbox" onchange="State.courts[${i}].hasBreak=this.checked;App.saveState()"> 
                        Corte Mediodía
                    </label>
                </div>
            </div>
        `).join('');
    },

    // --- STEP 3: TEAMS ---
    importCSV: function(e) {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const lines = ev.target.result.split(/\r\n|\n/).filter(l => l.trim());
            if(lines.length < 2) return alert("CSV vacío o sin datos");
            
            // Detectar delimitador
            const delim = lines[0].includes(';') ? ';' : ',';
            let added = 0;
            
            // Ignoramos header, empezamos en 1
            for(let i=1; i<lines.length; i++) {
                const cols = lines[i].split(delim);
                if(cols.length >= 2) {
                    const z = cols[0].trim().toUpperCase();
                    const n = cols[1].trim();
                    if(n) {
                        State.teams.push({ id: safeId(), zone: z, name: n });
                        added++;
                    }
                }
            }
            // Ordenar por Zona
            State.teams.sort((a,b) => a.zone.localeCompare(b.zone));
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
        if(!n) return;
        State.teams.push({ id: safeId(), zone: z || "?", name: n });
        State.teams.sort((a,b) => a.zone.localeCompare(b.zone));
        this.renderTeams();
        this.saveState();
        document.getElementById('manual-name').value = "";
    },

    clearTeams: function() {
        if(confirm("¿Borrar todo?")) { State.teams = []; this.renderTeams(); this.saveState(); }
    },

    renderTeams: function() {
        const tb = document.getElementById('teams-body');
        document.getElementById('team-count').innerText = State.teams.length;
        
        if(State.teams.length === 0) {
            tb.innerHTML = "";
            document.getElementById('teams-empty').style.display = 'block';
            return;
        }
        document.getElementById('teams-empty').style.display = 'none';
        
        tb.innerHTML = State.teams.map(t => `
            <tr>
                <td><span class="badge">${t.zone}</span></td>
                <td>${t.name}</td>
                <td><button onclick="App.deleteTeam('${t.id}')" style="background:none;border:none;color:#ef4444;cursor:pointer"><i class="fa-solid fa-xmark"></i></button></td>
            </tr>
        `).join('');
    },

    deleteTeam: function(id) {
        State.teams = State.teams.filter(t => t.id !== id);
        this.renderTeams();
        this.saveState();
    },

    // --- STEP 4: GENERATE ---
    updateSummary: function() {
        document.getElementById('summary-model').innerText = State.config.model;
        document.getElementById('summary-teams').innerText = State.teams.length;
        document.getElementById('summary-courts').innerText = State.courts.length;
    },

    generateFixture: function() {
        if(State.teams.length === 0) return alert("No hay equipos.");
        
        // 1. Ejecutar motor lógico
        const rawMatches = FixtureEngine.generate(State.teams, State.config);
        
        // 2. Asignar Fechas y Horas Reales
        const startDate = new Date(State.config.startDate + "T00:00:00");
        
        State.matches = rawMatches.map(m => {
            // Fecha
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + (m.day - 1));
            
            // Hora (Excel a String)
            const totalSec = Math.round(m.timeVal * 86400);
            const hh = Math.floor(totalSec / 3600);
            const mm = Math.floor((totalSec % 3600) / 60);
            const timeStr = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
            
            // Cancha (Mapeo por índice)
            const court = State.courts[m.courtIdx - 1] || { name: `Cancha ${m.courtIdx}` };

            return { ...m, dateStr: d.toLocaleDateString(), timeStr: timeStr, courtName: court.name };
        });

        // 3. Renderizar
        const tb = document.getElementById('fixture-body');
        document.getElementById('fixture-empty').style.display = 'none';
        
        tb.innerHTML = State.matches.map(m => `
            <tr>
                <td>${m.id}</td>
                <td>Día ${m.day}</td>
                <td>${m.timeStr}</td>
                <td>${m.courtName}</td>
                <td><span class="badge">${m.zone}</span></td>
                <td><strong>${m.home}</strong> vs <strong>${m.away}</strong></td>
            </tr>
        `).join('');
        
        this.saveState();
    },

    // --- STEP 5: EXPORT ---
    exportPDF: function() {
        if(State.matches.length === 0) return alert("Genera el fixture primero.");
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text(State.config.name, 14, 20);
        doc.setFontSize(10);
        doc.text(`Generado: ${new Date().toLocaleDateString()}`, 14, 26);
        
        const rows = State.matches.map(m => [
            m.dateStr, m.timeStr, m.courtName, m.zone, `${m.home} vs ${m.away}`
        ]);
        
        doc.autoTable({
            head: [['Fecha', 'Hora', 'Cancha', 'Fase', 'Partido']],
            body: rows,
            startY: 35,
            theme: 'grid',
            headStyles: { fillColor: [59, 130, 246] }
        });
        
        doc.save("fixture_pro.pdf");
    },

    // --- SYSTEM ---
    saveState: function() { localStorage.setItem('fp_pro_v1', JSON.stringify(State)); },
    loadState: function() {
        const s = localStorage.getItem('fp_pro_v1');
        if(s) {
            const p = JSON.parse(s);
            Object.assign(State, p);
            // Restaurar fechas en inputs
            if(State.config.startDate) document.getElementById('cfg-date').value = State.config.startDate;
            if(State.config.name) document.getElementById('cfg-name').value = State.config.name;
        }
    },
    updateUI: function() {
        if(State.courts.length === 0) this.generateCourts();
    },
    bindEvents: function() {
        document.getElementById('btn-reset').addEventListener('click', () => {
            if(confirm("¿Reiniciar todo el proyecto?")) {
                localStorage.removeItem('fp_pro_v1');
                location.reload();
            }
        });
    }
};

document.addEventListener('DOMContentLoaded', () => App.init());
