// CONFIGURATION AVEC LA BONNE RÉGION (EUROPE)
let minuteurAdmin; // Déclaration indispensable pour l'appui long
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
    const ledContainer = document.getElementById('cloud-status');
    if (!ledContainer) return;

    database.ref(".info/connected").on("value", (snap) => {
        const cercle = ledContainer.querySelector('.led-circle');
        const texte = ledContainer.querySelector('.led-text');

        if (snap.val() === true) {
            // État Connecté
            ledContainer.style.background = "rgba(16, 185, 129, 0.1)";
            ledContainer.style.border = "1px solid #10b981";
            if(cercle) {
                cercle.style.background = "#10b981";
                cercle.style.boxShadow = "0 0 10px #10b981";
            }
            if(texte) {
                texte.innerText = "LIVE";
                texte.style.color = "#10b981";
            }
        } else {
            // État Recherche/Déconnecté
            ledContainer.style.background = "rgba(0,0,0,0.6)";
            ledContainer.style.border = "1px solid #444";
            if(cercle) {
                cercle.style.background = "#666";
                cercle.style.boxShadow = "none";
            }
            if(texte) {
                texte.innerText = "OFFLINE";
                texte.style.color = "#666";
            }
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
    
    if(!nom || tel.length < 8) {
        return alert("Veuillez remplir tous les champs correctement.");
    }

    try {
        // Chemin exact : clients / NUMERO / infos_client
        const clientRef = database.ref('clients/' + tel + '/infos_client');
        
        // On vérifie si le client existe déjà pour ne pas écraser ses jours
        const snapshot = await clientRef.once('value');
        let joursActuels = 1;
        let catActuelle = 'C';

        if (snapshot.exists()) {
            const existingData = snapshot.val();
            joursActuels = existingData.jours || 1;
            catActuelle = existingData.categorie || 'C';
        }

        // Enregistrement / Mise à jour
        await clientRef.set({
            nom: nom,
            tel: tel,
            jours: joursActuels,         // Initialisé à 1 ou garde l'ancien score
            categorie: catActuelle,     // Initialisé à C ou garde l'ancienne catégorie
            date_inscription: new Date().toISOString(),
            device_source: typeof getDeviceId === 'function' ? getDeviceId() : 'unknown'
        });

        // Sauvegarde locale pour la session
        localStorage.setItem('user_tel_id', tel);
        localStorage.setItem('v32_registered', 'true');
        
        alert("✅ Profil créé avec succès !");
        
        // Lancement de l'application
        if (typeof launchApp === 'function') {
            launchApp();
        } else {
            location.reload(); // Sécurité si launchApp n'est pas définie
        }

    } catch(e) { 
        console.error("Erreur Firebase:", e);
        alert("Erreur de connexion à la base de données."); 
    }
}
// ==========================================
// 6. VERROUILLAGE (DÉCONNEXION)
// ==========================================

function deconnecterApp() {
    if(confirm("Voulez-vous verrouiller l'accès et retourner à l'activation ?")) {
        // On retire uniquement le flag d'activation
        localStorage.removeItem('v32_active');
        
        // On force le rechargement pour que le système voie que v32_active n'existe plus
        window.location.reload();
    }
}
// ==========================================
// 7. NAVIGATION ET ÉTATS
// ==========================================
function naviguer(id) {
    // 1. On récupère TOUS les écrans possibles (vérifie bien les classes dans ton HTML)
    // On ajoute toutes les classes et IDs qui représentent des pages entières
    const tousLesEcrans = document.querySelectorAll('.gate, .full-page, .main-app, #page-admin, #page-bilan');
    
    // 2. On les cache TOUS par défaut
    tousLesEcrans.forEach(ecran => {
        ecran.style.display = 'none';
    });

    // 3. On affiche uniquement celui qu'on veut
    const cible = document.getElementById(id);
    if (cible) {
        // Pour le Hub et l'Admin, on utilise 'block' pour respecter le flux
        if (id === 'hub-accueil' || id === 'page-admin') {
            cible.style.display = 'block';
        } else {
            // Pour les écrans de verrouillage (licence/reg), on utilise 'flex' pour centrer
            cible.style.display = 'flex';
        }
        console.log("📍 Navigation vers : " + id);
    } else {
        console.error("❌ Erreur : L'écran '" + id + "' n'existe pas dans le HTML.");
    }
}
function launchApp() {
    const isActive = localStorage.getItem('v32_active') === 'true';
    const isReg = localStorage.getItem('v32_registered') === 'true';

    if (!isActive) {
        naviguer('license-gate');
    } else if (!isReg) {
        naviguer('registration-gate');
    } else {
        // C'est ici que l'on affiche l'application principale
        naviguer('hub-accueil'); 
        
        // On force l'affichage du titre au cas où
        const titre = document.getElementById('admin-trigger');
        
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

async function supprimerCompteDefinitif(telClient) {
    if(confirm("❗ Action IRRÉVERSIBLE : Supprimer ce compte sur TOUS les appareils ?")) {
        try {
            // 1. SUPPRESSION GÉNÉRALE (Efface le client de la base de données)
            // Cela coupe l'accès instantanément partout dans le monde.
            await database.ref('clients/' + telClient).remove();

            // 2. NETTOYAGE LOCAL (Uniquement si c'est l'appareil actuel)
            const monTelLocal = localStorage.getItem('user_tel_id');
            if(telClient === monTelLocal) {
                localStorage.clear(); 
                window.location.reload();
            } else {
                alert("✅ Compte " + telClient + " supprimé de partout.");
                ouvrirRapport(); 
            }
        } catch(e) {
            alert("Erreur réseau.");
        }
    }
}
function verifierExistenceCompte() {
    const tel = localStorage.getItem('user_tel_id');
    
    if(tel) {
        // On demande à Firebase : "Est-ce que ce numéro existe encore ?"
        database.ref('clients/' + tel).on('value', (snapshot) => {
            if(!snapshot.exists()) {
                // SI LE COMPTE N'EXISTE PLUS DANS FIREBASE
                alert("🚫 Votre compte a été supprimé ou désactivé.");
                localStorage.clear(); // On vide la mémoire de la machine
                window.location.reload(); // On renvoie à l'inscription
            }
        });
    }
}
function surveillerStatutCompte() {
    const tel = localStorage.getItem('user_tel_id');
    
    if(tel) {
        // On écoute les changements sur 'infos_client' en temps réel
        database.ref('clients/' + tel + '/infos_client').on('value', (snapshot) => {
            const data = snapshot.val();

            // CAS 1 : Le compte n'existe plus (Suppression)
            if(!snapshot.exists()) {
                localStorage.clear();
                window.location.reload();
                return;
            }

            // CAS 2 : Le compte est marqué comme "suspendu"
            if(data.statut === "suspendu") {
                // On bloque l'écran immédiatement
                document.body.innerHTML = `
                    <div style="height:100vh; background:#000; color:white; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; font-family:sans-serif; padding:20px;">
                        <h1 style="font-size:4rem;">🚫</h1>
                        <h2 style="color:#e67e22;">ACCÈS SUSPENDU</h2>
                        <p>Votre compte a été temporairement désactivé par l'établissement.</p>
                        <p style="color:gray; font-size:0.8rem;">Veuillez contacter l'administrateur pour régulariser votre situation.</p>
                        <button onclick="location.reload()" style="margin-top:20px; padding:10px 20px; border-radius:50px; border:none; background:#333; color:white;">Actualiser</button>
                    </div>
                `;
                // On empêche toute autre action
                throw new Error("Compte suspendu."); 
            }
        });
    }
}
async function suspendreCompte(telClient) {
    if(confirm("Voulez-vous suspendre l'accès de cet élève ?")) {
        try {
            await database.ref('clients/' + telClient + '/infos_client').update({
                statut: "suspendu"
            });
            alert("🟠 Accès suspendu. L'élève sera bloqué au prochain démarrage.");
            ouvrirRapport(); // Actualise le tableau
        } catch(e) {
            alert("Erreur lors de la suspension.");
        }
    }
}
async function reactiverCompte(telClient) {
    if(confirm("Voulez-vous rétablir l'accès pour cet élève ?")) {
        try {
            await database.ref('clients/' + telClient + '/infos_client').update({
                statut: "actif"
            });
            alert("✅ Compte réactivé ! L'élève peut de nouveau utiliser l'app.");
            ouvrirRapport(); // Rafraîchit le tableau
        } catch(e) {
            alert("Erreur lors de la réactivation.");
        }
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
// 5. FONCTION : OUVRIR LE RAPPORT (BILAN)
// ==========================================
// ==========================================
// 5. FONCTION : OUVRIR LE RAPPORT (BILAN FINANCIER)
// ==========================================
async function ouvrirRapport() {
    const zoneTableauBilan = document.getElementById('corps-bilan');
    const totalBilanElt = document.getElementById('total-bilan-argent');

    try {
        // 1. Récupération des prix fixés dans l'interface Admin
        const prixA = parseInt(document.getElementById('price-A').value) || 0;
        const prixB = parseInt(document.getElementById('price-B').value) || 0;
        const prixC = parseInt(document.getElementById('price-C').value) || 0;
        const tarifs = { "A": prixA, "B": prixB, "C": prixC };

        // 2. Récupération de la liste des clients
        const snapshot = await database.ref('clients').once('value');
        
        let htmlBilan = "";
        let sommePrevueTotale = 0;

        if (!snapshot.exists()) {
            zoneTableauBilan.innerHTML = "<tr><td colspan='3' style='text-align:center;'>Aucun élève enregistré.</td></tr>";
            return;
        }

        snapshot.forEach((child) => {
            const info = child.child('infos_client').val();
            
            if (info) {
                const maCat = info.categorie || info.cat || "C"; // Sécurité sur le nom de la clé
                const prixCategorie = tarifs[maCat] || 0;
                
                // On cumule pour le total général
                sommePrevueTotale += prixCategorie;

                // On construit la ligne (On a supprimé la colonne "Jours")
                htmlBilan += `
                    <tr style="border-bottom: 1px solid #222;">
                        <td style="padding:15px; text-align:left; color:white; font-weight:500;">
                            ${info.nom.toUpperCase()}
                        </td>
                        <td style="padding:15px; text-align:center;">
                            <span style="background:#333; color:var(--p); padding:4px 10px; border-radius:6px; font-weight:bold; font-size:0.8rem;">
                                CAT ${maCat}
                            </span>
                        </td>
                        <td style="padding:15px; text-align:right; color:#2ecc71; font-weight:900; font-size:0.9rem;">
                            ${prixCategorie.toLocaleString()} F
                        </td>
                    </tr>
                `;
            }
        });

        // 3. Mise à jour du tableau et du montant total
        zoneTableauBilan.innerHTML = htmlBilan;
        totalBilanElt.innerText = sommePrevueTotale.toLocaleString() + " F CFA";

    } catch (error) {
        console.error("Erreur Bilan :", error);
        zoneTableauBilan.innerHTML = "<tr><td colspan='3' style='text-align:center; color:red;'>Erreur de chargement des données.</td></tr>";
    }
}
function exporterCSV() {
    console.log("📊 Préparation de l'export Excel/CSV...");
    
    const tableau = document.getElementById('corps-bilan');
    if (!tableau || tableau.rows.length === 0) {
        alert("⚠️ Le tableau est vide, impossible d'exporter.");
        return;
    }

    // 1. Entêtes du fichier CSV
    let csvContent = "NOM DE L'ELEVE;CATEGORIE;MONTANT DU\n";

    // 2. Parcourir les lignes du tableau
    const lignes = tableau.querySelectorAll('tr');
    lignes.forEach(ligne => {
        const colonnes = ligne.querySelectorAll('td');
        if (colonnes.length >= 3) {
            const nom = colonnes[0].innerText.trim();
            const cat = colonnes[1].innerText.trim();
            const montant = colonnes[2].innerText.replace(' F', '').replace(/\s/g, ''); // On garde juste le chiffre
            
            csvContent += `${nom};${cat};${montant}\n`;
        }
    });

    // 3. Ajouter la ligne du Total à la fin
    const total = document.getElementById('total-bilan-argent').innerText.replace(' F CFA', '').replace(/\s/g, '');
    csvContent += `\n;TOTAL GENERAL;${total}`;

    // 4. Création du fichier et téléchargement
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    
    // Nom du fichier avec la date du jour
    const date = new Date().toLocaleDateString().replace(/\//g, '-');
    link.setAttribute("href", url);
    link.setAttribute("download", `Bilan_Maths5eme_${date}.csv`);
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    console.log("✅ Fichier CSV téléchargé.");
}

function exporterPDF() {
    const zoneBilan = document.getElementById('page-bilan');
    const corpsTableau = document.getElementById('corps-bilan');

    // Vérification de sécurité
    if (!zoneBilan || zoneBilan.style.display === 'none') {
        alert("⚠️ Le bilan doit être affiché à l'écran pour être exporté.");
        return;
    }

    if (!corpsTableau || corpsTableau.rows.length <= 1 && corpsTableau.innerText.includes("Calcul")) {
        alert("⏳ Attendez que les calculs soient terminés avant d'exporter.");
        return;
    }

    console.log("📸 Génération du PDF...");
    
    // Lance l'interface d'impression du système (Génère un PDF sur mobile)
    window.print();
}
// ==========================================
// FONCTION : INITIALISER L'APPUI LONG (ADMIN)
// ==========================================

function initAdminTrigger() {
    const trigger = document.getElementById('admin-trigger');
    
    if (trigger) {
        const demarrerChrono = () => {
            minuteurAdmin = setTimeout(() => {
                const p = prompt("🔑 CODE ACCÈS ADMIN :");
                if (p === ADMIN_PASS) {
                    // CHANGEMENT ICI : On va vers le menu de gestion, pas le bilan direct
                    naviguer('page-admin'); 
                    // On charge les données en arrière-plan pour que ce soit prêt
                    loadUsers('TOUT');
                } else if (p !== null) {
                    alert("❌ Code incorrect");
                }
            }, 3000); 
        };

        const stopperChrono = () => clearTimeout(minuteurAdmin);

        trigger.addEventListener('touchstart', demarrerChrono);
        trigger.addEventListener('touchend', stopperChrono);
        trigger.addEventListener('mousedown', demarrerChrono);
        trigger.addEventListener('mouseup', stopperChrono);
        trigger.addEventListener('mouseleave', stopperChrono);
    }
}
// ==========================================
// 8. DÉMARRAGE GLOBAL (L'UNIQUE BLOC DE SORTIE)
// ==========================================
window.addEventListener('load', () => {
    console.log("🚀 Lancement...");

    // 1. LE GARDIEN (Vérifie si le compte est Supprimé ou Suspendu)
    surveillerStatutCompte(); 

    // 2. Allume la LED (Vérification de la connexion Firebase)
    surveillerConnexion(); 
    
    // 3. Enregistre l'appareil dans l'onglet "Data" (Présence en temps réel)
    marquerPresence(); 
    
    // 4. Initialise l'appui long de 3s sur le titre pour l'admin
    initAdminTrigger(); 

    // 5. Affiche l'ID de l'appareil dans la zone d'activation
    const devIdDisplay = document.getElementById('display-device-id');
    if(devIdDisplay) {
        devIdDisplay.innerText = getDeviceId();
    }

    // 6. Décide quelle page afficher (Licence, Inscription ou Accueil)
    launchApp(); 
    
    console.log("✅ Initialisation terminée et sous surveillance.");
    // LIAISON DU BOUTON PDF
    const btnPdf = document.getElementById('mon-bouton-pdf-id'); // Remplace par l'ID de ton bouton
    if (btnPdf) {
        btnPdf.addEventListener('click', exporterPDF);
    }
});


