// CONFIGURATION AVEC LA BONNE RÉGION (EUROPE)
const firebaseConfig = {
    databaseURL: "https://maths5eme-v1-default-rtdb.europe-west1.firebasedatabase.app"
};

// INITIALISATION
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

// FORCE L'APPARITION DANS LA BASE DE DONNÉES
function signalerPresence() {
    const device = getDeviceId();
    database.ref('appareils_en_ligne/' + device).set({
        dernier_acces: new Date().toISOString(),
        statut: "Connecté"
    });
    // Supprimer l'entrée quand l'utilisateur ferme l'application
    database.ref('appareils_en_ligne/' + device).onDisconnect().remove();
}

// Appelle cette fonction dans ton window.onload ou addEventListener
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
    if(id === 'page-admin') {
    chargerTarifs();
    mettreAJourDashboard();
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


// --- FONCTION POUR APPARAÎTRE DANS L'ONGLET DATA ---
function marquerPresence() {
    const idAppareil = getDeviceId(); // Récupère votre D-XXXXXX
    
    // On crée une référence dans la base
    const presenceRef = database.ref('appareils_actifs/' + idAppareil);

    // On écrit les infos
    presenceRef.set({
        statut: "EN LIGNE",
        derniere_connexion: new Date().toLocaleString(),
        plateforme: navigator.platform
    });

    // TRÈS IMPORTANT : Supprime la ligne automatiquement quand vous fermez l'app
    presenceRef.onDisconnect().remove();
}

// --- 1.2 GESTION DES TARIFS DANS LE LOCALSTORAGE ---
function sauvegarderTarifs() {
    const tarifs = {
        A: document.getElementById('tarif-a').value || 0,
        B: document.getElementById('tarif-b').value || 0,
        C: document.getElementById('tarif-c').value || 0
    };
    localStorage.setItem('tarifs_app', JSON.stringify(tarifs));
    mettreAJourDashboard(); // Recalcule tout immédiatement
}

function chargerTarifs() {
    const saved = JSON.parse(localStorage.getItem('tarifs_app'));
    if(saved) {
        document.getElementById('tarif-a').value = saved.A;
        document.getElementById('tarif-b').value = saved.B;
        document.getElementById('tarif-c').value = saved.C;
    }
}

// --- 1.1 LE DASHBOARD DYNAMIQUE ---
async function mettreAJourDashboard() {
    const snapshot = await database.ref('clients').once('value');
    const clients = snapshot.val() || {};
    const tarifs = JSON.parse(localStorage.getItem('tarifs_app')) || {A:0, B:0, C:0};

    let attendu = 0;
    let encaisse = 0;
    const bodyAudit = document.getElementById('body-audit');
    bodyAudit.innerHTML = ""; // On vide pour reconstruire

    Object.values(clients).forEach(client => {
        const info = client.infos_client;
        const paiement = client.paiement || { montant: 0, date: "" };

        // Calcul de l'attendu selon la catégorie (A, B ou C)
        const tarifApplique = tarifs[info.categorie] || 0;
        attendu += parseInt(tarifApplique);
        
        // Calcul de l'encaissé réel
        encaisse += parseInt(paiement.montant || 0);

        // --- 3.1 FORMATAGE DATE POUR AUDIT ---
        const dateHumaine = paiement.date ? new Date(paiement.date).toLocaleDateString('fr-FR') : "---";

        // Ajout à la table d'audit
        bodyAudit.innerHTML += `
            <tr>
                <td>${dateHumaine}</td>
                <td>${info.nom}</td>
                <td>Cat. ${info.categorie || 'N/A'}</td>
                <td>${paiement.montant || 0} F</td>
            </tr>
        `;
    });

    // Mise à jour des cartes
    document.getElementById('total-attendu').innerText = attendu + " F";
    document.getElementById('total-encaisse').innerText = encaisse + " F";
    document.getElementById('reste-percevoir').innerText = (attendu - encaisse) + " F";
}

// --- 3.2 FILTRE DE RECHERCHE RAPIDE ---
function filtrerAudit() {
    const input = document.getElementById('admin-search').value.toUpperCase();
    const rows = document.getElementById('table-audit').getElementsByTagName('tr');

    for (let i = 1; i < rows.length; i++) {
        const text = rows[i].innerText.toUpperCase();
        rows[i].style.display = text.includes(input) ? "" : "none";
    }
}
// ==========================================
// 8. DÉMARRAGE GLOBAL (L'UNIQUE BLOC DE SORTIE)
// ==========================================
window.addEventListener('load', () => {
    console.log("🚀 Lancement du système...");

    // 1. Allume la LED (Vérification de la connexion)
    surveillerConnexion(); 
    
    // 2. Enregistre l'appareil dans l'onglet "Data" de Firebase
    marquerPresence();    
    
    // 3. Affiche l'ID de l'appareil dans le HTML
    const devIdDisplay = document.getElementById('display-device-id');
    if(devIdDisplay) devIdDisplay.innerText = getDeviceId();

    // 4. Décide quelle page afficher (Activation ou Accueil)
    launchApp();          
    
    console.log("✅ Initialisation terminée.");
});

