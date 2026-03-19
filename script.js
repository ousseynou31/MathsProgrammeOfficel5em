// --- 1. INITIALISATION ET SÉCURITÉ ---
const firebaseConfig = { databaseURL: "https://gestion-boutiques-diouf-default-rtdb.firebaseio.com" };
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const SECRET_KEY = 7391;
const ADMIN_PASS = "0000";

function getDeviceId() {
    let id = localStorage.getItem('diouf_device_id');
    if(!id) {
        id = "D-" + Math.random().toString(36).substr(2, 6).toUpperCase();
        try { localStorage.setItem('diouf_device_id', id); } catch(e) {}
    }
    return id;
}

let currentId = localStorage.getItem('user_tel_id') || getDeviceId();

// --- 2. SURVEILLANCE CONNEXION ---
database.ref(".info/connected").on("value", (snap) => {
    const dot = document.getElementById('cloud-dot');
    const text = document.getElementById('cloud-text');
    if (snap.val() === true) {
        dot.style.background = "#10b981";
        text.innerText = "SYSTÈME CONNECTÉ";
    } else {
        dot.style.background = "#ef4444";
        text.innerText = "HORS-LIGNE";
    }
});

// --- 3. LOGIQUE D'ACCÈS ET INSCRIPTION ---
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
            nom: nom, 
            tel: cleanTel,
            date_inscription: new Date().toISOString(), 
            device_source: getDeviceId(),
            categorie: 'C'
        });
        localStorage.setItem('user_tel_id', cleanTel);
        localStorage.setItem('v32_registered', 'true');
        currentId = cleanTel; 
        alert("✅ Inscription réussie !");
        launchApp();
    } catch(e) { alert("⚠️ Erreur Cloud."); }
}

// --- 4. GESTION DES BANNISSEMENTS ---
async function checkBanStatus() {
    try {
        const snapshot = await database.ref('blacklist/' + currentId).once('value');
        if (snapshot.exists() && snapshot.val() === true) {
            document.getElementById('banned-screen').style.display = 'flex';
            document.getElementById('ban-id-display').innerText = "ID: " + currentId;
            return true;
        }
    } catch (e) {}
    return false;
}

async function toggleBan(idUser) {
    const ref = database.ref('blacklist/' + idUser);
    const snap = await ref.once('value');
    await ref.set(!(snap.val() === true));
    loadUsers();
}

// --- 5. ADMINISTRATION MASTER ---
let adminTimer;
const trigger = document.getElementById('admin-trigger');
if(trigger) {
    trigger.addEventListener('touchstart', () => adminTimer = setTimeout(openAdmin, 3000));
    trigger.addEventListener('mousedown', () => adminTimer = setTimeout(openAdmin, 3000));
    trigger.addEventListener('touchend', () => clearTimeout(adminTimer));
    trigger.addEventListener('mouseup', () => clearTimeout(adminTimer));
}

function openAdmin() {
    const code = prompt("MOT DE PASSE ADMIN :");
    if(code === ADMIN_PASS) {
        naviguer('page-admin');
        loadUsers();
    }
}

async function loadUsers(filtre = 'TOUT') {
    const list = document.getElementById('admin-user-list');
    list.innerHTML = "<p style='text-align:center; color:gray;'>Chargement...</p>";
    try {
        const usersSnap = await database.ref('clients').once('value');
        const blackSnap = await database.ref('blacklist').once('value');
        const blacklisted = blackSnap.val() || {};
        let clientsArray = [];

        usersSnap.forEach(u => {
            const data = u.val().infos_client;
            if(data && (filtre === 'TOUT' || data.categorie === filtre)) {
                clientsArray.push({
                    id: u.key,
                    nom: data.nom,
                    jours: calculerJours(data.date_inscription),
                    isBanned: blacklisted[u.key] === true,
                    categorie: data.categorie || 'C'
                });
            }
        });

        clientsArray.sort((a, b) => b.jours - a.jours);
        list.innerHTML = "";
        clientsArray.forEach(c => {
            let color = c.jours >= 30 ? "status-danger" : (c.jours >= 25 ? "status-warning" : "status-ok");
            list.innerHTML += `
                <div class="user-row" style="display:flex; align-items:center; gap:10px; padding:12px; border-bottom:1px solid #222;">
                    <div class="stats-circle ${color}">${c.jours}j</div>
                    <div style="flex:1;">
                        <b>${c.nom}</b><br><small>TEL: ${c.id}</small>
                    </div>
                    <select onchange="changerCategorie('${c.id}', this.value)">
                        <option value="A" ${c.categorie === 'A'?'selected':''}>A</option>
                        <option value="B" ${c.categorie === 'B'?'selected':''}>B</option>
                        <option value="C" ${c.categorie === 'C'?'selected':''}>C</option>
                    </select>
                    <button onclick="validerPaiement('${c.id}')">💰</button>
                    <button onclick="toggleBan('${c.id}')" style="background:${c.isBanned?'#10b981':'#ef4444'}">🚫</button>
                    <button onclick="deleteClient('${c.id}')">🗑️</button>
                </div>`;
        });
        mettreAJourDashboard(clientsArray);
    } catch(e) { list.innerHTML = "Erreur Cloud."; }
}

