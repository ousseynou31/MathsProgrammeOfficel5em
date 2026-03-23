
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


// Sauvegarder les prix dans Firebase
async function sauvegarderTarifs() {
    const tarifs = {
        A: document.getElementById('price-A').value || 0,
        B: document.getElementById('price-B').value || 0,
        C: document.getElementById('price-C').value || 0
    };
    await database.ref('reglages/tarifs').set(tarifs);
    alert("✅ Tarifs mis à jour !");
    // APPEL DE LA BONNE FONCTION DE MISE À JOUR
    loadUsers('TOUT'); 
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
    const tarifs = tarifsSnap.val() || {A: 5000, B: 3000, C: 1500};

    let totalAttendu = 0;
    let nbRetards = 0;
    let nbTotal = 0;

    usersSnap.forEach(u => {
        const data = u.val().infos_client;
        if(data) {
            nbTotal++;
            const jours = calculerJours(data.date_inscription);
            const prix = parseInt(tarifs[data.categorie]) || 0;
            
            totalAttendu += prix;
            if(jours >= 35) nbRetards++;
        }
    });

    // Correction des IDs pour correspondre au HTML
    document.getElementById('stat-attendu').innerText = nbTotal;
    document.getElementById('stat-estime').innerText = totalAttendu.toLocaleString() + " FG";
    document.getElementById('stat-retard').innerText = nbRetards;
}

