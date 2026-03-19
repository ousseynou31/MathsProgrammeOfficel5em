// --- 1. CONFIGURATION ---
const firebaseConfig = { databaseURL: "https://gestion-boutiques-diouf-default-rtdb.firebaseio.com" };
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const SECRET_KEY = 7391;
const ADMIN_PASS = "0000";

// --- 2. GESTION ID UNIQUE ---
function getDeviceId() {
    let id = localStorage.getItem('diouf_device_id');
    if(!id) {
        id = "D-" + Math.random().toString(36).substr(2, 6).toUpperCase();
        try { localStorage.setItem('diouf_device_id', id); } catch(e) {}
    }
    return id;
}

let currentId = localStorage.getItem('user_tel_id') || getDeviceId();

// --- 3. SÉCURITÉ : VÉRIFICATION DU PIN ---
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

// --- 4. INSCRIPTION CLOUD ---
async function enregistrerProfil() {
    const nom = document.getElementById('reg-nom').value.trim();
    const tel = document.getElementById('reg-tel').value.trim().replace(/\D/g,'');
    
    if(!nom || tel.length < 8) return alert("Veuillez remplir correctement les champs.");

    try {
        await database.ref('clients/' + tel + '/infos_client').set({
            nom: nom, tel: tel,
            date_inscription: new Date().toISOString(),
            device_source: getDeviceId(),
            categorie: 'C'
        });
        localStorage.setItem('user_tel_id', tel);
        localStorage.setItem('v32_registered', 'true');
        currentId = tel;
        alert("✅ Inscription réussie !");
        launchApp();
    } catch(e) { alert("⚠️ Erreur Cloud."); }
}

// --- 5. LOGIQUE DE CALCUL ET LANCEMENT ---
function calculerJours(dateInsc) {
    if(!dateInsc) return 0;
    const debut = new Date(dateInsc);
    const aujourdhui = new Date();
    const diff = aujourdhui - debut;
    return Math.floor(diff / (1000 * 60 * 60 * 24));
}

async function launchApp() {
    const deviceId = getDeviceId();
    document.getElementById('display-device-id').innerText = deviceId;

    let jours = 0;
    try {
        const snap = await database.ref('clients/' + currentId + '/infos_client').once('value');
        if (snap.exists()) {
            jours = calculerJours(snap.val().date_inscription);
            document.getElementById('user-welcome').innerText = "Bonjour " + snap.val().nom;
        }
    } catch (e) { console.log("Mode hors-ligne"); }

    // Blocage si plus de 35 jours sans paiement
    if (jours >= 35) {
        naviguer('banned-screen');
        document.getElementById('ban-id-display').innerText = "ID: " + currentId;
        document.getElementById('ban-reason').innerText = "DÉLAI DE PAIEMENT DÉPASSÉ (" + jours + " jours)";
        return;
    }

    const active = localStorage.getItem('v32_active') === 'true';
    const reg = localStorage.getItem('v32_registered') === 'true';

    if (!active) naviguer('license-gate');
    else if (!reg) naviguer('registration-gate');
    else naviguer('hub-accueil');
}

// --- 6. SYSTÈME ADMINISTRATION ---
async function loadUsers() {
    const list = document.getElementById('admin-user-list');
    list.innerHTML = "Chargement...";
    
    try {
        const snap = await database.ref('clients').once('value');
        const blackSnap = await database.ref('blacklist').once('value');
        const blacklisted = blackSnap.val() || {};
        let count = 0;
        list.innerHTML = "";

        snap.forEach(u => {
            const data = u.val().infos_client;
            if(data) {
                count++;
                const jours = calculerJours(data.date_inscription);
                let color = jours >= 30 ? "status-danger" : (jours >= 25 ? "status-warning" : "status-ok");
                const isBanned = blacklisted[u.key] === true;

                list.innerHTML += `
                <div class="user-row">
                    <div style="display:flex; align-items:center; gap:12px;">
                        <div class="stats-circle ${color}">${jours}j</div>
                        <div style="flex:1">
                            <b style="font-size:0.8rem">${data.nom}</b><br>
                            <small style="color:gray">${u.key}</small>
                        </div>
                        <div style="display:flex; gap:5px;">
                            <button onclick="envoyerWA('${u.key}', '${data.nom}')" class="btn-action btn-wa">WA</button>
                            <button onclick="validerPay('${u.key}')" class="btn-action btn-pay">💰</button>
                            <button onclick="toggleBan('${u.key}')" class="btn-action btn-ban">${isBanned ? 'RE' : 'BAN'}</button>
                        </div>
                    </div>
                </div>`;
            }
        });
        document.getElementById('dash-total').innerText = count;
    } catch(e) { alert("Erreur chargement"); }
}

function envoyerWA(tel, nom) {
    const msg = encodeURIComponent("Bonjour " + nom + ", votre abonnement arrive à expiration...");
    window.open(`https://wa.me/221${tel}?text=${msg}`);
}

async function validerPay(id) {
    if(!confirm("Valider le paiement de cet élève ?")) return;
    await database.ref('clients/' + id + '/infos_client').update({ date_inscription: new Date().toISOString() });
    loadUsers();
}

async function toggleBan(id) {
    const ref = database.ref('blacklist/' + id);
    const snap = await ref.once('value');
    await ref.set(!(snap.val() === true));
    loadUsers();
}

// --- 7. NAVIGATION ET TIMERS ---
function naviguer(id) {
    document.querySelectorAll('.gate, .full-page, #hub-accueil').forEach(e => e.style.display = 'none');
    const target = document.getElementById(id);
    if(target) target.style.display = (id === 'hub-accueil') ? 'block' : 'flex';
}

let adminTimer;
const trig = document.getElementById('admin-trigger');
trig.addEventListener('touchstart', () => adminTimer = setTimeout(() => {
    if(prompt("MOT DE PASSE ADMIN:") === ADMIN_PASS) { naviguer('page-admin'); loadUsers(); }
}, 3000));
trig.addEventListener('touchend', () => clearTimeout(adminTimer));

// Surveillance Cloud
database.ref(".info/connected").on("value", s => {
    const dot = document.getElementById('cloud-dot');
    const txt = document.getElementById('cloud-text');
    dot.style.background = s.val() ? "#10b981" : "#ef4444";
    txt.innerText = s.val() ? "CLOUD ACTIF" : "HORS-LIGNE";
});

window.onload = launchApp;