// --- 6. CALCULS ET PAIEMENTS ---
function calculerJours(dateStr) {
    if (!dateStr) return 0;
    const dInsc = new Date(dateStr);
    const aujourdhui = new Date();
    const diff = aujourdhui.getTime() - dInsc.getTime();
    return Math.max(0, Math.floor(diff / (1000 * 60 * 60 * 24)));
}

async function validerPaiement(userId) {
    if(!confirm("Réinitialiser l'abonnement ?")) return;
    try {
        const snap = await database.ref('clients/' + userId + '/infos_client').once('value');
        const client = snap.val();
        const t = obtenirTarifs();
        const montant = t[client.categorie || 'C'] || 0;

        await database.ref('clients/' + userId + '/infos_client').update({
            date_inscription: new Date().toISOString()
        });

        await database.ref('historique_paiements').push({
            nom: client.nom, telephone: userId, montant: montant, date: new Date().toLocaleString(), situation: "PAYÉ"
        });
        alert("Paiement validé !");
        loadUsers();
    } catch(e) { alert("Erreur."); }
}

// --- 7. FONCTIONS SYSTÈME (Bannissement, Tarifs, Suppression) ---
async function deleteClient(idUser) {
    if (confirm("SUPPRESSION DÉFINITIVE ?") && prompt("Tapez 'SUPPRIMER'") === "SUPPRIMER") {
        await database.ref('clients/' + idUser).remove();
        await database.ref('blacklist/' + idUser).remove();
        loadUsers();
    }
}

function obtenirTarifs() {
    const s = localStorage.getItem('mes_tarifs');
    return s ? JSON.parse(s) : { 'A': 5000, 'B': 3000, 'C': 1500 };
}

async function sauvegarderTarifs() {
    const nt = {
        'A': parseInt(document.getElementById('price-A').value) || 0,
        'B': parseInt(document.getElementById('price-B').value) || 0,
        'C': parseInt(document.getElementById('price-C').value) || 0
    };
    await database.ref('parametres/tarifs').set(nt);
    localStorage.setItem('mes_tarifs', JSON.stringify(nt));
    alert("Tarifs mis à jour.");
}

// --- 8. INITIALISATION AU CHARGEMENT ---
window.onload = function() {
    const t = obtenirTarifs();
    if(document.getElementById('price-A')) {
        document.getElementById('price-A').value = t.A;
        document.getElementById('price-B').value = t.B;
        document.getElementById('price-C').value = t.C;
    }
    launchApp();
};

async function launchApp() {
    const banni = await checkBanStatus();
    if (banni) return;

    const active = localStorage.getItem('v32_active') === 'true';
    const reg = localStorage.getItem('v32_registered') === 'true';

    document.querySelectorAll('.gate').forEach(g => g.style.display = 'none');
    document.getElementById('hub-accueil').style.display = 'none';

    if (!active) document.getElementById('license-gate').style.display = 'flex';
    else if (!reg) document.getElementById('registration-gate').style.display = 'flex';
    else document.getElementById('hub-accueil').style.display = 'block';
    
    if(document.getElementById('display-device-id')) 
        document.getElementById('display-device-id').innerText = getDeviceId();
}

function naviguer(id) {
    document.getElementById('hub-accueil').style.display = 'none';
    document.querySelectorAll('.full-page').forEach(p => p.style.display = 'none');
    document.getElementById(id).style.display = 'block';
}

function deconnexionManuelle() {
    localStorage.clear();
    location.reload();
}
