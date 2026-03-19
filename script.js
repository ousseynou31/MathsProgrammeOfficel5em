// --- 1. CONFIGURATION FIREBASE ---
const firebaseConfig = { 
    databaseURL: "https://gestion-boutiques-diouf-default-rtdb.firebaseio.com" 
};
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();

const SECRET_KEY = 7391;
const ADMIN_PASS = "0000";

// --- 2. GESTION DE L'IDENTIFIANT UNIQUE (ID) ---
function getDeviceId() {
    let id = localStorage.getItem('diouf_device_id');
    if(!id) {
        // Génère un ID unique type D-XXXXXX
        id = "D-" + Math.random().toString(36).substr(2, 6).toUpperCase();
        localStorage.setItem('diouf_device_id', id);
    }
    return id;
}

// Récupère soit le téléphone (si inscrit) soit l'ID appareil
let currentId = localStorage.getItem('user_tel_id') || getDeviceId();

// --- 3. DÉTECTEUR ADMIN (Appui long 3s sur le titre centré) ---
let adminTimer;
const trigger = document.getElementById('admin-trigger');

const startAdminTimer = () => {
    adminTimer = setTimeout(() => {
        const p = prompt("🔑 CODE D'ACCÈS ADMINISTRATEUR :");
        if(p === ADMIN_PASS) { 
            naviguer('page-admin'); 
            loadUsers(); 
        } else if (p !== null) {
            alert("Accès refusé.");
        }
    }, 3000); // 3 secondes pile
};

const stopAdminTimer = () => clearTimeout(adminTimer);

// Événements tactiles (Mobile) et Souris (PC)
if(trigger) {
    trigger.addEventListener('touchstart', startAdminTimer);
    trigger.addEventListener('touchend', stopAdminTimer);
    trigger.addEventListener('mousedown', startAdminTimer);
    trigger.addEventListener('mouseup', stopAdminTimer);
}

// --- 4. SÉCURITÉ : VÉRIFICATION DU PIN ---
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
        alert("❌ CODE PIN INCORRECT. Veuillez contacter l'administrateur."); 
    }
}

// --- 5. INSCRIPTION CLOUD ---
async function enregistrerProfil() {
    const nom = document.getElementById('reg-nom').value.trim();
    const tel = document.getElementById('reg-tel').value.trim().replace(/\D/g,'');
    
    if(!nom || tel.length < 8) return alert("Veuillez entrer un nom et un numéro valide.");

    try {
        await database.ref('clients/' + tel + '/infos_client').set({
            nom: nom,
            tel: tel,
            date_inscription: new Date().toISOString(),
            device_source: getDeviceId(),
            categorie: 'C' // Par défaut
        });
        localStorage.setItem('user_tel_id', tel);
        localStorage.setItem('v32_registered', 'true');
        currentId = tel;
        launchApp();
    } catch(e) { 
        alert("⚠️ Erreur de connexion au Cloud."); 
    }
}

// --- 6. GESTIONNAIRE ADMIN (CHARGEMENT ÉLÈVES) ---
async function loadUsers() {
    const list = document.getElementById('admin-user-list');
    list.innerHTML = "<p style='text-align:center'>Synchronisation...</p>";
    
    try {
        const snap = await database.ref('clients').once('value');
        list.innerHTML = "";
        let count = 0;

        snap.forEach(u => {
            const data = u.val().infos_client;
            if(data) {
                count++;
                const debut = new Date(data.date_inscription);
                const jours = Math.floor((new Date() - debut) / (1000 * 60 * 60 * 24));
                
                list.innerHTML += `
                <div class="user-row">
                    <div style="flex:1">
                        <b style="color:var(--gold)">${data.nom}</b><br>
                        <small style="color:#64748b">${u.key} • Inscrit il y a ${jours}j</small>
                    </div>
                    <button onclick="validerPaiement('${u.key}')" 
                            style="background:var(--accent); border:none; color:white; padding:10px; border-radius:12px; cursor:pointer;">
                        💰 PAYÉ
                    </button>
                </div>`;
            }
        });
    } catch(e) { console.error(e); }
}

async function validerPaiement(id) {
    if(confirm("Confirmer la réception du paiement ? (Le compteur sera remis à zéro)")) {
        await database.ref('clients/' + id + '/infos_client').update({
            date_inscription: new Date().toISOString()
        });
        loadUsers();
    }
}

// --- 7. NAVIGATION ET LANCEMENT ---
function naviguer(id) {
    document.querySelectorAll('.gate, .full-page, #hub-accueil').forEach(e => e.style.display = 'none');
    const target = document.getElementById(id);
    if(target) {
        target.style.display = (id === 'hub-accueil' || id === 'page-admin') ? 'block' : 'flex';
    }
}

async function launchApp() {
    // Affiche l'ID sur l'écran d'accueil pour l'utilisateur
    document.getElementById('display-device-id').innerText = getDeviceId();

    const isActive = localStorage.getItem('v32_active') === 'true';
    const isRegistered = localStorage.getItem('v32_registered') === 'true';

    if (!isActive) {
        naviguer('license-gate');
    } else if (!isRegistered) {
        naviguer('registration-gate');
    } else {
        naviguer('hub-accueil');
    }
}

// Lancement au chargement de la page
window.onload = launchApp;
