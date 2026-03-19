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

// VÉRIFICATION PIN
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
    } else { alert("PIN INCORRECT"); }
}

// DÉCLENCHEUR ADMIN (3s)
let adminTimer;
const trigger = document.getElementById('admin-trigger');
const startT = () => adminTimer = setTimeout(() => {
    const p = prompt("CODE ADMIN :");
    if(p === ADMIN_PASS) { naviguer('page-admin'); loadUsers(); }
}, 3000);
const stopT = () => clearTimeout(adminTimer);

trigger.addEventListener('touchstart', startT); trigger.addEventListener('touchend', stopT);
trigger.addEventListener('mousedown', startT); trigger.addEventListener('mouseup', stopT);

// INSCRIPTION
async function enregistrerProfil() {
    const nom = document.getElementById('reg-nom').value.trim();
    const tel = document.getElementById('reg-tel').value.trim().replace(/\D/g,'');
    if(!nom || tel.length < 8) return alert("Infos invalides");
    try {
        await database.ref('clients/' + tel + '/infos_client').set({
            nom: nom, tel: tel, date_inscription: new Date().toISOString(),
            device_source: getDeviceId(), categorie: 'C'
        });
        localStorage.setItem('user_tel_id', tel);
        localStorage.setItem('v32_registered', 'true');
        currentId = tel; launchApp();
    } catch(e) { alert("Erreur Cloud"); }
}

// ADMIN FUNCTIONS
async function loadUsers() {
    const list = document.getElementById('admin-user-list');
    list.innerHTML = "Chargement...";
    const snap = await database.ref('clients').once('value');
    const bSnap = await database.ref('blacklist').once('value');
    const banned = bSnap.val() || {};
    list.innerHTML = ""; let count = 0;
    snap.forEach(u => {
        const data = u.val().infos_client;
        if(data) {
            count++;
            const jours = Math.floor((new Date() - new Date(data.date_inscription)) / (1000*60*60*24));
            const isB = banned[u.key] === true;
            list.innerHTML += `<div class="user-row" style="${isB ? 'opacity:0.5' : ''}">
                <div><b>${data.nom}</b> (${jours}j)<br><small>${u.key}</small></div>
                <div>
                    <button class="btn-action wa" onclick="window.open('https://wa.me/221${u.key}')">WA</button>
                    <button class="btn-action pay" onclick="validerPaiement('${u.key}')">💰</button>
                    <button class="btn-action ban" onclick="toggleBan('${u.key}')">${isB ? 'RE' : 'BAN'}</button>
                </div></div>`;
        }
    });
    document.getElementById('dash-total').innerText = count;
}

async function validerPaiement(id) {
    if(confirm("Confirmer paiement ?")) {
        await database.ref('clients/' + id + '/infos_client').update({ date_inscription: new Date().toISOString() });
        loadUsers();
    }
}

async function toggleBan(id) {
    const ref = database.ref('blacklist/' + id);
    const s = await ref.once('value');
    await ref.set(!(s.val() === true));
    loadUsers();
}

function naviguer(id) {
    document.querySelectorAll('.gate, .full-page, #hub-accueil').forEach(e => e.style.display = 'none');
    document.getElementById(id).style.display = (id === 'hub-accueil' || id === 'page-admin') ? 'block' : 'flex';
}

async function launchApp() {
    document.getElementById('display-device-id').innerText = getDeviceId();
    let jours = 0;
    const snap = await database.ref('clients/' + currentId + '/infos_client').once('value');
    if(snap.exists()) {
        jours = Math.floor((new Date() - new Date(snap.val().date_inscription)) / (1000*60*60*24));
        document.getElementById('user-welcome').innerText = "Utilisateur : " + snap.val().nom;
    }
    if(jours >= 35) {
        naviguer('banned-screen');
        document.getElementById('ban-reason').innerText = "DÉLAI DÉPASSÉ (" + jours + "j)";
    } else if (localStorage.getItem('v32_active') !== 'true') naviguer('license-gate');
    else if (localStorage.getItem('v32_registered') !== 'true') naviguer('registration-gate');
    else naviguer('hub-accueil');
}

database.ref(".info/connected").on("value", s => {
    document.getElementById('cloud-dot').style.background = s.val() ? "#10b981" : "#ef4444";
});

window.onload = launchApp;
