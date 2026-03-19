// --- CONFIGURATION FIREBASE ---
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
        localStorage.setItem('diouf_device_id', id);
    }
    return id;
}

// --- DÉTECTEUR APPUI LONG (3s) ---
let adminTimer;
const trigger = document.getElementById('admin-trigger');

const startT = () => adminTimer = setTimeout(() => {
    const p = prompt("🔑 CODE ACCÈS :");
    if(p === ADMIN_PASS) naviguer('page-admin');
}, 3000);

const stopT = () => clearTimeout(adminTimer);

if(trigger) {
    trigger.addEventListener('touchstart', startT);
    trigger.addEventListener('touchend', stopT);
    trigger.addEventListener('mousedown', startT);
    trigger.addEventListener('mouseup', stopT);
}

// --- LOGIQUE SÉCURITÉ & ACTIVATION ---
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
    } else {
        alert("❌ PIN INCORRECT");
    }
}

async function enregistrerProfil() {
    const nom = document.getElementById('reg-nom').value.trim();
    const tel = document.getElementById('reg-tel').value.trim().replace(/\D/g,'');
    if(!nom || tel.length < 8) return alert("Infos invalides");

    try {
        await database.ref('clients/' + tel + '/infos_client').set({
            nom: nom, tel: tel, date_inscription: new Date().toISOString(),
            device_source: getDeviceId()
        });
        localStorage.setItem('user_tel_id', tel);
        localStorage.setItem('v32_registered', 'true');
        launchApp();
    } catch(e) { alert("Erreur Cloud"); }
}

// --- FONCTION DÉCONNEXION ---
function deconnecterApp() {
    if(confirm("Voulez-vous déconnecter l'application ?")) {
        localStorage.removeItem('v32_active');
        localStorage.removeItem('v32_registered');
        location.reload();
    }
}

// --- NAVIGATION ---
function naviguer(id) {
    document.querySelectorAll('.gate, .full-page, #hub-accueil').forEach(e => e.style.display = 'none');
    const target = document.getElementById(id);
    if(target) target.style.display = (id === 'hub-accueil' || id === 'page-admin') ? 'block' : 'flex';
}

function launchApp() {
    const devId = document.getElementById('display-device-id');
    if(devId) devId.innerText = getDeviceId();

    const isActive = localStorage.getItem('v32_active') === 'true';
    const isReg = localStorage.getItem('v32_registered') === 'true';

    if (!isActive) naviguer('license-gate');
    else if (!isReg) naviguer('registration-gate');
    else naviguer('hub-accueil');
}

window.onload = launchApp;
