const firebaseConfig = { databaseURL: "https://gestion-boutiques-diouf-default-rtdb.firebaseio.com" };
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const SECRET_KEY = 7391;
const ADMIN_PASS = "0000";

// --- GESTION ID ---
function getDeviceId() {
    let id = localStorage.getItem('diouf_device_id');
    if(!id) {
        id = "D-" + Math.random().toString(36).substr(2, 6).toUpperCase();
        localStorage.setItem('diouf_device_id', id);
    }
    return id;
}

// --- DÉCLENCHEUR ADMIN (3s sur la 1ère ligne) ---
let adminTimer;
const trigger = document.getElementById('admin-trigger');

const startT = () => adminTimer = setTimeout(() => {
    const p = prompt("CODE ADMIN :");
    if(p === ADMIN_PASS) { naviguer('page-admin'); loadUsers(); }
}, 3000);
const stopT = () => clearTimeout(adminTimer);

trigger.addEventListener('touchstart', startT);
trigger.addEventListener('touchend', stopT);
trigger.addEventListener('mousedown', startT); // Pour PC

// --- FONCTIONS SYSTÈME ---
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

async function loadUsers() {
    const list = document.getElementById('admin-user-list');
    list.innerHTML = "Chargement...";
    const snap = await database.ref('clients').once('value');
    list.innerHTML = "";
    snap.forEach(u => {
        const data = u.val().infos_client;
        if(data) {
            const jours = Math.floor((new Date() - new Date(data.date_inscription)) / (1000*60*60*24));
            list.innerHTML += `<div class="user-row">
                <div><b>${data.nom}</b> (${jours}j)</div>
                <button onclick="validerPaiement('${u.key}')" style="padding:5px; background:green; color:white; border:none;">💰 PAYÉ</button>
            </div>`;
        }
    });
}

async function validerPaiement(id) {
    if(confirm("Confirmer paiement ?")) {
        await database.ref('clients/' + id + '/infos_client').update({ date_inscription: new Date().toISOString() });
        loadUsers();
    }
}

function naviguer(id) {
    document.querySelectorAll('.gate, .full-page, #hub-accueil').forEach(e => e.style.display = 'none');
    document.getElementById(id).style.display = (id === 'hub-accueil' || id === 'page-admin') ? 'block' : 'flex';
}

async function launchApp() {
    document.getElementById('display-device-id').innerText = getDeviceId();
    const active = localStorage.getItem('v32_active') === 'true';
    if (!active) naviguer('license-gate');
    else naviguer('hub-accueil');
}

window.onload = launchApp;
