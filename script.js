// --- CONFIGURATION & CONNEXION ---
const firebaseConfig = { databaseURL: "https://gestion-boutiques-diouf-default-rtdb.firebaseio.com" };
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const SECRET_KEY = 7391;
const ADMIN_PASS = "0000";

// --- GESTION ID UNIQUE ---
function getDeviceId() {
    let id = localStorage.getItem('diouf_device_id');
    if(!id) {
        id = "D-" + Math.random().toString(36).substr(2, 6).toUpperCase();
        try { localStorage.setItem('diouf_device_id', id); } catch(e) {}
    }
    return id;
}
let currentId = localStorage.getItem('user_tel_id') || getDeviceId();

// --- SURVEILLANCE VOYANT CLOUD ---
database.ref(".info/connected").on("value", (snap) => {
    const dot = document.getElementById('cloud-dot');
    const text = document.getElementById('cloud-text');
    if (dot && text) {
        dot.style.background = snap.val() ? "#10b981" : "#ef4444";
        text.innerText = snap.val() ? "CLOUD ACTIF" : "HORS-LIGNE";
    }
});

// --- PROTOCOLE DE LANCEMENT SÉCURISÉ ---
async function launchApp() {
    // 1. Initialisation visuelle (ID visible)
    const deviceId = getDeviceId();
    if(document.getElementById('display-device-id')) {
        document.getElementById('display-device-id').innerText = deviceId;
    }

    // 2. VERROUILLAGE TOTAL (On cache tout par défaut)
    const allScreens = ['license-gate', 'registration-gate', 'hub-accueil', 'page-admin', 'banned-screen', 'modal-rapport'];
    allScreens.forEach(s => { if(document.getElementById(s)) document.getElementById(s).style.display = 'none'; });

    // 3. VÉRIFICATION BANNISSEMENT
    const isBanned = await checkBanStatus();
    if (isBanned) return;

    // 4. VÉRIFICATION DÉLAI DE GRÂCE (35 JOURS)
    let jours = 0;
    try {
        const idCheck = localStorage.getItem('user_tel_id') || deviceId;
        const snap = await database.ref('clients/' + idCheck + '/infos_client').once('value');
        if (snap.exists()) jours = calculerJours(snap.val().date_inscription);
    } catch (e) {}

    if (jours >= 35) {
        document.getElementById('banned-screen').style.display = 'flex';
        document.getElementById('ban-id-display').innerText = "ABONNEMENT EXPIRÉ (" + jours + "j)";
        return;
    }

    // 5. FILTRE D'ACCÈS
    const active = localStorage.getItem('v32_active') === 'true';
    const registered = localStorage.getItem('v32_registered') === 'true';

    if (!active) {
        document.getElementById('license-gate').style.display = 'flex';
    } else if (!registered) {
        document.getElementById('registration-gate').style.display = 'flex';
    } else {
        document.getElementById('hub-accueil').style.display = 'block';
    }
}

// --- SÉCURITÉ & PROFIL ---
function verifierLicence() {
    const input = document.getElementById('input-license').value.trim();
    const device = getDeviceId();
    let hash = 0;
    for (let i = 0; i < device.length; i++) {
        hash = ((hash << 5) - hash) + device.charCodeAt(i);
        hash |= 0;
    }
    const codeAttendu = Math.abs(hash + SECRET_KEY).toString().substring(0, 8);
    if(input === codeAttendu) {
        localStorage.setItem('v32_active', 'true');
        launchApp();
    } else { alert("❌ CODE PIN INCORRECT"); }
}

async function enregistrerProfil() {
    const nom = document.getElementById('reg-nom').value.trim();
    const tel = document.getElementById('reg-tel').value.trim();
    if(!nom || !tel) return alert("Veuillez remplir tous les champs.");
    const cleanTel = tel.replace(/\D/g,''); 
    
    try {
        await database.ref('clients/' + cleanTel + '/infos_client').set({
            nom: nom, tel: cleanTel, date_inscription: new Date().toISOString(),
            device_source: getDeviceId(), categorie: 'C'
        });
        localStorage.setItem('user_tel_id', cleanTel);
        localStorage.setItem('v32_registered', 'true');
        currentId = cleanTel;
        alert("✅ Compte Cloud créé !");
        launchApp();
    } catch(e) { alert("⚠️ Erreur Cloud."); }
}

