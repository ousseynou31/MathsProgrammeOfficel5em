// --- 1. INITIALISATION & CONFIGURATION ---
const firebaseConfig = { databaseURL: "https://gestion-boutiques-diouf-default-rtdb.firebaseio.com" };
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const SECRET_KEY = 7391;
const ADMIN_PASS = "0000";

// --- 2. GESTION ID UNIQUE ---
function getDeviceId() {
    let id = localStorage.getItem('edu_v1_device_id');
    if(!id) {
        id = "EDU-" + Math.random().toString(36).substr(2, 6).toUpperCase();
        try { localStorage.setItem('edu_v1_device_id', id); } catch(e) {}
    }
    return id;
}
let currentId = localStorage.getItem('user_tel_id') || getDeviceId();

// --- 3. SURVEILLANCE CLOUD ---
database.ref(".info/connected").on("value", (snap) => {
    const dot = document.getElementById('cloud-dot');
    const text = document.getElementById('cloud-text');
    if (snap.val() === true) {
        dot.style.background = "#10b981";
        text.innerText = "CLOUD V1 ACTIF";
    } else {
        dot.style.background = "#ef4444";
        text.innerText = "HORS-LIGNE";
    }
});

// --- 4. SÉCURITÉ & ACCÈS ---
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
        localStorage.setItem('edu_v1_active', 'true');
        launchApp();
    } else { alert("❌ CODE PIN INCORRECT"); }
}

async function enregistrerProfil() {
    const nom = document.getElementById('reg-nom').value.trim();
    const tel = document.getElementById('reg-tel').value.trim();
    if(!nom || !tel) return alert("Veuillez remplir tous les champs.");
    const cleanTel = tel.replace(/\D/g,''); 
    try {
        await database.ref('v1/apprenants/' + cleanTel + '/infos_client').set({
            nom: nom, 
            tel: cleanTel,
            date_inscription: new Date().toISOString(), 
            device_source: getDeviceId(),
            categorie: 'C'
        });
        localStorage.setItem('user_tel_id', cleanTel);
        localStorage.setItem('edu_v1_registered', 'true');
        currentId = cleanTel; 
        alert("✅ Compte Créé avec succès !");
        launchApp();
    } catch(e) { alert("⚠️ Erreur Cloud."); }
}

// --- 5. LOGIQUE ADMIN (APPUI LONG 3S) ---
let adminTimer;
const trigger = document.getElementById('admin-trigger');
if(trigger) {
    trigger.addEventListener('touchstart', () => adminTimer = setTimeout(openAdmin, 3000));
    trigger.addEventListener('mousedown', () => adminTimer = setTimeout(openAdmin, 3000));
    trigger.addEventListener('touchend', () => clearTimeout(adminTimer));
    trigger.addEventListener('mouseup', () => clearTimeout(adminTimer));
}

function openAdmin() {
    if(prompt("MOT DE PASSE ADMIN :") === ADMIN_PASS) {
        document.getElementById('hub-accueil').style.display = 'none';
        document.getElementById('page-admin').style.display = 'block';
        loadUsers();
    }
}

// --- 6. GESTION DES UTILISATEURS & CATÉGORIES ---
async function loadUsers(filtre = 'TOUT') {
    const list = document.getElementById('admin-user-list');
    list.innerHTML = "<p style='text-align:center; color:gray;'>Chargement...</p>";
    try {
        const usersSnap = await database.ref('v1/apprenants').once('value');
        const blackSnap = await database.ref('v1/blacklist').once('value');
        const blacklisted = blackSnap.val() || {};
        let clientsArray = [];

        usersSnap.forEach(u => {
            const data = u.val().infos_client;
            if(data) {
                const maCat = data.categorie || 'C';
                if (filtre === 'TOUT' || maCat === filtre) {
                    clientsArray.push({
                        id: u.key, nom: data.nom,
                        date: data.date_inscription,
                        jours: calculerJours(data.date_inscription),
                        isBanned: blacklisted[u.key] === true,
                        categorie: maCat
                    });
                }
            }
        });

        clientsArray.sort((a, b) => b.jours - a.jours);
        list.innerHTML = "";
        clientsArray.forEach(c => {
            let colorClass = c.jours >= 30 ? "status-danger" : (c.jours >= 26 ? "status-warning" : "status-ok");
            list.innerHTML += `
                <div class="user-row" style="display:flex; align-items:center; gap:10px; border-bottom: 1px solid #222; padding: 12px 0;">
                    <div class="stats-circle ${colorClass}" style="flex-shrink:0;">${c.jours}j</div>
                    <div style="flex:1; min-width:0;">
                        <b style="font-size:0.85rem;">${c.nom}</b><br>
                        <small style="color:#666;">TEL: ${c.id}</small>
                    </div>
                    <select onchange="changerCategorie('${c.id}', this.value)" style="background:#1a1a1a; color:white; border:1px solid #444; font-size:0.65rem;">
                        <option value="A" ${c.categorie === 'A' ? 'selected' : ''}>A</option>
                        <option value="B" ${c.categorie === 'B' ? 'selected' : ''}>B</option>
                        <option value="C" ${c.categorie === 'C' ? 'selected' : ''}>C</option>
                    </select>
                    <div style="display:flex; flex-direction:column; gap:3px;">
                        <button onclick="envoyerRappel('${c.id}', '${c.nom}', '${c.categorie}')" style="background:#25D366; color:white; font-size:0.5rem; padding:3px; border-radius:3px; border:none;">WA</button>
                        <button onclick="validerPaiement('${c.id}')" style="background:#fbbf24; color:black; font-size:0.5rem; padding:3px; border-radius:3px; border:none;">PAYÉ</button>
                        <button onclick="toggleBan('${c.id}')" style="background:${c.isBanned ? '#10b981' : '#ef4444'}; color:white; font-size:0.5rem; padding:3px; border-radius:3px; border:none;">BAN</button>
                        <button onclick="deleteClient('${c.id}')" style="background:none; border:1px solid #ff4444; color:#ff4444; font-size:0.5rem; padding:2px; border-radius:3px;">DEL</button>
                    </div>
                </div>`;
        });
        mettreAJourDashboard(clientsArray);
    } catch(e) { console.error(e); }
}

