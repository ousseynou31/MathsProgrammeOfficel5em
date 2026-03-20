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
// --- 1. CHARGEMENT DE LA LISTE ---
async function loadUsers(filtre = 'TOUT') {
    const list = document.getElementById('admin-user-list');
    list.innerHTML = `<p style="text-align:center; color:gray; padding:20px; font-size:0.7rem;">Synchronisation Cloud...</p>`;
    
    try {
        const usersSnap = await database.ref('clients').once('value');
        const blackSnap = await database.ref('blacklist').once('value');
        const blacklisted = blackSnap.val() || {};
        
        list.innerHTML = ""; 
        let count = 0;

        usersSnap.forEach(u => {
            const data = u.val().infos_client;
            if(!data) return;
            if (filtre !== 'TOUT' && data.categorie !== filtre) return;
            count++;

            const jours = calculerJours(data.date_inscription);
            const isBanned = blacklisted[u.key] === true;
            
            // Logique de couleur Diouf Ous
            let statusClass = "status-ok";
            if (jours >= 26 && jours <= 34) statusClass = "status-warning";
            if (jours >= 35) statusClass = "status-danger";

            // --- NOUVEAU HTML AVEC COLONNES FIXES ---
            list.innerHTML += `
                <div class="user-row" style="display:flex; align-items:center; padding:10px 5px; border-bottom:1px solid #222; background: rgba(255,255,255,0.01); margin-bottom:4px; border-radius:8px; overflow:hidden;">
                    
                    <div style="width:45px; flex-shrink:0; display:flex; justify-content:center;">
                        <div class="stats-circle ${statusClass}" style="width:34px; height:34px; font-size:0.6rem; border-width:2px; flex-shrink:0;">
                            ${jours}J
                        </div>
                    </div>

                    <div style="flex:1; margin-left:8px; min-width:0; overflow:hidden;">
                        <div style="font-weight:800; font-size:0.75rem; color:white; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">
                            ${data.nom}
                        </div>
                        <div style="font-size:0.5rem; color:#444;">ID:${u.key.slice(-4)}</div>
                    </div>

                    <div style="width:45px; flex-shrink:0; display:flex; justify-content:center;">
                        <select onchange="changerCategorie('${u.key}', this.value)" 
                                style="width:38px; background:#000; color:var(--p); border:1px solid #333; border-radius:4px; font-size:0.65rem; font-weight:900; height:26px; padding:0; text-align:center; cursor:pointer;">
                            <option value="A" ${data.categorie === 'A' ? 'selected' : ''}>A</option>
                            <option value="B" ${data.categorie === 'B' ? 'selected' : ''}>B</option>
                            <option value="C" ${data.categorie === 'C' ? 'selected' : ''}>C</option>
                        </select>
                    </div>

                    <div style="width:65px; flex-shrink:0; display:grid; grid-template-columns: 1fr 1fr; gap:3px; justify-items: center; align-items: center;">
                        <button onclick="validerPaiement('${u.key}')" class="pay-btn" style="width:28px; height:28px; font-size:0.75rem; padding:0; display:flex; align-items:center; justify-content:center;">💰</button>
                        
                        <button onclick="envoyerRappel('${u.key}', '${data.nom}')" class="pay-btn" style="width:28px; height:28px; font-size:0.75rem; padding:0; border-color:#25D366; color:#25D366; display:flex; align-items:center; justify-content:center;">💬</button>
                        
                        <button onclick="toggleBan('${u.key}')" class="pay-btn" style="width:28px; height:28px; font-size:0.75rem; padding:0; border-color:${isBanned ? 'var(--p)' : '#f59e0b'}; color:${isBanned ? 'var(--p)' : '#f59e0b'}; display:flex; align-items:center; justify-content:center;">
                            ${isBanned ? '🔓' : '🚫'}
                        </button>
                        
                        <button onclick="deleteClient('${u.key}')" class="pay-btn" style="width:28px; height:28px; font-size:0.75rem; padding:0; border-color:var(--d); color:var(--d); display:flex; align-items:center; justify-content:center;">🗑️</button>
                    </div>

                </div>`;
        });

        // Mise à jour des compteurs du dashboard
        if (typeof calculerGlobalStats === "function") calculerGlobalStats();

    } catch(e) { 
        console.error(e); 
        list.innerHTML = "<p style='text-align:center; color:red;'>Erreur de chargement.</p>";
    }
}

// FONCTION POUR CALCULER LES STATS DU DASHBOARD
async function calculerGlobalStats() {
    try {
        const clientsSnap = await database.ref('clients').once('value');
        const tarifsSnap = await database.ref('tarifs').once('value');
        
        const clients = clientsSnap.val() || {};
        const tarifs = tarifsSnap.val() || { A: 5000, B: 3000, C: 1500 }; // Valeurs par défaut

        let totalAttendu = 0;
        let nbRetards = 0;

        Object.values(clients).forEach(c => {
            const info = c.infos_client;
            if (!info) return;

            // Somme du montant attendu
            const prix = tarifs[info.categorie] || 0;
            totalAttendu += parseInt(prix);

            // Compte des retards (> 30 jours)
            const jours = calculerJours(info.date_inscription);
            if (jours > 30) nbRetards++;
        });

        // Mise à jour du HTML (Vos IDs d'origine)
        document.getElementById('dash-total-a').innerText = totalAttendu + " F";
        document.getElementById('dash-total-global').innerText = totalAttendu + " FCFA"; // Ici on estime le total
        document.getElementById('dash-retard').innerText = nbRetards;

    } catch (e) {
        console.error("Erreur stats:", e);
    }
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
function calculerJours(dateInsc) {
    if (!dateInsc) return 0;
    const debut = new Date(dateInsc);
    const aujourdhui = new Date();
    const difference = aujourdhui - debut;
    // Conversion des millisecondes en jours
    const jours = Math.floor(difference / (1000 * 60 * 60 * 24));
    return jours < 0 ? 0 : jours; 
}
async function changerCategorie(telId, nouvelleCat) {
    try {
        await database.ref(`clients/${telId}/infos_client/categorie`).set(nouvelleCat);
        // On rafraîchit les stats et la liste
        mettreAJourDashboard(); 
    } catch (e) {
        console.error("Erreur changement catégorie:", e);
        alert("Erreur de sauvegarde");
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

