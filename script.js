// ==========================================
// 1. CONFIGURATION DU CLOUD (FIREBASE)
// ==========================================
const firebaseConfig = { 
    databaseURL: "https://gestion-boutiques-diouf-default-rtdb.firebaseio.com" 
};

// Initialisation de Firebase
if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

// Constantes de sécurité
const SECRET_KEY = 7391; // Votre clé pour l'algorithme PIN
const ADMIN_PASS = "0000"; // Code pour ouvrir le menu caché

// ==========================================
// 2. GESTION DE L'IDENTIFIANT APPAREIL
// ==========================================
function getDeviceId() {
    let id = localStorage.getItem('diouf_device_id');
    if(!id) {
        // Génère un ID unique type D-XXXXXX si c'est la première visite
        id = "D-" + Math.random().toString(36).substr(2, 6).toUpperCase();
        localStorage.setItem('diouf_device_id', id);
    }
    return id;
}

// L'ID actuel est soit le téléphone enregistré, soit l'ID appareil
let currentId = localStorage.getItem('user_tel_id') || getDeviceId();

// ==========================================
// 3. DÉTECTEUR DU MENU CACHÉ (ADMIN)
// ==========================================
let adminTimer;
const trigger = document.getElementById('admin-trigger');

// Fonction pour démarrer le compte à rebours de 3 secondes
const startAdminTimer = () => {
    adminTimer = setTimeout(() => {
        const p = prompt("🔑 ACCÈS ADMIN : ENTRER LE CODE");
        if(p === ADMIN_PASS) { 
            naviguer('page-admin'); 
            loadUsers(); // Charge la liste des élèves
        } else if (p !== null) {
            alert("Code incorrect.");
        }
    }, 3000); 
};

// Arrêter le timer si on relâche le clic/doigt avant 3s
const stopAdminTimer = () => clearTimeout(adminTimer);

// Événements pour Mobile et PC
if(trigger) {
    trigger.addEventListener('touchstart', startAdminTimer);
    trigger.addEventListener('touchend', stopAdminTimer);
    trigger.addEventListener('mousedown', startAdminTimer);
    trigger.addEventListener('mouseup', stopAdminTimer);
}

// ==========================================
// 4. LOGIQUE DE VÉRIFICATION DU PIN
// ==========================================
function verifierLicence() {
    const input = document.getElementById('input-license').value.trim();
    const device = getDeviceId();
    
    // Algorithme de génération du code basé sur l'ID appareil
    let hash = 0;
    for (let i = 0; i < device.length; i++) {
        hash = ((hash << 5) - hash) + device.charCodeAt(i);
        hash |= 0;
    }
    const codeAttendu = Math.abs(hash + SECRET_KEY).toString().substring(0, 8);
    
    if(input === codeAttendu) {
        localStorage.setItem('v32_active', 'true');
        launchApp(); // Passe à l'étape suivante
    } else { 
        alert("❌ PIN INVALIDE. Contactez l'administrateur."); 
    }
}

// ==========================================
// 5. INSCRIPTION DES ÉLÈVES (CLOUD)
// ==========================================
async function enregistrerProfil() {
    const nom = document.getElementById('reg-nom').value.trim();
    const tel = document.getElementById('reg-tel').value.trim().replace(/\D/g,'');
    
    if(!nom || tel.length < 8) {
        return alert("Veuillez remplir correctement les champs.");
    }

    try {
        // Enregistre l'élève dans la base de données
        await database.ref('clients/' + tel + '/infos_client').set({
            nom: nom,
            tel: tel,
            date_inscription: new Date().toISOString(),
            device_source: getDeviceId(),
            status: "actif"
        });

        localStorage.setItem('user_tel_id', tel);
        localStorage.setItem('v32_registered', 'true');
        currentId = tel;
        launchApp();
    } catch(e) { 
        alert("Erreur réseau. Vérifiez votre connexion."); 
    }
}

// ==========================================
// 6. FONCTIONS DU TABLEAU DE BORD ADMIN
// ==========================================
async function loadUsers() {
    const list = document.getElementById('admin-user-list');
    list.innerHTML = "<p style='text-align:center'>Chargement des élèves...</p>";
    
    try {
        const snap = await database.ref('clients').once('value');
        list.innerHTML = "";
        let count = 0;

        snap.forEach(user => {
            const data = user.val().infos_client;
            if(data) {
                count++;
                const dateInsc = new Date(data.date_inscription);
                const jours = Math.floor((new Date() - dateInsc) / (1000 * 60 * 60 * 24));
                
                list.innerHTML += `
                <div class="user-row" style="display:flex; justify-content:space-between; align-items:center;">
                    <div>
                        <b style="color:var(--gold)">${data.nom}</b><br>
                        <small>${user.key} • Inscrit depuis ${jours}j</small>
                    </div>
                    <button onclick="validerPaiement('${user.key}')" 
                            style="background:#22c55e; border:none; color:white; padding:8px 15px; border-radius:20px; font-weight:bold;">
                        💰 PAYÉ
                    </button>
                </div>`;
            }
        });
        document.getElementById('dash-total').innerText = count;
    } catch(e) { console.error("Erreur de chargement", e); }
}

async function validerPaiement(id) {
    if(confirm("Confirmer le paiement ? Le compteur de jours sera remis à 0.")) {
        await database.ref('clients/' + id + '/infos_client').update({
            date_inscription: new Date().toISOString()
        });
        loadUsers(); // Rafraîchir la liste
    }
}

// ==========================================
// 7. SYSTÈME DE NAVIGATION
// ==========================================
function naviguer(id) {
    // Cache tous les écrans
    document.querySelectorAll('.gate, .full-page, #hub-accueil').forEach(e => e.style.display = 'none');
    
    // Affiche l'écran demandé
    const target = document.getElementById(id);
    if(target) {
        if(id === 'hub-accueil' || id === 'page-admin') {
            target.style.display = 'block';
        } else {
            target.style.display = 'flex';
        }
    }
}

// Vérifie l'état de l'utilisateur au démarrage
async function launchApp() {
    // Met à jour l'affichage de l'ID appareil
    const deviceDisplay = document.getElementById('display-device-id');
    if(deviceDisplay) deviceDisplay.innerText = getDeviceId();

    const isActive = localStorage.getItem('v32_active') === 'true';
    const isRegistered = localStorage.getItem('v32_registered') === 'true';

    if (!isActive) {
        naviguer('license-gate'); // Doit d'abord activer
    } else if (!isRegistered) {
        naviguer('registration-gate'); // Puis s'inscrire
    } else {
        naviguer('hub-accueil'); // Enfin accéder à l'app
    }
}

// Lancer l'application dès que la page est prête
window.onload = launchApp;