// --- 7. FONCTIONS FINANCIÈRES & WHATSAPP ---
function obtenirTarifs() {
    const sauvegardes = localStorage.getItem('mes_tarifs_v1');
    return sauvegardes ? JSON.parse(sauvegardes) : { 'A': 5000, 'B': 3000, 'C': 1500 };
}

async function validerPaiement(userId) {
    if(!confirm("Valider le paiement ?")) return;
    try {
        const snap = await database.ref('v1/apprenants/' + userId).once('value');
        const client = snap.val().infos_client;
        const tarifs = obtenirTarifs();
        const montant = tarifs[client.categorie] || 0;
        const maintenant = new Date();

        await database.ref('v1/apprenants/' + userId + '/infos_client').update({ date_inscription: maintenant.toISOString() });
        await database.ref('v1/historique_paiements').push({
            nom: client.nom, telephone: userId, categorie: client.categorie,
            date: maintenant.toLocaleString('fr-FR'), montant: montant, situation: "PAYÉ"
        });
        alert("✅ Paiement de " + montant + " F validé !");
        loadUsers(); 
    } catch (e) { alert("Erreur technique."); }
}

function envoyerRappel(idUser, nom, cat) {
    const t = obtenirTarifs();
    const montant = t[cat] || 0;
    let tel = idUser.replace(/\D/g, ''); 
    if (!tel.startsWith('221')) tel = '221' + tel;
    const message = `Bonjour ${nom},%0A%0ARappel abonnement (Catégorie ${cat}).%0AMontant : ${montant.toLocaleString()} FCFA.`;
    window.open(`https://wa.me/${tel}?text=${message}`, '_blank');
}

// --- 8. SYSTÈME DE SUPPRESSION SÉCURISÉ ---
async function deleteClient(idUser) {
    if (confirm("⚠️ SUPPRIMER DÉFINITIVEMENT CET ÉLÈVE ?")) {
        if (prompt("Tapez 'SUPPRIMER' pour confirmer :") === "SUPPRIMER") {
            await database.ref('v1/apprenants/' + idUser).remove();
            await database.ref('v1/blacklist/' + idUser).remove();
            alert("✅ Effacé.");
            loadUsers();
        }
    }
}

// --- 9. LANCEMENT ET UTILITAIRES ---
function calculerJours(dateStr) {
    if (!dateStr) return 0;
    const dInsc = new Date(dateStr);
    const diffTime = new Date().setHours(0,0,0,0) - dInsc.setHours(0,0,0,0);
    return Math.max(0, Math.round(diffTime / (1000 * 60 * 60 * 24)));
}

async function changerCategorie(id, cat) {
    await database.ref('v1/apprenants/' + id + '/infos_client').update({ categorie: cat });
    loadUsers();
}

async function toggleBan(id) {
    const ref = database.ref('v1/blacklist/' + id);
    const snap = await ref.once('value');
    await ref.set(!(snap.val() === true));
    loadUsers();
}

async function launchApp() {
    const active = localStorage.getItem('edu_v1_active') === 'true';
    const reg = localStorage.getItem('edu_v1_registered') === 'true';
    document.querySelectorAll('.gate').forEach(g => g.style.display = 'none');
    document.getElementById('hub-accueil').style.display = 'none';

    const snapBan = await database.ref('v1/blacklist/' + currentId).once('value');
    if(snapBan.val() === true) {
        document.getElementById('banned-screen').style.display = 'flex';
        return;
    }

    if (!active) document.getElementById('license-gate').style.display = 'flex';
    else if (!reg) document.getElementById('registration-gate').style.display = 'flex';
    else document.getElementById('hub-accueil').style.display = 'block';

    if(document.getElementById('display-device-id')) 
        document.getElementById('display-device-id').innerText = getDeviceId();
}

function mettreAJourDashboard(clients) {
    const t = obtenirTarifs();
    let total = 0;
    clients.forEach(c => total += (t[c.categorie] || 0));
    if(document.getElementById('dash-total-a')) document.getElementById('dash-total-a').innerText = clients.length;
}

window.onload = launchApp;