// 1. PAYER : Réinitialise la date à aujourd'hui
async function validerPaiement(idClient, filtreActuel, btnElement) {
    if (!confirm("Valider le paiement de 5000 F ?")) return;

    try {
        // 1. On récupère d'abord la vraie catégorie pour ne pas enregistrer "TOUT"
        const snap = await database.ref('clients/' + idClient + '/infos_client').once('value');
        const v = snap.val();
        const vraieCat = v.categorie || "C"; 

        // 2. Mise à jour sécurisée
        await database.ref('clients/' + idClient + '/infos_client').update({
            statut: "actif",
            montant: 5000,
            datePaiement: new Date().toLocaleDateString('fr-FR'),
            categorie: vraieCat // On préserve la vraie catégorie A, B ou C
        });

        // 3. Changement visuel immédiat sans recharger
        if (btnElement) {
            btnElement.innerHTML = "✅";
            btnElement.style.background = "#27ae60";
            btnElement.style.color = "white";
            btnElement.disabled = true;
        }

        // 4. On relance loadUsers avec le filtre actuel pour garder l'affichage propre
        // On utilise un petit délai pour laisser l'utilisateur voir le "✅"
        setTimeout(() => {
            loadUsers(filtreActuel);
        }, 800);

    } catch (e) {
        alert("Erreur : " + e.message);
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
// --- SUPPRESSION TOTALE ET UNIVERSELLE ---
// --- SUPPRESSION TOTALE AVEC DOUBLE VÉRIFICATION ---
async function deleteClient(telId, filtreActuel) {
    // 1. Première alerte de sensibilisation
    const confirmationInitiale = confirm(
        "⚠️ ALERTE SÉCURITÉ : Vous allez supprimer ce compte de TOUS les appareils (PC/Mobile).\n\n" +
        "Cette action effacera définitivement l'accès pour l'élève au numéro : " + telId + ".\n\n" +
        "Voulez-vous continuer ?"
    );

    if (!confirmationInitiale) return;

    // 2. DEUXIÈME BARRIÈRE : Saisie de sécurité
    // L'administrateur doit taper "SUPPRIMER" pour valider
    const verrou = prompt("🔒 ACTION SENSIBLE : Tapez 'SUPPRIMER' en majuscules pour confirmer l'effacement définitif :");

    if (verrou === "SUPPRIMER") {
        try {
            // Suppression dans Firebase (effet universel immédiat)
            await database.ref('clients/' + telId).remove();
            
            // Nettoyage de la présence si nécessaire
            await database.ref('presence/' + telId).remove();

            alert("✅ RÉUSSI : Le compte " + telId + " a été éjecté du système avec succès.");
            
            // Rafraîchissement de l'interface
            loadUsers(filtreActuel);
        } catch (e) {
            console.error(e);
            alert("❌ ERREUR RÉSEAU : Impossible de joindre la base de données.");
        }
    } else {
        // Si l'utilisateur tape mal ou annule
        alert("🛡️ ANNULATION : Le mot de passe de confirmation est incorrect. Aucune suppression n'a été effectuée.");
    }
}
// --- SUSPENSION UNIVERSELLE ---
async function toggleBan(telId, filtreActuel) {
    try {
        const snap = await database.ref(`clients/${telId}/infos_client/statut`).once('value');
        const statutActuel = snap.val();

        if (statutActuel === "suspendu") {
            if(confirm("Rétablir l'accès universel pour cet élève ?")) {
                await database.ref(`clients/${telId}/infos_client`).update({ statut: "actif" });
            }
        } else {
            if(confirm("⚠️ SUSPENDRE PARTOUT : L'élève sera bloqué sur tous ses supports. Continuer ?")) {
                // On injecte le statut "suspendu" que l'appareil de l'élève surveille en temps réel
                await database.ref(`clients/${telId}/infos_client`).update({ statut: "suspendu" });
            }
        }
        loadUsers(filtreActuel);
    } catch(e) {
        alert("❌ Erreur de modification du statut.");
    }
}

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
// 1. STATISTIQUES GLOBALES
// ==========================================
async function calculerGlobalStats(filtreActuel = 'TOUT') {
    try {
        const snap = await database.ref('clients').once('value');
        let total = 0, catA = 0, catB = 0, catC = 0;

        snap.forEach(u => {
            const val = u.val();
            if (val && val.infos_client) {
                const cat = (val.infos_client.categorie || "C").trim().toUpperCase();
                if (cat === 'A') catA++;
                else if (cat === 'B') catB++;
                else if (cat === 'C') catC++;
                total++;
            }
        });
        console.log("📊 Stats chargées:", {total, catA, catB, catC});
    } catch (e) {
        console.error("Erreur Stats:", e);
    }
}

async function loadUsers(filtre = 'TOUT') {
    const list = document.getElementById('admin-user-list');
    if (!list) return;
    
    list.innerHTML = `<p style="text-align:center; color:gray; padding:20px;">Analyse de la base en cours...</p>`;
    
    // Variables pour le récapitulatif du dashboard
    let nbAttendu = 0;    
    let totalArgent = 0;  
    let nbRetards = 0;    

    try {
        // Récupération des tarifs configurés
        const tarifsSnap = await database.ref('reglages/tarifs').once('value');
        const tarifs = tarifsSnap.val() || { A: 5000, B: 3000, C: 1500 };

        // Récupération de tous les clients
        const usersSnap = await database.ref('clients').once('value');
        list.innerHTML = ""; 

        usersSnap.forEach(u => {
            const val = u.val();
            if (!val || !val.infos_client) return;
            
            const data = val.infos_client;
            const tel = u.key; // Le numéro sert d'identifiant
            const cat = (data.categorie || "C").trim().toUpperCase();

            // 1. FILTRAGE
            if (filtre !== 'TOUT' && cat !== filtre) return;

            // 2. CALCULS DE SUIVI
            const jours = calculerJours(data.date_inscription);
            const prix = parseInt(tarifs[cat]) || 0;
            const isBanned = data.statut === "suspendu";

            // Mise à jour des compteurs du dashboard
            nbAttendu++;
            totalArgent += prix;
            if (jours >= 35) nbRetards++;

            // Couleur du cercle selon l'urgence (Vert, Orange, Rouge)
            let coul = (jours >= 35) ? "#e74c3c" : (jours >= 26 ? "#f1c40f" : "#2ecc71");

            // 3. GÉNÉRATION DU HTML (Les 5 fonctionnalités)
            list.innerHTML += `
                <div class="user-card" style="background:#111; margin-bottom:12px; padding:15px; border-radius:12px; border-left:5px solid ${isBanned ? '#e74c3c':'#2ecc71'}; border-bottom:1px solid #333;">
                    
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        
                        <div style="flex:1;">
                            <div style="display:flex; align-items:center; gap:8px;">
                                <b style="font-size:0.9rem; color:white;">${data.nom.toUpperCase()}</b>
                                <span style="font-size:0.6rem; background:#333; color:#f1c40f; padding:2px 6px; border-radius:4px; font-weight:bold;">${cat}</span>
                            </div>
                            <div style="font-size:0.75rem; color:gray; margin-top:3px;">📞 ${tel}</div>
                            ${isBanned ? '<div style="font-size:0.65rem; color:#e74c3c; font-weight:900; margin-top:5px;">⚠️ COMPTE SUSPENDU</div>' : ''}
                        </div>

                        <div style="margin: 0 15px; text-align:center;">
                            <div style="width:38px; height:38px; border-radius:50%; border:2px solid ${coul}; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:900; color:white;">
                                ${jours}
                            </div>
                            <small style="font-size:0.5rem; color:gray; display:block; margin-top:2px;">JOURS</small>
                        </div>

                        <div style="display:flex; gap:6px; align-items:center;">
                            
                            <button onclick="window.open('https://wa.me/${tel}')" title="WhatsApp" style="background:#25D366; border:none; border-radius:8px; width:32px; height:32px; cursor:pointer; font-size:1rem;">🟢</button>
                            
                            <button onclick="validerPaiement('${tel}')" title="Payer" style="background:#2ecc71; border:none; border-radius:8px; width:32px; height:32px; cursor:pointer; font-size:1rem;">💰</button>
                            
                            <select onchange="changerCategorie('${tel}', this.value)" style="background:#222; color:white; border:1px solid #444; border-radius:6px; padding:6px; font-size:0.7rem; font-weight:bold;">
                                <option value="A" ${cat==='A'?'selected':''}>A</option>
                                <option value="B" ${cat==='B'?'selected':''}>B</option>
                                <option value="C" ${cat==='C'?'selected':''}>C</option>
                            </select>

                            <button onclick="toggleBan('${tel}', '${filtre}')" title="Bloquer/Débloquer" style="background:${isBanned?'#f1c40f':'#333'}; border:none; border-radius:8px; width:32px; height:32px; cursor:pointer; font-size:1rem;">
                                ${isBanned ? '🔓' : '🚫'}
                            </button>

                            <button onclick="deleteClient('${tel}', '${filtre}')" title="Supprimer" style="background:#e74c3c; border:none; border-radius:8px; width:32px; height:32px; cursor:pointer; font-size:1rem;">🗑️</button>
                        </div>
                    </div>
                </div>`;
        });

        // 4. MISE À JOUR DU DASHBOARD (VOTRE BLOC DE CODE)
        try {
            const eltNb = document.getElementById('stat-attendu');
            const eltPrix = document.getElementById('stat-estime');
            const eltRetard = document.getElementById('stat-retard');

            if (eltNb) eltNb.innerText = nbAttendu;
            if (eltPrix) eltPrix.innerText = totalArgent.toLocaleString() + " FG";
            if (eltRetard) eltRetard.innerText = nbRetards;

            console.log("✅ Dashboard synchronisé : ", nbAttendu, "élèves.");
        } catch (e) {
            console.error("Erreur d'affichage dashboard:", e);
        }

    } catch (e) {
        console.error("Erreur critique loadUsers:", e);
        list.innerHTML = `<p style="color:#e74c3c; text-align:center; padding:20px;">Erreur de connexion à Firebase</p>`;
    }
}

// FONCTION COMPLÉMENTAIRE POUR LE PAIEMENT (BOUTON 💰)
async function validerPaiement(id) {
    if(confirm("Confirmer le paiement pour cet élève ? (Cela remettra ses jours à zéro)")) {
        const nouvelleDate = new Date().toISOString();
        await database.ref(`clients/${id}/infos_client/date_inscription`).set(nouvelleDate);
        alert("✅ Paiement enregistré !");
        loadUsers(); // Rafraîchir la liste
    }
}
// Cette fonction doit être appelée dès que l'application démarre
function activerSignalPresence() {
    const tel = localStorage.getItem('user_tel_id');
    if (!tel) return;

    // Référence vers l'état de présence de cet élève précis
    const maPresenceRef = database.ref('presence/' + tel);

    // 1. On se déclare "EN LIGNE"
    maPresenceRef.set({
        status: "online",
        last_seen: firebase.database.ServerValue.TIMESTAMP
    });

    // 2. On demande à Firebase de nous effacer AUTOMATIQUEMENT à la déconnexion
    maPresenceRef.onDisconnect().remove();
}
async function ouvrirRecuperation() {
    const num = prompt("Entrez votre numéro de téléphone (celui utilisé lors de l'inscription) :");
    
    if (!num || num.trim() === "") return;

    try {
        // 1. RECHERCHE DANS LA BASE
        const snap = await database.ref(`clients/${num}`).once('value');
        
        if (!snap.exists()) {
            // CAS : JAMAIS INSCRIT ou SUPPRIMÉ
            alert("❌ Erreur : Ce numéro n'est pas reconnu par le système.");
            return;
        }

        const data = snap.val().infos_client;

        // 2. VÉRIFICATION DU STATUT (LE VERROU)
        if (data.statut === "suspendu") {
            // CAS : CLIENT SUSPENDU
            alert("🚫 ACCÈS REFUSÉ : Votre compte est suspendu. Veuillez contacter l'administration.");
            return;
        }

        // 3. TOUT EST OK : ON RESTAURE LA SESSION
        // On recrée les clés locales comme si l'inscription venait de se faire
        localStorage.setItem('mon_numero_cle', num);
        localStorage.setItem('v32_active', 'true'); // Votre clé de session
        
        alert("✅ Bon retour " + data.nom + " ! Votre accès est rétabli.");
        
        // On redirige vers le menu
        naviguer('hub-accueil'); 

    } catch (e) {
        console.error(e);
        alert("❌ Une erreur est survenue lors de la vérification.");
    }
}

function filtrerHistorique() {
    const input = document.getElementById('search-historique').value.toUpperCase();
    const lignes = document.querySelectorAll('.ligne-historique');
    let totalFiltre = 0;

    lignes.forEach(ligne => {
        // On récupère tout le texte de la ligne pour une recherche globale
        const texteLigne = ligne.innerText.toUpperCase();
        
        if (texteLigne.indexOf(input) > -1) {
            ligne.style.display = "";
            // On extrait le montant pour recalculer le total affiché
            const montantTexte = ligne.querySelector('td:last-child').innerText.replace(/\D/g, '');
            totalFiltre += parseInt(montantTexte) || 0;
        } else {
            ligne.style.display = "none";
        }
    });

    // Mise à jour du total en bas selon la recherche
    const totalElt = document.getElementById('total-historique');
    if(totalElt) totalElt.innerText = totalFiltre.toLocaleString() + " FG";
}

// A AJOUTER DANS SCRIPT.JS
async function ouvrirHistorique() {
    const page = document.getElementById('page-historique');
    const corps = document.getElementById('corps-historique');
    const totalElt = document.getElementById('total-historique');
    
    page.style.display = 'flex'; 
    corps.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:30px; color:gray;'>Chargement...</td></tr>";

    try {
        const [tarifsSnap, usersSnap] = await Promise.all([
            database.ref('reglages/tarifs').once('value'),
            database.ref('clients').once('value')
        ]);

        const tarifs = tarifsSnap.val() || { A: 5000, B: 3000, C: 1500 };
        let html = "";
        let totalGeneral = 0;

        usersSnap.forEach(client => {
            const val = client.val();
            if (val && val.infos_client) {
                const info = val.infos_client;
                const cat = (info.categorie || "C").trim().toUpperCase();
                const montant = parseInt(tarifs[cat]) || 0;
                const datePay = info.date_inscription ? info.date_inscription.split('T')[0] : "---";

                totalGeneral += montant;

                // CHAQUE DONNÉE DANS SA PROPRE COLONNE AVEC LARGEUR FIXE
                html += `
                    <tr class="ligne-historique" style="border-bottom: 1px solid #222;">
                        <td style="width:20%; padding:12px 10px; color:#888; font-size:0.75rem; overflow:hidden; white-space:nowrap;">
                            ${datePay}
                        </td>
                        <td style="width:30%; padding:12px 10px; color:white; font-weight:bold; font-size:0.8rem; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                            ${info.nom.toUpperCase()}
                        </td>
                        <td style="width:10%; padding:12px 10px; text-align:center;">
                            <span style="background:#333; color:#f1c40f; padding:2px 5px; border-radius:4px; font-size:0.65rem; font-weight:bold;">${cat}</span>
                        </td>
                        <td style="width:20%; padding:12px 10px; color:#888; font-size:0.75rem;">
                            ${client.key}
                        </td>
                        <td style="width:20%; padding:12px 10px; text-align:right; font-weight:900; color:#2ecc71; font-size:0.85rem;">
                            ${montant.toLocaleString()}
                        </td>
                    </tr>`;
            }
        });

        corps.innerHTML = html || "<tr><td colspan='5' style='text-align:center;'>Aucune donnée.</td></tr>";
        if(totalElt) totalElt.innerText = totalGeneral.toLocaleString() + " FG";

    } catch (e) {
        console.error(e);
        corps.innerHTML = "<tr><td colspan='5' style='color:red; text-align:center;'>Erreur de chargement.</td></tr>";
    }
}
function fermerHistorique() {
    document.getElementById('page-historique').style.display = 'none';
}

function fermerHistorique() {
    document.getElementById('page-historique').style.display = 'none';
}

async function chargerContenuHistorique() {
    const corps = document.getElementById('corps-historique');
    const totalElt = document.getElementById('total-historique');
    if(!corps) return;

    corps.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:20px; color:gray;'>Analyse des transactions...</td></tr>";

    try {
        // 1. Récupérer les tarifs officiels et les clients
        const [tarifsSnap, usersSnap] = await Promise.all([
            database.ref('reglages/tarifs').once('value'),
            database.ref('clients').once('value')
        ]);

        const tarifs = tarifsSnap.val() || { A: 5000, B: 3000, C: 1500 };
        let html = "";
        let totalGeneral = 0;

        // 2. Parcourir les clients pour construire l'historique
        usersSnap.forEach(client => {
            const val = client.val();
            if (val && val.infos_client) {
                const info = val.infos_client;
                
                // On récupère la catégorie réelle de l'élève
                const cat = (info.categorie || "C").trim().toUpperCase();
                
                // On récupère le prix correspondant à sa catégorie
                const montantReel = parseInt(tarifs[cat]) || 0;
                
                // On ne l'affiche que s'il a une date de paiement (ou inscription)
                const dateAffiche = info.date_inscription ? info.date_inscription.split('T')[0] : "---";

                totalGeneral += montantReel;

                html += `
                    <tr style="border-bottom: 1px solid #222; font-size: 0.8rem;">
                        <td style="padding:12px 10px; color:gray;">${dateAffiche}</td>
                        <td style="padding:12px 10px;">
                            <b style="color:white; display:block;">${info.nom.toUpperCase()}</b>
                            <small style="color:#f1c40f;">CATÉGORIE ${cat}</small>
                        </td>
                        <td style="padding:12px 10px; color:gray;">${client.key}</td>
                        <td style="padding:12px 10px; text-align:right;">
                            <b style="color:#2ecc71;">${montantReel.toLocaleString()}</b> <small style="color:#2ecc71;">FG</small>
                        </td>
                    </tr>`;
            }
        });

        corps.innerHTML = html || "<tr><td colspan='5' style='text-align:center; padding:20px;'>Aucun historique disponible.</td></tr>";
        
        if(totalElt) {
            totalElt.innerText = totalGeneral.toLocaleString() + " FG";
        }

    } catch (e) {
        console.error("Erreur historique:", e);
        corps.innerHTML = "<tr><td colspan='5' style='color:red; text-align:center;'>Erreur de chargement</td></tr>";
    }
}
function deconnecterApp() {
    // 1. Demande de confirmation pour éviter les erreurs de clic
    if(confirm("⚠️ TEST DE SÉCURITÉ :\nVoulez-vous verrouiller l'accès et revenir à la page d'activation ?")) {
        
        // 2. SUPPRESSION DE LA CLÉ (Acquis de sécurité)
        // Remplacez 'v32_active' par le nom exact de votre clé de stockage
        localStorage.removeItem('v32_active'); 
        
        // 3. RECHARGEMENT TOTAL
        // Cela renvoie l'application à son état initial (Page d'activation)
        window.location.reload();
    }
}

// Lancement automatique au chargement de la page
window.addEventListener('load', activerSignalPresence);

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

