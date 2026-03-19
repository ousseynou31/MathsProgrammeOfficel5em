// --- 1. CONFIGURATION & CONNEXION V1 ---
const firebaseConfig = { 
    // Assurez-vous que cette URL correspond à votre nouveau projet Firebase
    databaseURL: "https://diouf-education-v1-default-rtdb.firebaseio.com" 
};

if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const SECRET_KEY = 7391; // Clé pour générer le PIN
const ADMIN_PASS = "0000"; // Mot de passe pour l'appui long

// --- 2. GESTION ID UNIQUE V1 ---
function getDeviceId() {
    let id = localStorage.getItem('edu_v1_device_id');
    if(!id) {
        // Génère un ID unique type EDU-V1-XXXXXX
        id = "EDU-V1-" + Math.random().toString(36).substr(2, 6).toUpperCase();
        try { localStorage.setItem('edu_v1_device_id', id); } catch(e) {}
    }
    return id;
}
let currentId = localStorage.getItem('user_tel_id') || getDeviceId();

// --- 3. VOYANT DE SYNCHRONISATION ---
database.ref(".info/connected").on("value", (snap) => {
    const dot = document.getElementById('cloud-dot');
    const text = document.getElementById('cloud-text');
    if (dot && text) {
        dot.style.background = snap.val() ? "#10b981" : "#ef4444";
        text.innerText = snap.val() ? "V1 CONNECTÉE" : "HORS-LIGNE";
    }
});

// --- 4. LANCEMENT SÉCURISÉ V1 ---
async function launchApp() {
    const deviceId = getDeviceId();
    if(document.getElementById('display-device-id')) {
        document.getElementById('display-device-id').innerText = deviceId;
    }

    // Masquage de tous les écrans pour vérification
    const screens = ['license-gate', 'registration-gate', 'hub-accueil', 'page-admin', 'banned-screen'];
    screens.forEach(s => { if(document.getElementById(s)) document.getElementById(s).style.display = 'none'; });

    // Vérification si l'élève est banni
    const isBanned = await checkBanStatus();
    if (isBanned) return;

    // Récupération des accès V1 en mémoire locale
    const active = localStorage.getItem('edu_v1_active') === 'true';
    const registered = localStorage.getItem('edu_v1_registered') === 'true';

    if (!active) {
        document.getElementById('license-gate').style.display = 'flex';
    } else if (!registered) {
        document.getElementById('registration-gate').style.display = 'flex';
    } else {
        document.getElementById('hub-accueil').style.display = 'block';
    }
}

// --- 5. VALIDATION LICENCE & PROFIL ---
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
    } else { alert("❌ CODE PIN V1 INCORRECT"); }
}

async function enregistrerProfil() {
    const nom = document.getElementById('reg-nom').value.trim();
    const tel = document.getElementById('reg-tel').value.trim();
    if(!nom || !tel) return alert("Veuillez remplir le nom et le téléphone.");
    
    const cleanTel = tel.replace(/\D/g,''); 
    
    try {
        // Enregistrement dans le dossier racine V1
        await database.ref('v1/apprenants/' + cleanTel).set({
            nom: nom, 
            tel: cleanTel, 
            date_inscription: new Date().toISOString(),
            device_id: getDeviceId(),
            statut: 'ACTIF'
        });
        
        localStorage.setItem('user_tel_id', cleanTel);
        localStorage.setItem('edu_v1_registered', 'true');
        currentId = cleanTel;
        alert("📚 Inscription V1 réussie !");
        launchApp();
    } catch(e) { alert("⚠️ Erreur de connexion au serveur éducatif."); }
}

// --- 6. ADMINISTRATION (APPUI LONG 3S) ---
function openAdmin() {
    const code = prompt("🔑 ADMINISTRATION V1 - CODE PIN :");
    if(code === ADMIN_PASS) {
        document.getElementById('hub-accueil').style.display = 'none';
        document.getElementById('page-admin').style.display = 'block';
        loadUsers();
    } else if (code !== null) {
        alert("❌ ACCÈS REFUSÉ");
    }
}

async function loadUsers() {
    const list = document.getElementById('admin-user-list');
    list.innerHTML = "<p style='text-align:center;'>Chargement des élèves...</p>";
    
    try {
        const snap = await database.ref('v1/apprenants').once('value');
        list.innerHTML = "";
        let count = 0;

        snap.forEach(u => {
            const data = u.val();
            count++;
            list.innerHTML += `
                <div class="user-row" style="border-bottom: 1px solid #222; padding: 10px; display:flex; justify-content:space-between; align-items:center;">
                    <div><b>${data.nom}</b><br><small>${u.key}</small></div>
                    <button onclick="banUser('${u.key}')" style="background:red; color:white; border:none; padding:5px 10px; border-radius:4px;">BLOQUER</button>
                </div>`;
        });
        
        // Mise à jour du petit compteur dans le dashboard
        if(document.getElementById('dash-total-a')) {
            document.getElementById('dash-total-a').innerText = count;
        }
    } catch(e) { console.error(e); }
}

// --- 7. SÉCURITÉ & TEST ---
async function checkBanStatus() {
    const snap = await database.ref('v1/blacklist/' + currentId).once('value');
    if (snap.exists() && snap.val() === true) {
        document.getElementById('banned-screen').style.display = 'flex';
        return true;
    }
    return false;
}

function testerDeconnexion() {
    if (confirm("Réinitialiser l'application V1 pour test ?")) {
        localStorage.removeItem('edu_v1_active');
        localStorage.removeItem('edu_v1_registered');
        location.reload(); 
    }
}

// --- 8. INITIALISATION FINALE ---
window.onload = launchApp;

const adminTrigger = document.getElementById('admin-trigger');
if(adminTrigger) {
    let timer;
    // Mobile
    adminTrigger.addEventListener('touchstart', () => timer = setTimeout(openAdmin, 3000));
    adminTrigger.addEventListener('touchend', () => clearTimeout(timer));
    // Ordinateur
    adminTrigger.addEventListener('mousedown', () => timer = setTimeout(openAdmin, 3000));
    adminTrigger.addEventListener('mouseup', () => clearTimeout(timer));
}
