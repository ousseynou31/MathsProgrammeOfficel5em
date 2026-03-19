// --- CONFIGURATION ---
const firebaseConfig = { databaseURL: "https://gestion-boutiques-diouf-default-rtdb.firebaseio.com" };
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const SECRET_KEY = 7391;
const ADMIN_PASS = "0000";

function getDeviceId() {
    let id = localStorage.getItem('diouf_device_id');
    if(!id) {
        id = "D-" + Math.random().toString(36).substr(2, 6).toUpperCase();
        localStorage.setItem('diouf_device_id', id);
    }
    return id;
}

let currentId = localStorage.getItem('user_tel_id') || getDeviceId();

// --- SÉCURITÉ PIN ---
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
    } else { alert("❌ PIN INCORRECT"); }
}

// --- LOGIQUE ADMIN (3 secondes) ---
let adminTimer;
const trig = document.getElementById('admin-trigger');
trig.addEventListener('touchstart', () => {
    adminTimer = setTimeout(() => {
        const p = prompt("ENTRER LE CODE D'ACCÈS ADMINISTRATEUR :");
        if(p === ADMIN_PASS) { naviguer('page-admin'); loadUsers(); }
        else if(p !== null) { alert("Accès refusé."); }
    }, 3000);
});
trig.addEventListener('touchend', () => clearTimeout(adminTimer));

// --- GESTION DES UTILISATEURS ---
async function loadUsers() {
    const list = document.getElementById('admin-user-list');
    list.innerHTML = "Chargement...";
    const snap = await database.ref('clients').once('value');
    list.innerHTML = "";
    let count = 0;

    snap.forEach(u => {
        const data = u.val().infos_client;
        if(data) {
            count++;
            const debut = new Date(data.date_inscription);
            const jours = Math.floor((new Date() - debut) / (1000*60*60*24));
            let color = jours >= 30 ? "status-danger" : (jours >= 25 ? "status-warning" : "status-ok");

            list.innerHTML += `
                <div class="user-row">
                    <div style="display:flex; align-items:center; gap:10px;">
                        <div class="stats-circle ${color}">${jours}j</div>
                        <div style="flex:1"><b>${data.nom}</b><br><small>${u.key}</small></div>
                        <button onclick="validerPaiement('${u.key}')" style="background:var(--accent); border:none; color:white; padding:8px; border-radius:5px;">💰 PAYÉ</button>
                    </div>
                </div>`;
        }
    });
    document.getElementById('dash-total').innerText = count;
}

async function validerPaiement(id) {
    if(confirm("Confirmer le paiement pour cet élève ?")) {
        await database.ref('clients/' + id + '/infos_client').update({ date_inscription: new Date().toISOString() });
        loadUsers();
    }
}

// --- INITIALISATION ---
function naviguer(id) {
    document.querySelectorAll('.gate, .full-page, #hub-accueil').forEach(e => e.style.display = 'none');
    document.getElementById(id).style.display = (id === 'hub-accueil' || id === 'page-admin') ? 'block' : 'flex';
}

async function launchApp() {
    document.getElementById('display-device-id').innerText = getDeviceId();
    
    // Vérification Date Expiration
    let jours = 0;
    const snap = await database.ref('clients/' + currentId + '/infos_client').once('value');
    if(snap.exists()) {
        jours = Math.floor((new Date() - new Date(snap.val().date_inscription)) / (1000*60*60*24));
        document.getElementById('user-welcome').innerText = "Bienvenue, " + snap.val().nom;
    }

    if(jours >= 35) {
        naviguer('banned-screen');
        document.getElementById('ban-reason').innerText = "ABONNEMENT EXPIRÉ (" + jours + " jours)";
        return;
    }

    if (localStorage.getItem('v32_active') !== 'true') naviguer('license-gate');
    else if (localStorage.getItem('v32_registered') !== 'true') naviguer('registration-gate');
    else naviguer('hub-accueil');
}

database.ref(".info/connected").on("value", s => {
    document.getElementById('cloud-dot').style.background = s.val() ? "#10b981" : "#ef4444";
    document.getElementById('cloud-text').innerText = s.val() ? "CLOUD ACTIF" : "HORS-LIGNE";
});

window.onload = launchApp;