// --- ADMINISTRATION & DASHBOARD (RESTRICTIF) ---
function openAdmin() {
    const code = prompt("ENTRER LE MOT DE PASSE ADMIN :");
    if(code === ADMIN_PASS) {
        document.getElementById('hub-accueil').style.display = 'none';
        document.getElementById('page-admin').style.display = 'block';
        loadUsers();
    }
}

async function loadUsers(filtre = 'TOUT') {
    const list = document.getElementById('admin-user-list');
    list.innerHTML = "<p style='text-align:center;'>Chargement...</p>";
    
    try {
        const usersSnap = await database.ref('clients').once('value');
        const blackSnap = await database.ref('blacklist').once('value');
        const blacklisted = blackSnap.val() || {};
        let clientsArray = [];

        usersSnap.forEach(u => {
            const data = u.val().infos_client;
            if(data) {
                const maCat = data.categorie || 'C';
                if (filtre === 'TOUT' || maCat === filtre) {
                    clientsArray.push({
                        id: u.key, nom: data.nom, date: data.date_inscription,
                        jours: calculerJours(data.date_inscription),
                        isBanned: blacklisted[u.key] === true, categorie: maCat
                    });
                }
            }
        });

        clientsArray.sort((a, b) => b.jours - a.jours);
        list.innerHTML = `<p style="text-align:center; font-weight:800;">📊 ${filtre} : ${clientsArray.length}</p>`;

        clientsArray.forEach(c => {
            let color = c.jours >= 30 ? "status-danger" : (c.jours >= 26 ? "status-warning" : "status-ok");
            list.innerHTML += `
                <div class="user-row" style="border-bottom: 1px solid #222; padding: 10px;">
                    <div class="stats-circle ${color}">${c.jours}j</div>
                    <div style="flex:1;"><b>${c.nom}</b><br><small>${c.id}</small></div>
                    <div style="display:flex; flex-direction:column; gap:4px;">
                        <button onclick="envoyerRappel('${c.id}','${c.nom}','${c.categorie}')" style="background:#25D366; color:white; font-size:10px;">WHATSAPP</button>
                        <button onclick="validerPaiement('${c.id}')" style="background:var(--gold); font-size:10px;">💰 PAYÉ</button>
                        <button onclick="deleteClient('${c.id}')" style="background:none; color:red; border:1px solid red; font-size:9px;">🗑️ DELETE</button>
                    </div>
                </div>`;
        });
        mettreAJourDashboard(clientsArray);
    } catch(e) { console.error(e); }
}

// --- FONCTIONS FINANCIÈRES & RAPPORTS ---
function obtenirTarifs() {
    const save = localStorage.getItem('mes_tarifs');
    return save ? JSON.parse(save) : { 'A': 5000, 'B': 3000, 'C': 1500 };
}

async function sauvegarderTarifs() {
    const nouveauxTarifs = {
        'A': parseInt(document.getElementById('price-A').value) || 0,
        'B': parseInt(document.getElementById('price-B').value) || 0,
        'C': parseInt(document.getElementById('price-C').value) || 0
    };
    await database.ref('parametres/tarifs').set(nouveauxTarifs);
    localStorage.setItem('mes_tarifs', JSON.stringify(nouveauxTarifs));
    alert("✅ Tarifs synchronisés !");
}

function ouvrirRapport() {
    const t = obtenirTarifs();
    const rows = document.querySelectorAll('.user-row');
    let total = 0;
    let html = `<h3>BILAN FINANCIER</h3><table border="1" style="width:100%; border-collapse:collapse;">`;
    
    rows.forEach(row => {
        const nom = row.querySelector('b').innerText;
        const cat = row.querySelector('small').innerText.includes('A') ? 'A' : 'C'; // Simplifié pour l'exemple
        const montant = t[cat] || 0;
        total += montant;
        html += `<tr><td>${nom}</td><td>${cat}</td><td>${montant} F</td></tr>`;
    });
    
    html += `<tr><td colspan="2"><b>TOTAL</b></td><td><b>${total} F</b></td></tr></table>`;
    document.getElementById('contenu-rapport').innerHTML = html;
    document.getElementById('modal-rapport').style.display = 'flex';
}

