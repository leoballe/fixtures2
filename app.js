/**
 * FIXTURE PLANNER PRO v3.2
 * Solución de botón Eliminar + Corrección automática de datos
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
        hasLoser: false,
        doubleBronze: false,
        courtsCount: 2
    },
    courts: [],
    teams: [],
    matches: []
};

// --- UTILS ---
function safeId() { return "id_" + Date.now().toString(36) + Math.random().toString(36).substr(2, 5); }

function excelTimeToString(fraction) {
    if (!fraction || isNaN(fraction)) return "09:00";
    const totalSeconds = Math.round(fraction * 24 * 3600);
    const hours = Math.floor(totalSeconds / 3600);
    const minutes = Math.floor((totalSeconds % 3600) / 60);
    return `${String(hours).padStart(2,'0')}:${String(minutes).padStart(2,'0')}`;
}

// --- LÓGICA DE MODELOS (Adaptador Matemático) ---
const FixtureEngine = {
    // Definición "Ideal" del modelo 8x3 (24 Equipos)
    model_8x3: {
        zones: ['A','B','C','D','E','F','G','H'],
        phase2_structure: [
            { name: "Zona A1", slots: ["1ºA", "1ºD", "1ºE", "1ºH"] },
            { name: "Zona A2", slots: ["1ºB", "1ºC", "1ºF", "1ºG"] }
        ]
    },

    generate: function(teams, config) {
        const matches = [];
        let matchId = 1;

        // 1. ORGANIZAR EQUIPOS
        const zoneMap = {}; 
        teams.forEach(t => {
            if(!zoneMap[t.zone]) zoneMap[t.zone] = [];
            zoneMap[t.zone].push(t);
        });
        const activeZones = Object.keys(zoneMap).sort();

        // 2. FASE 1: ZONAS
        activeZones.forEach((zChar, zIdx) => {
            const teamList = zoneMap[zChar];
            const count = teamList.length;
            
            if (count === 3) {
                this.addMatch(matches, matchId++, 1, 0.375, 1, `Zona ${zChar}`, teamList[0].name, teamList[1].name);
                this.addMatch(matches, matchId++, 1, 0.45, 1, `Zona ${zChar}`, teamList[1].name, teamList[2].name);
                this.addMatch(matches, matchId++, 2, 0.375, 1, `Zona ${zChar}`, teamList[2].name, teamList[0].name);
            } else if (count === 2) {
                this.addMatch(matches, matchId++, 1, 0.375, 1, `Zona ${zChar}`, teamList[0].name, teamList[1].name);
                this.addMatch(matches, matchId++, 2, 0.375, 1, `Zona ${zChar}`, teamList[1].name, teamList[0].name);
            }
        });

        // 3. FASE 2: A1 / A2
        const p2 = this.model_8x3.phase2_structure;
        p2.forEach(group => {
            const realSlots = group.slots.map(slotName => {
                const zoneReq = slotName.charAt(2);
                if (activeZones.includes(zoneReq)) return slotName;
                return "Mejor 2º"; 
            });

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

        // 4. FASE 3: LLAVES
        this.generateBracket(matches, "Llave B (2dos)", ["2ºA","2ºB","2ºC","2ºD","2ºE","2ºF","2ºG","2ºH"], activeZones, 3);
        this.generateBracket(matches, "Llave C (3ros)", ["3ºA","3ºB","3ºC","3ºD","3ºE","3ºF","3ºG","3ºH"], activeZones, 3);

        // 5. FINALES
        this.addMatch(matches, 900, 5, 0.7, 1, "Final", "1º Zona A1", "1º Zona A2");
        this.addMatch(matches, 901, 5, 0.7, 2, "3er Puesto", "2º Zona A1", "2º Zona A2");
        this.addMatch(matches, 902, 5, 0.4, 1, "5to Puesto", "3º Zona A1", "3º Zona A2");
        this.addMatch(matches, 903, 5, 0.4, 2, "7mo Puesto", "4º Zona A1", "4º Zona A2");

        // Renumerar IDs consecutivos visuales
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
    
    addMatch: function(list, id, day, time, courtIdx, zone, home, away) {
        list.push(this.createMatch(id, day, time, courtIdx, zone, home, away));
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
            this.addMatch(matchesArray, 0, startDay, 0.5 + (i*0.05), 1, zoneName + " (4tos)", m.h, m.a);
        });

        this.addMatch(matchesArray, 0, startDay+1, 0.6, 1, zoneName + " (Semi)", "Ganador Q1", "Ganador Q2");
        this.addMatch(matchesArray, 0, startDay+1, 0.6, 2, zoneName + " (Semi)", "Ganador Q3", "Ganador Q4");
        this.addMatch(matchesArray, 0, startDay+2, 0.7, 1, zoneName + " (Final)", "Ganador S1", "Ganador S2");
    }
};

// --- APP CONTROLLER ---
const App = {
    init: function() {
        this.loadState();
        this.sanitizeData(); // <-- AUTO-REPARACIÓN DE DATOS
        this.renderCourts(); 
        this.renderTeams();
        this.updateUI(); 
    },

    // REPARACIÓN AUTOMÁTICA DE DATOS ANTIGUOS
    sanitizeData: function() {
        let fixed = false;
        // Si hay equipos sin ID o con ID duplicado, regenerar
        State.teams.forEach(t => {
            if (!t.id) {
                t.id = safeId();
                fixed = true;
            }
        });
        if (fixed) {
            console.log("Datos reparados automáticamente.");
            this.saveState();
        }
    },

    goToStep: function(n) {
        if (n === 2 && !this.validateConfig()) return;
        if (n === 3) this.saveState();
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
            </div>
        `).join('');
    },

    // --- EQUIPOS ---
    importCSV: function(e) {
        const file = e.target.files[0];
        if(!file) return;
        const reader = new FileReader();
        reader.onload = (ev) => {
            const lines = ev.target.result.split(/\r\n|\n/).filter(l => l.trim());
            if(lines.length < 2) return alert("CSV vacío o sin datos");
            
            const delim = lines[0].includes(';') ? ';' : ',';
            let added = 0;
            
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

    // ESTA ES LA FUNCIÓN DEL BOTÓN QUE FALLABA
    deleteTeam: function(id) {
        if(!confirm("¿Eliminar equipo?")) return;
        
        // Filtramos por ID exacto (string vs string)
        const initialCount = State.teams.length;
        State.teams = State.teams.filter(t => String(t.id) !== String(id));
        
        if (State.teams.length === initialCount) {
            console.warn("No se encontró el equipo con ID:", id);
            // Fallback de emergencia por si los IDs estan corruptos en memoria
            App.sanitizeData(); 
            alert("Hubo un error de sincronización. Intenta borrar de nuevo.");
        }
        
        this.renderTeams();
        this.saveState();
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
        
        // Renderizado seguro del ID en el onclick
        tb.innerHTML = State.teams.map(t => `
            <tr>
                <td><span class="badge">${t.zone}</span></td>
                <td>${t.name}</td>
                <td>
                    <button type="button" class="btn-icon-delete" onclick="App.deleteTeam('${t.id}')">
                        <i class="fa-solid fa-trash"></i>
                    </button>
                </td>
            </tr>
        `).join('');
    },

    updateSummary: function() {
        document.getElementById('summary-model').innerText = State.config.model;
        document.getElementById('summary-teams').innerText = State.teams.length;
        document.getElementById('summary-courts').innerText = State.courts.length;
    },

    generateFixture: function() {
        if(State.teams.length === 0) return alert("No hay equipos.");
        
        const rawMatches = FixtureEngine.generate(State.teams, State.config);
        const startDate = new Date(State.config.startDate + "T00:00:00");
        
        State.matches = rawMatches.map(m => {
            const d = new Date(startDate);
            d.setDate(startDate.getDate() + (m.dayIndex - 1));
            
            const totalSec = Math.round(m.timeVal * 86400);
            const hh = Math.floor(totalSec / 3600);
            const mm = Math.floor((totalSec % 3600) / 60);
            const timeStr = `${String(hh).padStart(2,'0')}:${String(mm).padStart(2,'0')}`;
            
            const court = State.courts[m.courtIndex - 1] || { name: `Cancha ${m.courtIndex}` };

            return { ...m, dateStr: d.toLocaleDateString(), timeStr: timeStr, courtName: court.name };
        });

        const tb = document.getElementById('fixture-body');
        document.getElementById('fixture-empty').style.display = 'none';
        
        tb.innerHTML = State.matches.map(m => `
            <tr>
                <td>${m.id}</td>
                <td>Día ${m.dayIndex}</td>
                <td>${m.timeStr}</td>
                <td>${m.courtName}</td>
                <td><span class="badge">${m.zone}</span></td>
                <td><strong>${m.home}</strong> vs <strong>${m.away}</strong></td>
            </tr>
        `).join('');
        
        this.saveState();
    },

    exportPDF: function() {
        if(State.matches.length === 0) return alert("Genera el fixture primero.");
        const { jsPDF } = window.jspdf;
        const doc = new jsPDF();
        
        doc.setFontSize(18);
        doc.text(State.config.name || "Fixture", 14, 20);
        doc.setFontSize(10);
        doc.text(`Fecha inicio: ${State.config.startDate}`, 14, 26);
        
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

    saveState: function() { localStorage.setItem('fp_pro_v1', JSON.stringify(State)); },
    loadState: function() {
        const s = localStorage.getItem('fp_pro_v1');
        if(s) {
            const p = JSON.parse(s);
            Object.assign(State, p);
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

// EXPOSICIÓN GLOBAL PARA QUE EL HTML LO VEA
window.App = App;

document.addEventListener('DOMContentLoaded', () => App.init());
