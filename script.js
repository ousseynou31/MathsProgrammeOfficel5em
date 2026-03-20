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
async function loadUsers(filtre = 'TOUT') {
    const list = document.getElementById('admin-user-list');
    list.innerHTML = `
        <div style="text-align:center; padding:30px;">
            <div class="spinner" style="border: 4px solid rgba(255,255,255,0.1); border-top: 4px solid var(--p); border-radius: 50%; width: 30px; height: 30px; animation: spin 1s linear infinite; margin: auto;"></div>
            <p style="color:gray; margin-top:10px; font-size:0.8rem;">Synchronisation Cloud...</p>
        </div>`;
    
    try {
        const usersSnap = await database.ref('clients').once('value');
        const blackSnap = await database.ref('blacklist').once('value');
        const blacklisted = blackSnap.val() || {};
        
        list.innerHTML = ""; 
        let count = 0;

        usersSnap.forEach(u => {
            const data = u.val().infos_client;
            if(!data) return;

            // Système de filtre par catégorie (A, B, C)
            if (filtre !== 'TOUT' && data.categorie !== filtre) return;
            count++;
            // Exemple de ce qui doit être généré pour chaque client
const userCard = `
<div class="user-card" style="display:flex; align-items:center; justify-content:space-between; background:#1a1a1a; margin-bottom:10px; padding:12px; border-radius:10px; border:1px solid #333;">
    
    <div class="user-info">
        <h4 style="margin:0; color:white; font-size:0.9rem;">${user.nom}</h4>
        <p style="margin:0; color:gray; font-size:0.75rem;">${user.tel}</p>
    </div>

    <div class="user-category-select">
        <select onchange="changerCategorie('${user.id}', this.value)" style="background:#000; color:var(--p); border:1px solid var(--p); padding:5px; border-radius:5px; font-size:0.8rem; font-weight:bold; cursor:pointer;">
            <option value="A" ${user.categorie === 'A' ? 'selected' : ''}>CAT A</option>
            <option value="B" ${user.categorie === 'B' ? 'selected' : ''}>CAT B</option>
            <option value="C" ${user.categorie === 'C' ? 'selected' : ''}>CAT C</option>
        </select>
    </div>

</div>
`;

            const jours = calculerJours(data.date_inscription);
            const isBanned = blacklisted[u.key] === true;
            
            // Formatage de la date d'inscription
            const dateObj = new Date(data.date_inscription);
            const dateAffiche = isNaN(dateObj.getTime()) ? "Date inconnue" : dateObj.toLocaleDateString('fr-FR');

            // --- LOGIQUE DYNAMIQUE DES COULEURS ---
            let colorClass = "c-green";  // 0-25 jours
            if (jours >= 26 && jours <= 34) colorClass = "c-orange"; // 26-34 jours
            if (jours >= 35) colorClass = "c-red"; // 35+ jours (Expiré)

            list.innerHTML += `
                <div class="user-card" style="display:flex; align-items:center; background:#181818; margin:10px 5px; padding:15px; border-radius:12px; border-left: 4px solid ${isBanned ? '#ff4444' : '#222'}; box-shadow: 0 4px 6px rgba(0,0,0,0.2);">
                    
                    <div class="stat-circle ${colorClass}" style="width:52px; height:52px; border-radius:50%; display:flex; flex-direction:column; align-items:center; justify-content:center; flex-shrink:0;">
                        <span style="font-size:1.1rem; font-weight:900; color:white; line-height:1;">${jours}</span>
                        <span style="font-size:0.5rem; color:rgba(255,255,255,0.7); text-transform:uppercase; font-weight:bold;">JOURS</span>
                    </div>

                    <div style="flex:1; margin-left:12px; min-width:0;">
                        <div style="font-weight:700; font-size:0.95rem; color:#fff; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                            ${data.nom}
                        </div>
                        <div style="font-size:0.7rem; color:#777; margin-top:2px;">
                            Inscrit le : <span style="color:#bbb;">${dateAffiche}</span>
                        </div>
                        <div style="display:flex; gap:5px; margin-top:4px;">
                            <span style="font-size:0.6rem; background:#333; color:var(--p); padding:2px 5px; border-radius:4px; font-weight:bold;">CAT ${data.categorie}</span>
                            <span style="font-size:0.6rem; color:#555;">ID: ${u.key.slice(-6)}</span>
                        </div>
                    </div>

                    <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px; margin-left:8px;">
                        <button onclick="validerPaiement('${u.key}')" style="background:#10b981; border:none; border-radius:6px; padding:8px; color:white; cursor:pointer;" title="Payer">💰</button>
                        <button onclick="envoyerRappel('${u.key}', '${data.nom}', '${data.categorie}')" style="background:#25D366; border:none; border-radius:6px; padding:8px; color:white; cursor:pointer;" title="WhatsApp">💬</button>
                        <button onclick="toggleBan('${u.key}')" style="background:${isBanned ? '#6366f1' : '#f59e0b'}; border:none; border-radius:6px; padding:8px; color:white; cursor:pointer;" title="Suspendre">
                            ${isBanned ? '🔓' : '🚫'}
                        </button>
                        <button onclick="deleteClient('${u.key}')" style="background:rgba(239,68,68,0.1); border:1px solid #ef4444; border-radius:6px; padding:8px; color:#ef4444; cursor:pointer;" title="Supprimer">🗑️</button>
                    </div>
                </div>
            `;
        });

        if(count === 0) list.innerHTML = "<p style='text-align:center; color:gray; padding:20px;'>Aucun abonné dans cette catégorie.</p>";

    } catch(e) {
        console.error(e);
        list.innerHTML = "<p style='color:#ef4444; text-align:center;'>Erreur Cloud.</p>";
    }
}
function calculerJours(dateInscription) {
    if(!dateInscription) return 0;
    const debut = new Date(dateInscription);
    const fin = new Date();
    
    // On remet les compteurs à zéro (minuit) pour ne comparer que les jours
    debut.setHours(0, 0, 0, 0);
    fin.setHours(0, 0, 0, 0);
    
    const diffTemps = Math.abs(fin - debut);
    return Math.ceil(diffTemps / (1000 * 60 * 60 * 24)); 
}
// Sauvegarder les prix dans Firebase
async function sauvegarderTarifs() {
    const tarifs = {
        A: document.getElementById('price-A').value || 0,
        B: document.getElementById('price-B').value || 0,
        C: document.getElementById('price-C').value || 0
    };
    await database.ref('reglages/tarifs').set(tarifs);
    alert("✅ Tarifs mis à jour !");
    mettreAJourDashboard(); // Rafraîchir les calculs
}