// --- UTILITAIRES ---
function calculerJours(dateStr) {
    if (!dateStr) return 0;
    const dInsc = new Date(dateStr);
    const diff = new Date().getTime() - dInsc.getTime();
    return Math.max(0, Math.round(diff / (1000 * 60 * 60 * 24)));
}

async function checkBanStatus() {
    const snap = await database.ref('blacklist/' + currentId).once('value');
    if (snap.exists() && snap.val() === true) {
        document.getElementById('banned-screen').style.display = 'flex';
        return true;
    }
    return false;
}

// --- INITIALISATION ---
window.onload = () => {
    const t = obtenirTarifs();
    if(document.getElementById('price-A')) {
        document.getElementById('price-A').value = t.A;
        document.getElementById('price-B').value = t.B;
        document.getElementById('price-C').value = t.C;
    }
    launchApp();
};

// Événement Admin (Appui long 3s)
const trig = document.getElementById('admin-trigger');
if(trig) {
    let timer;
    trig.onmousedown = trig.ontouchstart = () => timer = setTimeout(openAdmin, 3000);
    trig.onmouseup = trig.ontouchend = () => clearTimeout(timer);
}
// --- LOGIQUE DE L'HISTORIQUE ---

async function ouvrirHistoriquePleinEcran() {
    const modal = document.getElementById('modal-historique');
    const tbody = document.getElementById('table-paiements-body-fullscreen');
    modal.style.display = 'block';
    tbody.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:20px;'>Chargement du journal...</td></tr>";

    try {
        const snap = await database.ref('historique_paiements').once('value');
        let html = "";
        let totalGeneral = 0;

        snap.forEach(p => {
            const d = p.val();
            totalGeneral += Number(d.montant || 0);
            html += `
                <tr style="border-bottom:1px solid #222;">
                    <td style="padding:12px;">${d.date}</td>
                    <td style="padding:12px; font-weight:bold;">${d.nom}</td>
                    <td style="padding:12px;">${d.telephone}</td>
                    <td style="padding:12px; text-align:center;">
                        <span style="background:#25D366; color:black; padding:2px 6px; border-radius:4px; font-weight:800;">${d.montant} F</span>
                    </td>
                </tr>`;
        });

        tbody.innerHTML = html;
        document.getElementById('table-paiements-footer').innerHTML = `
            <tr>
                <td colspan="3" style="padding:15px; text-align:right;">TOTAL ENCAISSÉ :</td>
                <td style="padding:15px; text-align:center; color:#25D366; font-size:1rem;">${totalGeneral.toLocaleString()} F</td>
            </tr>`;
    } catch(e) { alert("Erreur de chargement de l'historique."); }
}

function fermerHistoriquePleinEcran() {
    document.getElementById('modal-historique').style.display = 'none';
}

function filtrerHistorique() {
    const filter = document.getElementById('search-historique').value.toUpperCase();
    const rows = document.getElementById('table-paiements-body-fullscreen').getElementsByTagName('tr');
    for (let i = 0; i < rows.length; i++) {
        const txt = rows[i].textContent || rows[i].innerText;
        rows[i].style.display = txt.toUpperCase().indexOf(filter) > -1 ? "" : "none";
    }
}

function telechargerCSV() {
    let csv = ["DATE;NOM;TELEPHONE;MONTANT"];
    const rows = document.querySelectorAll("#table-paiements-body-fullscreen tr");
    rows.forEach(tr => {
        let cols = tr.querySelectorAll("td");
        if(cols.length > 0) {
            csv.push(`${cols[0].innerText};${cols[1].innerText};${cols[2].innerText};${cols[3].innerText}`);
        }
    });
    const blob = new Blob([csv.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `JOURNAL_DIOUF_V32_${new Date().toLocaleDateString()}.csv`;
    link.click();
}
