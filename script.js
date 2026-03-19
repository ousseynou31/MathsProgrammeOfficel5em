// --- 1. CONFIGURATION & INITIALISATION ---
const firebaseConfig = {
    apiKey: "VOTRE_API_KEY",
    authDomain: "VOTRE_PROJET.firebaseapp.com",
    databaseURL: "https://VOTRE_PROJET.firebaseio.com",
    projectId: "VOTRE_PROJET",
    storageBucket: "VOTRE_PROJET.appspot.com",
    messagingSenderId: "ID",
    appId: "APP_ID"
};

if (!firebase.apps.length) { firebase.initializeApp(firebaseConfig); }
const db = firebase.database();

// --- 2. VARIABLES GLOBALES ---
let deviceID = localStorage.getItem('deviceId') || 'DEV-' + Math.random().toString(36).substr(2, 9);
localStorage.setItem('deviceId', deviceID);
let currentUserName = "";
let isAdmin = false;

// --- 3. SYSTÈME DE NAVIGATION ---
function naviguer(idCible) {
    document.querySelectorAll('.screen, .gate').forEach(s => s.style.display = 'none');
    const cible = document.getElementById(idCible);
    if(cible) cible.style.display = 'flex';
}

// --- 4. SÉCURITÉ & ACCÈS ---
const SECRET_KEY = 2026;
// --- CONFIGURATION ---
const SECRET_KEY = 2026; // Assurez-vous que c'est bien un NOMBRE

function verifierLicence() {
    // 1. On récupère la saisie et on nettoie les espaces
    const input = document.getElementById('input-license').value.trim();
    
    // 2. On récupère l'ID et on FORCE les minuscules + suppression espaces
    // C'est l'étape CRITIQUE pour que le calcul soit identique partout
    let device = getDeviceId().toLowerCase().replace(/\s/g, ''); 
    
    let hash = 0;
    for (let i = 0; i < device.length; i++) {
        // L'algorithme Bitwise exact
        hash = ((hash << 5) - hash) + device.charCodeAt(i);
        hash |= 0; // Force l'entier 32 bits
    }
    
    // 3. Calcul du code attendu (8 chiffres)
    const codeAttendu = Math.abs(hash + SECRET_KEY).toString().substring(0, 8);
    
    // LOG DE DÉBOGAGE (Affichez la console F12 pour voir)
    console.log("ID nettoyé utilisé : '" + device + "'");
    console.log("Code calculé par l'app : " + codeAttendu);

    if(input === codeAttendu) {
        localStorage.setItem('v32_active', 'true');
        alert("✅ ACTIVATION RÉUSSIE");
        naviguer('registration-gate'); // Ou votre fonction de suite
    } else { 
        alert("❌ CODE PIN INCORRECT\nID détecté : " + device); 
    }
}
function verifierProfilExistant() {
    db.ref('users/' + deviceID).once('value').then(snapshot => {
        if (snapshot.exists()) {
            const user = snapshot.val();
            if (user.banned) {
                document.getElementById('ban-reason').innerText = user.reason || "Accès suspendu.";
                document.getElementById('ban-id-display').innerText = deviceID;
                naviguer('banned-screen');
            } else {
                currentUserName = user.nom;
                naviguer('hub-accueil');
            }
        } else {
            naviguer('registration-gate');
        }
    });
}

// --- 5. INSCRIPTION ÉLÈVE ---
function enregistrerProfil() {
    const nom = document.getElementById('reg-nom').value;
    const tel = document.getElementById('reg-tel').value;

    if (nom.length < 3 || tel.length < 8) {
        alert("Veuillez remplir correctement les champs.");
        return;
    }

    const userData = {
        nom: nom,
        tel: tel,
        deviceId: deviceID,
        dateInscription: new Date().toISOString(),
        expiration: "active", // Ou calcul de date
        banned: false
    };

    db.ref('users/' + deviceID).set(userData).then(() => {
        currentUserName = nom;
        naviguer('hub-accueil');
    });
}

// --- 6. ADMINISTRATION & GESTION ---
let adminTimer;
const adminTrigger = document.getElementById('admin-trigger');

if(adminTrigger) {
    adminTrigger.addEventListener('touchstart', () => {
        adminTimer = setTimeout(() => {
            const pass = prompt("MOT DE PASSE MAÎTRE :");
            if(pass === "1234") {
                isAdmin = true;
                chargerDonneesAdmin();
                naviguer('page-admin');
            }
        }, 3000);
    });
    adminTrigger.addEventListener('touchend', () => clearTimeout(adminTimer));
}

function chargerDonneesAdmin() {
    // Stats rapides
    db.ref('users').on('value', snapshot => {
        const users = snapshot.val();
        let total = 0;
        let html = "";
        
        for (let id in users) {
            total++;
            const u = users[id];
            html += `
                <div class="user-item">
                    <div>
                        <b>${u.nom}</b><br>
                        <small>${u.tel}</small>
                    </div>
                    <button onclick="gererEleve('${id}')" class="btn-sm-action">GERER</button>
                </div>
            `;
        }
        document.getElementById('dash-total-a').innerText = total;
        document.getElementById('admin-user-list').innerHTML = html;
    });
}

function filtrerClients() {
    const search = document.getElementById('admin-search').value.toLowerCase();
    const items = document.querySelectorAll('.user-item');
    items.forEach(item => {
        const text = item.innerText.toLowerCase();
        item.style.display = text.includes(search) ? 'flex' : 'none';
    });
}

// --- 7. GESTION DES TARIFS ---
function sauvegarderTarifs() {
    const tarifs = {
        A: document.getElementById('price-A').value,
        B: document.getElementById('price-B').value,
        C: document.getElementById('price-C').value
    };
    
    db.ref('config/tarifs').set(tarifs).then(() => {
        alert("Tarifs synchronisés sur le Cloud !");
    });
}

// --- 8. INITIALISATION AU CHARGEMENT ---
window.onload = () => {
    document.getElementById('display-device-id').innerText = deviceID;
    
    // Vérifier connexion Cloud
    db.ref('.info/connected').on('value', snap => {
        const dot = document.getElementById('cloud-dot');
        const txt = document.getElementById('cloud-text');
        if (snap.val() === true) {
            dot.style.background = "#10b981";
            txt.innerText = "CLOUD CONNECTÉ";
        } else {
            dot.style.background = "#ef4444";
            txt.innerText = "HORS-LIGNE";
        }
    });
};
