// CONFIGURATION DE DÉPART
const firebaseConfig = {
    databaseURL: "https://maths5eme-v1-default-rtdb.firebaseio.com/"
};

// INITIALISATION SÉCURISÉE
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// --- LA FONCTION DE SURVEILLANCE (MISE À JOUR) ---
function surveillerConnexion() {
    // On récupère les éléments par ID et Classe
    const ledContainer = document.getElementById('cloud-status');
    
    // On vérifie la connexion réelle
    database.ref(".info/connected").on("value", (snap) => {
        if (snap.val() === true) {
            console.log("!!! CONNECTÉ !!!");
            // ON FORCE LE STYLE EN JAVASCRIPT DIRECT (PASSE PAR-DESSUS LE CSS)
            ledContainer.style.border = "1px solid #10b981";
            ledContainer.style.background = "rgba(16, 185, 129, 0.2)";
            
            const cercle = ledContainer.querySelector('.led-circle');
            const texte = ledContainer.querySelector('.led-text');
            
            if(cercle) {
                cercle.style.backgroundColor = "#10b981";
                cercle.style.boxShadow = "0 0 15px #10b981";
            }
            if(texte) {
                texte.style.color = "#10b981";
                texte.innerText = "ONLINE";
            }
        } else {
            console.log("... RECHERCHE ...");
            // REVIENT AU GRIS SI COUPÉ
            ledContainer.style.border = "1px solid rgba(255,255,255,0.1)";
            ledContainer.style.background = "rgba(0,0,0,0.6)";
        }
    });
}

// LANCEMENT AUTOMATIQUE
window.addEventListener('DOMContentLoaded', surveillerConnexion);

const SECRET_KEY = 7391;
const ADMIN_PASS = "0000";

// ==========================================
// 2. IDENTIFIANT APPAREIL UNIQUE
// ==========================================
function getDeviceId() {
    let id = localStorage.getItem('diouf_device_id');
    if(!id) {
        id = "D-" + Math.random().toString(36).substr(2, 6).toUpperCase();
        localStorage.setItem('diouf_device_id', id);
    }
    return id;
}

// ==========================================
// 3. MENU CACHÉ (APPUI LONG 3S SUR LE TITRE)
// ==========================================
let adminTimer;
const trigger = document.getElementById('admin-trigger');

const startAdminTimer = () => {
    adminTimer = setTimeout(() => {
        const p = prompt("🔑 CODE ADMIN :");
        if(p === ADMIN_PASS) naviguer('page-admin');
    }, 3000); 
};

const stopAdminTimer = () => clearTimeout(adminTimer);

if(trigger) {
    trigger.addEventListener('touchstart', startAdminTimer);
    trigger.addEventListener('touchend', stopAdminTimer);
    trigger.addEventListener('mousedown', startAdminTimer);
    trigger.addEventListener('mouseup', stopAdminTimer);
}

// ==========================================
// 4. LOGIQUE D'ACTIVATION (PIN)
// ==========================================
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

// ==========================================
// 5. INSCRIPTION (PROFIL ÉLÈVE)
// ==========================================
async function enregistrerProfil() {
    const nom = document.getElementById('reg-nom').value.trim();
    const tel = document.getElementById('reg-tel').value.trim().replace(/\D/g,'');
    
    if(!nom || tel.length < 8) return alert("Veuillez remplir tous les champs.");

    try {
        // Enregistrement sur votre nouvelle base maths5eme-v1
        await database.ref('clients/' + tel + '/infos_client').set({
            nom: nom,
            tel: tel,
            date_inscription: new Date().toISOString(),
            device_source: getDeviceId()
        });
        localStorage.setItem('user_tel_id', tel);
        localStorage.setItem('v32_registered', 'true');
        launchApp();
    } catch(e) { 
        alert("Erreur de connexion à la base de données."); 
    }
}

// ==========================================
// 6. VERROUILLAGE (DÉCONNEXION)
// ==========================================
function deconnecterApp() {
    if(confirm("Voulez-vous verrouiller l'accès ?")) {
        // On retire l'activation PIN mais on garde le profil en mémoire
        localStorage.removeItem('v32_active');
        location.reload();
    }
}

// ==========================================
// 7. NAVIGATION ET ÉTATS
// ==========================================
function naviguer(id) {
    document.querySelectorAll('.gate, .full-page, #hub-accueil').forEach(e => e.style.display = 'none');
    const target = document.getElementById(id);
    if(target) {
        target.style.display = (id === 'hub-accueil' || id === 'page-admin') ? 'block' : 'flex';
    }
}

function launchApp() {
    const devIdDisplay = document.getElementById('display-device-id');
    if(devIdDisplay) devIdDisplay.innerText = getDeviceId();

    const isActive = localStorage.getItem('v32_active') === 'true';
    const isReg = localStorage.getItem('v32_registered') === 'true';

    if (!isActive) {
        naviguer('license-gate');
    } else if (!isReg) {
        naviguer('registration-gate');
    } else {
        naviguer('hub-accueil');
    }
}
function togglePreview() {
    const content = document.getElementById('preview-content');
    content.style.display = (content.style.display === "block") ? "none" : "block";
}

// ==========================================
// 8. INITIALISATION ET SURVEILLANCE
// ==========================================

// ON UTILISE UNE SEULE FONCTION DE DÉMARRAGE
window.addEventListener('load', () => {
    console.log("🚀 Application lancée...");
    
    // 1. Lancer la surveillance Cloud
    surveillerConnexion();
    
    // 2. Gérer l'affichage de l'ID appareil
    const devIdDisplay = document.getElementById('display-device-id');
    if(devIdDisplay) devIdDisplay.innerText = getDeviceId();

    // 3. Lancer la logique de navigation (LaunchApp)
    launchApp();
});


