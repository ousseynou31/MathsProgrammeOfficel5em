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
// 3. MENU CACHÉ (APPUI LONG 2S SUR LE TITRE)
// ==========================================
let adminTimer;
const ADMIN_PASS = "1234"; // Assure-toi que ton mot de passe est bien défini ici

function lancerTimerAdmin() {
    // On lance le compte à rebours de 2 secondes
    adminTimer = setTimeout(() => {
        const p = prompt("🔑 CODE ADMIN :");
        if (p === ADMIN_PASS) {
            naviguer('page-admin');
        } else if (p !== null) {
            alert("❌ Code incorrect");
        }
    }, 2000); 
}

function stopperTimerAdmin() {
    // Si on relâche avant les 2 secondes, on annule tout
    clearTimeout(adminTimer);
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
// CALCUL DES JOURS (Essentiel pour afficher la liste)
function calculerJours(dateInsc) {
    if (!dateInsc) return 0;
    const debut = new Date(dateInsc);
    const aujourdhui = new Date();
    const diff = aujourdhui - debut;
    const jours = Math.floor(diff / (1000 * 60 * 60 * 24));
    return jours < 0 ? 0 : jours;
}
// --- 1. CHARGEMENT DE LA LISTE ---
async function loadUsers(filtre = 'TOUT') {
    const list = document.getElementById('admin-user-list');
    list.innerHTML = `<p style="text-align:center; color:gray; padding:20px; font-size:0.8rem;">Analyse des abonnés...</p>`;
    
    try {
        const usersSnap = await database.ref('clients').once('value');
        const blackSnap = await database.ref('blacklist').once('value');
        const blacklisted = blackSnap.val() || {};
        
        list.innerHTML = ""; 

        usersSnap.forEach(u => {
            const data = u.val().infos_client;
            if(!data) return;

            // Filtre de catégorie (A, B, C ou TOUT)
            if (filtre !== 'TOUT' && data.categorie !== filtre) return;

            const jours = calculerJours(data.date_inscription);
            const isBanned = blacklisted[u.key] === true;
            
            // Formatage de la date (ex: 20/03/2026)
            const dateObj = new Date(data.date_inscription);
            const dateAffichee = dateObj.toLocaleDateString('fr-FR');

            // --- LOGIQUE DE COULEUR DU CERCLE ---
            let couleurCercle = "#10b981"; // VERT (OK)
            if (jours >= 26 && jours <= 34) couleurCercle = "#f59e0b"; // ORANGE (ALERTE)
            if (jours >= 35) couleurCercle = "#ef4444"; // ROUGE (RETARD)

            list.innerHTML += `
                <div class="user-row" style="display:flex; align-items:center; padding:12px 15px; border-bottom:1px solid #222; background: rgba(255,255,255,0.02); margin: 0 20px 8px 20px; border-radius:12px; border-left: 4px solid ${isBanned ? 'var(--d)' : 'transparent'};">
                    
                    <div style="width:55px; flex-shrink:0; display:flex; justify-content:center;">
                        <div style="width:42px; height:42px; border-radius:50%; border: 3px solid ${couleurCercle}; display:flex; align-items:center; justify-content:center; color:white; font-weight:900; font-size:0.8rem; background: rgba(0,0,0,0.4); box-shadow: 0 0 8px ${couleurCercle}33;">
                            ${jours}J
                        </div>
                    </div>

                    <div style="flex:1; margin-left:15px; min-width:0; padding-right:10px;">
                        <div style="font-weight:800; font-size:0.95rem; color:white; text-transform:uppercase; white-space:nowrap; overflow:hidden; text-overflow:ellipsis; letter-spacing:0.5px;">
                            ${data.nom}
                        </div>
                        <div style="font-size:0.65rem; color:#777; margin-top:3px; display:flex; gap:10px; align-items:center;">
                            <span>📅 ${dateAffichee}</span>
                            <span style="color:#444;">|</span>
                            <span style="color:var(--p); font-weight:bold;">📞 ${u.key}</span>
                        </div>
                    </div>

                    <div style="display:flex; align-items:center; gap:12px; flex-shrink:0; background:rgba(0,0,0,0.4); padding:6px 12px; border-radius:10px; border:1px solid #333;">
                        
                        <select onchange="changerCategorie('${u.key}', this.value)" 
                                style="width:45px; background:#000; color:var(--p); border:1px solid #444; border-radius:4px; font-size:0.75rem; font-weight:900; height:28px; cursor:pointer;">
                            <option value="A" ${data.categorie === 'A' ? 'selected' : ''}>A</option>
                            <option value="B" ${data.categorie === 'B' ? 'selected' : ''}>B</option>
                            <option value="C" ${data.categorie === 'C' ? 'selected' : ''}>C</option>
                        </select>

                        <div style="display:grid; grid-template-columns: 1fr 1fr; gap:4px;">
                            <button onclick="validerPaiement('${u.key}', '${filtre}')" class="pay-btn" style="width:28px; height:28px; font-size:0.75rem; padding:0;" title="Renouveler">💰</button>
                            <button onclick="envoyerRappel('${u.key}', '${data.nom}', '${data.categorie}')" class="pay-btn" style="width:28px; height:28px; font-size:0.75rem; padding:0; border-color:#25D366; color:#25D366;" title="WhatsApp">💬</button>
                            <button onclick="toggleBan('${u.key}', '${filtre}')" class="pay-btn" style="width:28px; height:28px; font-size:0.75rem; padding:0; border-color:${isBanned ? 'var(--p)' : '#f59e0b'}; color:${isBanned ? 'var(--p)' : '#f59e0b'};">
                                ${isBanned ? '🔓' : '🚫'}
                            </button>
                            <button onclick="deleteClient('${u.key}', '${filtre}')" class="pay-btn" style="width:28px; height:28px; font-size:0.75rem; padding:0; border-color:var(--d); color:var(--d);">🗑️</button>
                        </div>
                    </div>
                </div>`;
        });

        // Mise à jour automatique des statistiques en haut
        calculerGlobalStats(filtre);

    } catch(e) { 
        console.error(e); 
        list.innerHTML = "<p style='text-align:center; color:red;'>Erreur de chargement.</p>";
    }
}
// FONCTION POUR CALCULER LES STATS DU DASHBOARD
async function calculerGlobalStats(filtre = 'TOUT') {
    try {
        const clientsSnap = await database.ref('clients').once('value');
        const tarifsSnap = await database.ref('reglages/tarifs').once('value');
        const tarifs = tarifsSnap.val() || { A: 5000, B: 3000, C: 1500 };

        let nbClientsFiltres = 0;
        let sommeEstimee = 0;
        let nbRetards = 0;

        clientsSnap.forEach(u => {
            const data = u.val().infos_client;
            if (!data) return;

            // Logique de filtre
            if (filtre !== 'TOUT' && data.categorie !== filtre) return;

            // 1. On compte le client
            nbClientsFiltres++;

            // 2. On ajoute son tarif au total estimé
            const prix = parseInt(tarifs[data.categorie]) || 0;
            sommeEstimee += prix;

            // 3. On vérifie s'il est en retard (> 30 jours)
            const jours = calculerJours(data.date_inscription);
            if (jours > 30) nbRetards++;
        });

        // MISE À JOUR DU DASHBOARD HTML
        // Bloc 1 : Nombre de clients
        document.getElementById('dash-total-a').innerText = nbClientsFiltres + " Clients";
        
        // Bloc 2 : Somme d'argent (Total financier)
        document.getElementById('dash-total-global').innerText = sommeEstimee.toLocaleString() + " F";
        
        // Bloc 3 : Nombre de retards
        document.getElementById('dash-retard').innerText = nbRetards;

    } catch (e) {
        console.error("Erreur calcul stats:", e);
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
async function validerPaiement(telId, filtreActuel) {
    if(confirm("Confirmer le paiement ?")) {
        await database.ref(`clients/${telId}/infos_client/date_inscription`).set(new Date().toISOString());
        // On recharge la liste ET le dashboard avec le filtre en cours
        loadUsers(filtreActuel); 
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
    // 1. Récupère la saisie de l'utilisateur (en minuscules)
    const query = document.getElementById('admin-search').value.toLowerCase().trim();
    
    // 2. Sélectionne toutes les lignes de clients
    const rows = document.querySelectorAll('.user-row');
    
    rows.forEach(row => {
        // On récupère tout le texte de la ligne (Nom + Tel + ID)
        const contenu = row.innerText.toLowerCase();
        
        // 3. Si la recherche correspond au contenu, on affiche, sinon on cache
        if (contenu.includes(query)) {
            row.style.display = "flex";
        } else {
            row.style.display = "none";
        }
    });

    // Optionnel : Afficher un message si aucun résultat n'est trouvé après filtrage
    const visibleRows = Array.from(rows).filter(r => r.style.display !== "none");
    console.log(`Résultats trouvés : ${visibleRows.length}`);
}
// CHANGEMENT DE CATÉGORIE (Enregistre le choix A/B/C)
async function changerCategorie(telId, nouvelleCat) {
    try {
        await database.ref(`clients/${telId}/infos_client/categorie`).set(nouvelleCat);
        // On relance le chargement pour mettre à jour les calculs d'argent
        loadUsers(document.querySelector('.filter-btn.active')?.innerText || 'TOUT');
    } catch (e) {
        alert("Erreur de sauvegarde dans la base.");
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