// Charger les prix au démarrage de l'admin
async function chargerTarifs() {
    const snap = await database.ref('reglages/tarifs').once('value');
    if(snap.exists()){
        const t = snap.val();
        document.getElementById('price-A').value = t.A;
        document.getElementById('price-B').value = t.B;
        document.getElementById('price-C').value = t.C;
    }
}

async function mettreAJourDashboard() {
    const usersSnap = await database.ref('clients').once('value');
    const tarifsSnap = await database.ref('reglages/tarifs').once('value');
    const tarifs = tarifsSnap.val() || {A:0, B:0, C:0};

    let totalAttendu = 0;
    let nbRetards = 0;

    usersSnap.forEach(u => {
        const data = u.val().infos_client;
        if(data) {
            const jours = calculerJours(data.date_inscription);
            const prix = parseInt(tarifs[data.categorie]) || 0;
            
            totalAttendu += prix;
            if(jours >= 35) nbRetards++;
        }
    });

    // Mise à jour visuelle des chiffres en haut
    document.getElementById('dash-total-a').innerText = totalAttendu.toLocaleString() + " F";
    document.getElementById('dash-retard').innerText = nbRetards;
    
    // On lance aussi le chargement de la liste des abonnés
    loadUsers('TOUT');
}

// 1. PAYER : Réinitialise la date à aujourd'hui
async function validerPaiement(telId) {
    if(confirm("Confirmer le paiement et réinitialiser l'abonnement ?")) {
        const nouvelleDate = new Date().toISOString();
        await database.ref(`clients/${telId}/infos_client/date_inscription`).set(nouvelleDate);
        // Optionnel : Enregistrer dans l'historique des revenus ici
        loadUsers(); 
    }
}

// 2. WHATSAPP : Message automatique
function envoyerRappel(tel, nom, cat) {
    const msg = `Bonjour ${nom}, votre abonnement (Catégorie ${cat}) arrive à échéance. Merci de régulariser votre situation.`;
    const url = `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
}

// 3. SUSPENDRE : Utilise la liste noire (Blacklist)
async function toggleBan(telId) {
    const snap = await database.ref(`blacklist/${telId}`).once('value');
    const isCurrentlyBanned = snap.val() === true;
    
    await database.ref(`blacklist/${telId}`).set(!isCurrentlyBanned);
    loadUsers();
}

// 4. SUPPRIMER : Effacement définitif
async function deleteClient(telId) {
    if(confirm("❗ Action irréversible. Supprimer ce client de la base ?")) {
        await database.ref(`clients/${telId}`).remove();
        await database.ref(`blacklist/${telId}`).remove();
        loadUsers();
    }
}
function filtrerClients() {
    const query = document.getElementById('admin-search').value.toLowerCase();
    const cards = document.querySelectorAll('.user-card');
    
    cards.forEach(card => {
        const contenu = card.innerText.toLowerCase();
        card.style.display = contenu.includes(query) ? "flex" : "none";
    });
}
function changerCategorie(userId, nouvelleCat) {
    // 1. Mise à jour dans Firebase
    firebase.database().ref('users/' + userId).update({
        categorie: nouvelleCat
    }).then(() => {
        console.log("Catégorie mise à jour !");
        // 2. On rafraîchit les calculs pour que le Dashboard se mette à jour
        calculerGlobalStats(); 
    }).catch((error) => {
        alert("Erreur lors de la mise à jour : " + error.message);
    });
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

