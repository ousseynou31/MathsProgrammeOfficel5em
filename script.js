
// NETTOYAGE : Une seule déclaration globale ultra-compatible
window.adminEnCours = window.adminEnCours || false;
window.minuteurAdmin = window.minuteurAdmin || null;
console.log("🚀 Moteur prêt : adminEnCours =", window.adminEnCours);
// =========================================================
// 1. DÉCLARATIONS GLOBALES (UNE SEULE FOIS ICI)
// =========================================================
let canvas, ctx;
let points = [];
let elements = []; 
let selection = []; 
let mode = 'point';
let couleurActive = '#0f172a'; // Noir/Bleu nuit par défaut

// 1. CONFIGURATION FIREBASE 
const firebaseConfig = {
    databaseURL: "https://maths5eme-v1-default-rtdb.europe-west1.firebasedatabase.app"
}; 

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();

function surveillerSession() {
    const tel = localStorage.getItem('user_tel_id');
    const monToken = localStorage.getItem('session_token');

    if (tel && monToken) {
        // .on('value') écoute en temps réel les changements sur Firebase
        database.ref('clients/' + tel + '/infos_client/dernier_token').on('value', (snap) => {
            const tokenServeur = snap.val();
            
            // Si le jeton change (quelqu'un d'autre s'est connecté)
            if (tokenServeur && tokenServeur !== monToken) {
                
                // 1. ON COUPE TOUT DE SUITE LES ACCÈS LOCAUX
                localStorage.removeItem('v32_active');
                localStorage.removeItem('session_token');
                // On garde juste le numéro pour qu'il puisse tenter de se reconnecter plus tard
                
                // 2. MESSAGE D'ALERTE
                alert("⚠️ SÉCURITÉ : Ce compte vient d'être ouvert sur un autre appareil.\n\nVotre session est interrompue immédiatement.");

                // 3. REDIRECTION FORCÉE (On vide l'écran et on recharge la page d'accueil)
                window.location.reload(); 
            }
        });
    }
}
// À appeler au chargement de la page
surveillerSession();

// Ce code s'exécute dès que la page charge, AVANT d'afficher quoi que ce soit
async function verificationUltime() {
    const tel = localStorage.getItem('user_tel_id');
    
    if (tel) {
        // On va vérifier le statut REEL sur Firebase, pas dans le cache
        const snap = await database.ref('clients/' + tel + '/infos_client').once('value');
        const data = snap.val();

        if (data && (data.etat_acces === "banni" || data.etat_acces === "suspendu")) {
            // IL EST SUSPENDU : ON DÉTRUIT TOUT
            localStorage.clear();
            alert("🚫 ACCÈS REFUSÉ : Votre compte est suspendu ou banni.");
            document.body.innerHTML = "<h1 style='color:red; text-align:center;'>ACCÈS RÉVOQUÉ</h1>";
            window.location.reload();
            return;
        }
    }
}
// Lancement de la vérification au démarrage
verificationUltime();


// 2. DÉFINITION DES FONCTIONS (On les déclare toutes ici)
function activerSignalEnLigne() {
    const monTel = localStorage.getItem('user_tel_id');
    if (monTel) {
        const maRefStatus = database.ref('clients/' + monTel + '/status');
        maRefStatus.set("en_ligne");
        maRefStatus.onDisconnect().set("hors_ligne");
        console.log("📡 Signal de présence activé");
    }
}

function surveillerConnexion() {
    const ledContainer = document.getElementById('cloud-status');
    if (!ledContainer) return;

    database.ref(".info/connected").on("value", (snap) => {
        const cercle = ledContainer.querySelector('.led-circle');
        const texte = ledContainer.querySelector('.led-text');
        if (snap.val() === true) {
            ledContainer.style.background = "rgba(16, 185, 129, 0.1)";
            if(cercle) cercle.style.background = "#10b981";
            if(texte) texte.innerText = "LIVE";
        } else {
            ledContainer.style.background = "rgba(0,0,0,0.6)";
            if(cercle) cercle.style.background = "#666";
            if(texte) texte.innerText = "OFFLINE";
        }
    });
}


const SECRET_KEY = 7391;
const ADMIN_PASS = "0000";


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
    // 1. On récupère TOUS les écrans possibles en une seule fois
    const tousLesEcrans = document.querySelectorAll('.gate, .full-page, .main-app, #page-admin, #page-bilan, #hub-accueil, #app-content');
    
    // 2. On les cache TOUS par défaut
    tousLesEcrans.forEach(ecran => {
        ecran.style.display = 'none';
    });

    // 3. On affiche uniquement celui qu'on veut
    const cible = document.getElementById(id);
    if (cible) {
        // Pour le Hub, l'Admin et le contenu principal, on utilise 'block'
        if (id === 'hub-accueil' || id === 'page-admin' || id === 'app-content') {
            cible.style.display = 'block';
        } else {
            // Pour les écrans de verrouillage (licence/reg), on utilise 'flex' pour centrer les cartes
            cible.style.display = 'flex';
        }
        console.log("📍 Navigation vers : " + id);
    } else {
        console.error("❌ Erreur : L'écran '" + id + "' n'existe pas dans le HTML.");
    }
}

async function demanderCodeAvantInscription() {
    const pinSaisi = prompt("🔑 Entrez le code PIN d'activation (8 chiffres) pour débloquer le formulaire d'inscription :");
    
    if (!pinSaisi) return; // L'élève a annulé

    // Calcul du code attendu pour CET appareil
    const device = getDeviceId(); 
    let hash = 0;
    for (let i = 0; i < device.length; i++) {
        hash = ((hash << 5) - hash) + device.charCodeAt(i);
        hash |= 0;
    }
    const codeAttendu = Math.abs(hash + SECRET_KEY).toString().substring(0, 8);

    if (pinSaisi === codeAttendu) {
        alert("✅ CODE VALIDE !\nAccès au formulaire d'inscription autorisé.");
        naviguer('registration-gate'); // On ouvre ENFIN le formulaire
    } else {
        alert("❌ CODE INCORRECT.\n\nVotre ID Appareil est : " + device + "\nVeuillez envoyer cet ID à l'administrateur pour obtenir votre PIN.");
    }
}

// ==========================================
// 2. LE GARDIEN (VÉRIFICATION EN TEMPS RÉEL)
// ==========================================
async function verifierIdentite() {
    const tel = localStorage.getItem('user_tel_id');
    if (!tel) return "NO_PROFILE";

    try {
        // 🔍 Récupération des données fraîches sur Firebase
        const snap = await database.ref(`clients/${tel}/infos_client`).once('value');
        
        if (!snap.exists()) return "DELETED";

        const user = snap.val();

        // --- 1. VÉRIFICATION DES VERROUS (Double Sécurité Admin) ---
        // On bloque si l'un des deux marqueurs de bannissement est présent
        if (user.etat_acces === "banni" || user.statut === "suspendu" || user.acces === "suspendu") {
            console.warn("🚫 Accès révoqué par l'administrateur.");
            return "BANNED"; 
        }

        // --- 2. VÉRIFICATION DU PAIEMENT ---
        if (user.statut_paiement !== "VALIDE") {
            console.log("💳 Accès refusé : Statut paiement est " + user.statut_paiement);
            return "PENDING_PAYMENT";
        }

        // --- 3. VÉRIFICATION DE L'APPAREIL (L'ID UNIQUE) ---
        // Empêche le partage de compte ou le changement de téléphone sans 'Récupérer'
        const idActuel = typeof getDeviceId === 'function' ? getDeviceId() : "unknown";
        
        if (user.device_id && user.device_id !== idActuel) {
            console.warn("⚠️ Appareil non reconnu. Redirection vers récupération.");
            return "DEVICE_MISMATCH"; 
        }

        // --- 4. SI TOUT EST OK ---
        return "AUTHORIZED";

    } catch (e) {
        console.error("Erreur sécurité identité:", e);
        // Tolérance réseau : On se fie au cache local si Firebase est injoignable
        return localStorage.getItem('v32_active') === 'true' ? "AUTHORIZED" : "ERROR";
    }
}
// Aller vers l'inscription
function ouvrirInscription() {
    document.getElementById('license-gate').style.display = 'none';
    document.getElementById('registration-gate').style.display = 'flex';
}

// Revenir vers la connexion (le PIN)
function ouvrirLogin() {
    document.getElementById('registration-gate').style.display = 'none';
    document.getElementById('license-gate').style.display = 'flex';
}

function verifierEtatInitial() {
    const tel = localStorage.getItem('user_tel_id');
    const active = localStorage.getItem('v32_active');

    // On cache tout au départ
    document.getElementById('license-gate').style.display = 'none';
    document.getElementById('registration-gate').style.display = 'none';
    document.getElementById('hub-accueil').style.display = 'none';

    if (active === 'true' && tel) {
        // CAS 1 : Tout est OK -> Accès aux cours
        document.getElementById('hub-accueil').style.display = 'block'; 
    } 
    else if (tel) {
        // CAS 2 : Inscrit mais pas encore activé -> Demande le PIN
        document.getElementById('license-gate').style.display = 'flex';
        // Affiche l'ID appareil automatiquement
        const displayElem = document.getElementById('display-device-id');
        if(displayElem) displayElem.innerText = getDeviceId();
    } 
    else {
        // CAS 3 : Premier lancement -> Formulaire de Profil
        document.getElementById('registration-gate').style.display = 'flex';
    }
}

// Lancement automatique au démarrage
window.onload = verifierEtatInitial;

// ==========================================
// 1. INSCRIPTION (INITIALISATION SÉCURISÉE)
// ==========================================
async function enregistrerProfil() {
    const nom = document.getElementById('reg-nom').value.trim();
    const tel = document.getElementById('reg-tel').value.trim().replace(/\D/g,'');
    
    if(!nom || tel.length < 8) return alert("⚠️ Veuillez remplir tous les champs correctement.");

    try {
        // 🔍 VERIFICATION : On vérifie si le numéro existe déjà
        const check = await database.ref('clients/' + tel + '/infos_client').once('value');
        
        if (check.exists()) {
            const data = check.val();
            // Sécurité : Si l'un des verrous est sur 'banni' ou 'suspendu'
            if (data.etat_acces === "banni" || data.statut === "suspendu") {
                return alert("🚫 Ce numéro est définitivement banni de notre système.");
            }
            return alert("💡 Ce compte existe déjà. Utilisez 'Récupérer mon compte' en bas de l'écran.");
        }

        const maintenant = new Date();

        // 📝 CRÉATION DU PROFIL HARMONISÉ
        await database.ref('clients/' + tel + '/infos_client').set({
            nom: nom,
            tel: tel,
            categorie: "C", 
            
            // --- ÉTATS D'ACCÈS (Triple Verrou Actif) ---
            etat_acces: "actif",           
            statut: "actif",      // Pour la lecture par loadUsers
            acces: "actif",       
            statut_paiement: "VALIDE",    
            
            // --- SYSTÈME DE RÉCUPÉRATION (Binaire) ---
            recup_effectuee: 0,   // 0 = Crédit disponible pour le mois
            
            // --- TRACABILITÉ & SÉCURITÉ ---
            date_inscription: maintenant.toISOString(),
            device_id: typeof getDeviceId === 'function' ? getDeviceId() : "unknown",
            dernier_token: "init_" + Math.random().toString(36).substr(2, 9) 
        });

        // ✅ SAUVEGARDE LOCALE 
        localStorage.setItem('user_tel_id', tel);
        localStorage.setItem('v32_active', 'true'); 

        alert("✅ Inscription réussie ! Bienvenue dans votre programme.");
        
        // 🚀 LANCEMENT DE L'APP
        if (typeof launchApp === 'function') {
            launchApp(); 
        } else {
            naviguer('hub-accueil'); 
        }

    } catch(e) {
        console.error("Erreur Inscription:", e);
        alert("❌ Erreur de communication avec la base de données.");
    }
}
// ==========================================
// 6. SUPPRESSION & LISTE NOIRE (BAN DÉFINITIF)
// ==========================================
async function deleteClient(id) {
    const message = "❗ SUPPRESSION DÉFINITIVE :\n\nL'élève sera expulsé immédiatement et ne pourra plus jamais se réinscrire avec ce numéro.\n\nConfirmer l'expulsion ?";
    
    if(confirm(message)) {
        try {
            // --- HARMONISATION TOTALE DES CLÉS ---
            // On sature toutes les clés pour qu'aucune fonction ne laisse passer l'élève.
            await database.ref(`clients/${id}/infos_client`).update({
                etat_acces: "banni",      // Bloque la récupération (recupererCompte)
                statut: "suspendu",       // Affiche le cercle ROUGE (loadUsers)
                acces: "suspendu",        // Sécurité supplémentaire
                statut_paiement: "EXPIRE", // Coupe l'accès au contenu
                motif_suspension: "COMPTE SUPPRIMÉ DÉFINITIVEMENT"
            });

            // Note stratégique : On ne fait PAS .remove() sur le dossier complet.
            // En gardant ces clés "banni", le numéro reste en Liste Noire.
            // Si l'élève tente de se réinscrire, enregistrerProfil() verra qu'il est banni.

            alert("✅ Client expulsé et placé en Liste Noire.");
            
            // Rafraîchissement automatique de la liste Admin
            if (typeof loadUsers === 'function') {
                loadUsers();
            }

        } catch (e) {
            console.error("Erreur deleteClient:", e);
            alert("❌ Erreur de communication avec la base de données.");
        }
    }
}
// ==========================================
// 5. LE VERROU ADMIN (SUSPENDRE / RÉACTIVER)
// ==========================================
async function toggleBan(id, filtreActuel) {
    try {
        // 1. On vérifie l'état actuel de l'accès
        const snap = await database.ref(`clients/${id}/infos_client/etat_acces`).once('value');
        const estActuelActif = (snap.val() === "actif");
        
        // --- LOGIQUE D'HARMONISATION ---
        // Si on suspend : 
        // - etat_acces -> "banni" (pour bloquer la récupération technique)
        // - statut -> "suspendu" (pour que loadUsers affiche le cercle ROUGE)
        const nouvelEtatTechnique = estActuelActif ? "banni" : "actif"; 
        const nouvelEtatAffichage = estActuelActif ? "suspendu" : "actif";

        const messageConfirm = estActuelActif 
            ? `🚫 BLOQUER CET ÉLÈVE ?\n\nL'accès sera coupé immédiatement et le cercle deviendra ROUGE.` 
            : `✅ RÉACTIVER CET ÉLÈVE ?\n\nL'accès sera rétabli et le cercle redeviendra VERT.`;

        if(confirm(messageConfirm)) {
            // 2. MISE À JOUR SYNCHRONISÉE DES 3 CLÉS CRITIQUES
            await database.ref(`clients/${id}/infos_client`).update({
                "etat_acces": nouvelEtatTechnique, 
                "statut": nouvelEtatAffichage,    // Lu par loadUsers (const isBanned = data.statut === "suspendu")
                "acces": nouvelEtatAffichage,     // Sécurité supplémentaire
                "motif_suspension": estActuelActif ? "SUSPENSION ADMINISTRATIVE" : ""
            });
             
            // 3. AFFICHAGE DU RÉSULTAT
            const alerteVisuelle = estActuelActif 
                ? "🚫 ACCÈS RÉVOQUÉ\nL'élève est maintenant bloqué."
                : "✅ ACCÈS RÉTABLI\nL'élève peut à nouveau se connecter.";
            
            alert(alerteVisuelle);
            
            // 4. RAFRAÎCHISSEMENT DE TA LISTE ADMIN
            if (typeof loadUsers === 'function') {
                loadUsers(filtreActuel);
            }
        }
    } catch (e) {
        console.error("Erreur toggleBan:", e);
        alert("❌ Erreur technique lors de la modification.");
    }
}

// ==========================================
// VALIDATION PAIEMENT (RÉINITIALISATION TOTALE)
// ==========================================
async function validerPaiementFinal(id) {
    const confirmation = confirm("✅ CONFIRMER LE PAIEMENT ?\n\n- L'élève repart pour 35 JOURS.\n- Son JOKER de récupération sera remis à 0.");
    
    if (confirmation) {
        try {
            // --- HARMONISATION ET RÉACTIVATION ---
            await database.ref(`clients/${id}/infos_client`).update({
                // 1. Accès financier et visuel
                statut_paiement: "VALIDE",   // Débloque le contenu
                statut: "actif",             // Cercle VERT en Admin
                acces: "actif",              // Synchronisation sécurité
                
                // 2. Porte principale technique
                etat_acces: "actif",         // Permet la connexion
                
                // 3. LA RÈGLE D'OR (Le Joker)
                recup_effectuee: 0,          // REVIENT À 0 : On redonne 1 chance de secours
                
                // 4. LE COMPTEUR DE TEMPS
                date_inscription: new Date().toISOString(), // Le chronomètre des 35 jours repart à zéro
                
                // 5. Nettoyage
                motif_suspension: ""         // Efface les traces d'un ancien bannissement
            });

            alert("💰 PAIEMENT ENREGISTRÉ !\n\nL'élève a été réactivé avec succès pour 35 jours.");
            
            // Rafraîchissement des interfaces admin
            if (typeof loadUsers === "function") loadUsers('TOUT');
            if (typeof chargerContenuHistorique === "function") chargerContenuHistorique();

        } catch (e) {
            console.error("Erreur validation paiement:", e);
            alert("❌ Erreur de communication avec Firebase.");
        }
    }
}

function surveillerStatutEnDirect(tel) {
    if (!tel) {
        // Si pas de numéro, on s'assure que l'accès est coupé
        localStorage.removeItem('v32_active');
        return;
    }

    // On écoute en temps réel le dossier 'infos_client'
    database.ref('clients/' + tel + '/infos_client').on('value', (snapshot) => {
        if (!snapshot.exists()) {
            alert("⚠️ Compte introuvable ou supprimé.");
            localStorage.clear();
            location.reload();
            return;
        }

        const data = snapshot.val();
        const monTokenLocal = localStorage.getItem('session_token');

        // 1. VÉRIFICATION DISCIPLINE (Banni ou Suspendu)
        // On vérifie 'etat_acces' car c'est notre nouveau standard
        if (data.etat_acces === "banni" || data.etat_acces === "suspendu") {
            const motif = data.motif_suspension || "Violation des conditions d'utilisation";
            alert(`🚫 ACCÈS RÉVOQUÉ\n\nMotif : ${motif}`);
            
            localStorage.clear(); // On vide tout pour qu'il ne puisse pas contourner
            document.body.innerHTML = ""; // On efface l'application de l'écran
            location.reload(); 
            return;
        }

        // 2. VÉRIFICATION DOUBLE CONNEXION (Jeton unique)
        if (data.dernier_token && monTokenLocal && data.dernier_token !== monTokenLocal) {
            alert("⚠️ SESSION COUPÉE : Ce compte est utilisé sur un autre appareil.");
            localStorage.clear();
            location.reload();
            return;
        }
    });
}



async function modifierStatutAdmin(id) {
    // 1. Liste des seuls mots-clés autorisés (Notre standard)
    const optionsDiscipline = ["actif", "suspendu", "banni"];
    const optionsPaiement = ["VALIDE", "expire", "NON"];

    // 2. Demande à l'admin (avec validation stricte)
    let nouvelEtat = prompt("Choisir l'état : actif, suspendu, ou banni").toLowerCase().trim();
    
    // Si l'admin tape n'importe quoi, on arrête tout !
    if (!optionsDiscipline.includes(nouvelEtat)) {
        return alert("❌ ERREUR : Vous devez taper 'actif', 'suspendu' ou 'banni'.");
    }

    let nouveauPaiement = prompt("Choisir le paiement : VALIDE, expire, ou NON").toUpperCase().trim();
    if (!optionsPaiement.includes(nouveauPaiement)) {
        return alert("❌ ERREUR : Vous devez taper 'VALIDE', 'expire' ou 'NON'.");
    }

    try {
        await database.ref(`clients/${id}/infos_client`).update({
            etat_acces: nouvelEtat,
            statut: nouvelEtat, // On synchronise toujours l'ancien champ
            statut_paiement: nouveauPaiement
        });
        alert("✅ Base de données mise à jour proprement !");
    } catch (e) {
        alert("Erreur réseau.");
    }
}


async function mettreAJourAnciensClients() {
    try {
        const snapshot = await database.ref('clients').once('value');
        if (!snapshot.exists()) return alert("Aucun client trouvé.");

        let count = 0;
        snapshot.forEach(child => {
            // On cible précisément 'infos_client' pour chaque enfant
            database.ref(`clients/${child.key}/infos_client`).update({
                statut_paiement: "VALIDE",
                etat_acces: "actif"
            });
            count++;
        });

        alert(`✅ Succès ! ${count} clients ont été mis à jour avec les nouveaux statuts.`);
    } catch (e) {
        alert("❌ Erreur lors de la migration : " + e.message);
    }
}

// ==========================================
// MAINTENANCE STRICTE (AUCUN CADEAU AUX JOKERS)
// ==========================================
async function maintenanceAbonnementsEtQuotas() {
    const confirmation = confirm("⚙️ LANCER LA PURGE DES 35 JOURS ?\n\nNote : Les jokers ne seront PAS réinitialisés pour les élèves en cours d'abonnement.");
    
    if (!confirmation) return;

    try {
        const usersSnap = await database.ref('clients').once('value');
        const maintenant = new Date();
        const updates = {};
        let expires = 0;

        usersSnap.forEach(user => {
            const data = user.val().infos_client;
            if (!data || !data.date_inscription) return;

            const tel = user.key;
            const dateInsc = new Date(data.date_inscription);
            const differenceEnMs = maintenant - dateInsc;
            const joursEcoules = Math.floor(differenceEnMs / (1000 * 60 * 60 * 24));

            // ON NE S'OCCUPE QUE DE FERMER LES COMPTES EXPIRÉS
            if (joursEcoules > 35 && data.statut_paiement === "VALIDE") {
                updates[`clients/${tel}/infos_client/statut_paiement`] = "EXPIRE";
                updates[`clients/${tel}/infos_client/statut`] = "suspendu"; 
                expires++;
            }
            
            // NOTE : On ne touche PAS au champ 'recup_effectuee' ici !
            // L'élève à 10 jours reste avec son 1.
        });

        await database.ref().update(updates);
        alert(`✅ MAINTENANCE TERMINÉE :\n\n• ${expires} abonnements expiré(s) bloqué(s).\n• Aucun joker n'a été réinitialisé par erreur.`);
        
        if (typeof loadUsers === 'function') loadUsers();

    } catch (e) {
        console.error("Erreur Maintenance:", e);
    }
}
// --- SYSTÈME DE SÉCURITÉ SOLIDE V1 ---OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOXXXXXXXXXXXX
// --- SYSTÈME DE SÉCURITÉ SOLIDE V1 ---OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO00XXXXXXXXXXXXX
// --- SYSTÈME DE SÉCURITÉ SOLIDE V1 ---OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO0000XXXXXXXXXXXXX
// --- SYSTÈME DE SÉCURITÉ SOLIDE V1 ---OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOXXXXXXXXXXXXX
// --- SYSTÈME DE SÉCURITÉ SOLIDE V1 ---000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000XXXXXXXXXXXXX

// ==========================================
// 1. IDENTIFIANT APPAREIL UNIQUE (AMÉLIORÉ)
// ==========================================
function getDeviceId() {
    let id = localStorage.getItem('diouf_device_id');
    if(!id) {
        // On combine un préfixe, une partie aléatoire et l'heure actuelle en base 36
        // Cela garantit une unicité quasi-totale
        const randomPart = Math.random().toString(36).substr(2, 4).toUpperCase();
        const timePart = Date.now().toString(36).substr(-4).toUpperCase();
        
        id = `D-${randomPart}${timePart}`; 
        localStorage.setItem('diouf_device_id', id);
    }
    return id;
}

// ==========================================
// 2. LOGIQUE D'ACTIVATION (DÉBLOQUÉE)
// ==========================================
async function verifierLicence() {
    const inputSaisi = document.getElementById('input-license').value.trim();
    const device = getDeviceId(); 
    const tel = localStorage.getItem('user_tel_id');

    if (!tel) return alert("❌ Erreur : Aucun numéro de téléphone trouvé. Veuillez vous réinscrire.");

    // --- CALCUL DU PIN (Identique à ton Keygen) ---
    let hash = 0;
    for (let i = 0; i < device.length; i++) {
        hash = ((hash << 5) - hash) + device.charCodeAt(i);
        hash |= 0;
    }
    const codeAttendu = Math.abs(hash + SECRET_KEY).toString().substring(0, 8);
    
    // --- VÉRIFICATION ---
    if(inputSaisi !== codeAttendu) {
        return alert("❌ PIN INCORRECT.\n\nCet ID : " + device + "\nNécessite un autre code.");
    }

    try {
        const snap = await database.ref(`clients/${tel}/infos_client`).once('value');
        if (!snap.exists()) return alert("❌ Numéro inconnu sur le serveur.");

        const data = snap.val();
        if (data.etat_acces === "banni" || data.etat_acces === "suspendu") {
            return alert("🚫 Accès refusé par l'administration.");
        }

        // ✅ VALIDATION FINALE
        localStorage.setItem('v32_active', 'true');
        alert("✅ Licence validée !");
        naviguer('hub-accueil');

    } catch (e) {
        alert("❌ Erreur réseau.");
    }
}

// ==========================================
// 4. RÉCUPÉRATION (SYSTÈME BINAIRE 0/1 & VERROU TOTAL)
// ==========================================
async function recupererCompte() {
    const saisie = prompt("📱 Entrez votre numéro de téléphone pour restaurer votre accès :");
    if (!saisie) return;
    const tel = saisie.trim().replace(/\D/g,'');

    try {
        const snap = await database.ref(`clients/${tel}/infos_client`).once('value');
        if (!snap.exists()) return alert("❌ Aucun compte trouvé pour ce numéro.");

        const data = snap.val();

        // --- 1. SÉCURITÉ : VÉRIFICATION DU BLOCAGE (HARMONISATION ADMIN) ---
        // On bloque si 'banni' OU si 'suspendu' pour être en phase avec loadUsers
        if (data.etat_acces === "banni" || data.statut === "suspendu") {
            return alert(
                "🚫  ACCÈS BLOQUÉ  🚫\n" +
                "_______________________\n\n" +
                "      ( X )  SUSPENDU\n" +
                "_______________________\n\n" +
                "Votre compte a été désactivé par l'administrateur.\n" +
                "Contactez-nous pour régulariser votre situation."
            );
        }

        // --- 2. VÉRIFICATION DU CRÉDIT DE RÉCUPÉRATION (SYSTÈME 0/1) ---
        if (data.recup_effectuee === 1) {
            return alert(
                "⚠️ RÉCUPÉRATION IMPOSSIBLE\n\n" +
                "Vous avez déjà utilisé votre droit de récupération ce mois-ci.\n\n" +
                "Pour des raisons de sécurité, une seule restauration est autorisée. " +
                "Veuillez contacter l'administrateur."
            );
        }

        // --- 3. MISE À JOUR FIREBASE (ON GRILLE LE JOKER) ---
        const nouvelId = typeof getDeviceId === 'function' ? getDeviceId() : "ID_UNK";
        
        await database.ref(`clients/${tel}/infos_client`).update({
            device_id: nouvelId,
            recup_effectuee: 1, // On passe à 1 : le joker est consommé !
            derniere_recup_date: new Date().toISOString()
        });

        // --- 4. RESTAURATION DU CACHE LOCAL ---
        localStorage.setItem('user_tel_id', tel);
        localStorage.setItem('diouf_device_id', nouvelId);

        // --- 5. REDIRECTION ET MESSAGE DE SUCCÈS ---
        if (data.statut_paiement === "VALIDE") {
            localStorage.setItem('v32_active', 'true');
            alert(`✅ Content de vous revoir ${data.nom} !\n\nVotre accès est restauré.\n(Attention : C'était votre seule récupération autorisée).`);
            naviguer('hub-accueil');
        } else {
            alert("✅ Identité retrouvée !\n\nEntrez maintenant votre code PIN pour activer définitivement l'application.");
            naviguer('license-gate');
        }

    } catch (e) { 
        console.error("Erreur critique Récupération:", e);
        alert("❌ Erreur de connexion au serveur. Vérifiez votre connexion internet."); 
    }
}
// ==========================================
// 3. LANCEMENT (LE CHEF D'ORCHESTRE SÉCURISÉ)
// ==========================================
async function launchApp() {
    const tel = localStorage.getItem('user_tel_id');
    const v32 = localStorage.getItem('v32_active');

    // --- ÉTAPE 1 : LA BARRIÈRE TECHNIQUE (LE PIN) ---
    if (v32 !== 'true') {
        const displayElem = document.getElementById('display-device-id');
        if (displayElem && typeof getDeviceId === 'function') {
            displayElem.innerText = getDeviceId();
        }
        return naviguer('license-gate'); 
    }

    // --- ÉTAPE 2 : LA BARRIÈRE IDENTITÉ (LE PROFIL) ---
    if (!tel) {
        return naviguer('registration-gate');
    }

    // --- ÉTAPE 3 : LA VÉRIFICATION SERVEUR (DÉCISION FINALE) ---
    try {
        const status = await verifierIdentite(); 
        
        console.log("🛡️ Statut Sécurité Appliqué :", status);

        switch(status) {
            case "AUTHORIZED":
                // Accès total
                naviguer('hub-accueil');
                if (typeof surveillerStatutEnDirect === 'function') {
                    surveillerStatutEnDirect(tel); 
                }
                break;

            case "DEVICE_MISMATCH":
                // Sécurité ID Appareil
                alert("📱 APPAREIL NON RECONNU !\n\nVous avez changé de téléphone ou réinstallé l'application.\n\nVeuillez utiliser l'option 'Récupérer mon compte' pour restaurer votre accès.");
                naviguer('license-gate');
                break;

            case "PENDING_PAYMENT":
                alert("⏳ ACCÈS EN ATTENTE\n\nVotre abonnement n'est pas encore validé. Contactez l'administrateur.");
                naviguer('license-gate');
                break;

            case "BANNED":
            case "DELETED":
                // --- LE MESSAGE ATTRACTIF (CERCLE ET BARRES) ---
                alert(
                    "🚫  ACCÈS BLOQUÉ  🚫\n" +
                    "_______________________\n\n" +
                    "      ( X )  SUSPENDU\n" +
                    "_______________________\n\n" +
                    "Votre compte a été désactivé par l'administrateur.\n" +
                    "Contactez-nous pour régulariser votre situation."
                );
                
                // On nettoie le cache pour empêcher toute tentative de contournement
                localStorage.clear();
                naviguer('license-gate');
                break;

            default:
                // Sécurité par défaut
                naviguer('license-gate');
        }
    } catch (e) {
        // Mode secours (Offline) : Tolérance si déjà actif auparavant
        console.warn("🌐 Serveur injoignable, mode secours activé.");
        if (v32 === 'true') {
            naviguer('hub-accueil');
        } else {
            naviguer('license-gate');
        }
    }
}

function synchroniserPresence() {
    const tel = localStorage.getItem('user_tel_id');
    if (!tel) return;

    // Liaison avec le nœud spécial de Firebase qui détecte la connexion internet
    const connectedRef = database.ref('.info/connected');
    
    connectedRef.on('value', (snap) => {
        if (snap.val() === true) {
            // L'élève dit : "Je suis là"
            database.ref('clients/' + tel + '/status').set("en_ligne");
            
            // Liaison automatique de déconnexion (si l'app est fermée)
            database.ref('clients/' + tel + '/status').onDisconnect().set("hors_ligne");
        }
    });
}

function afficherEcranBloque() {
    document.body.innerHTML = `
        <div style="height:100vh; background:#000; color:white; display:flex; flex-direction:column; align-items:center; justify-content:center; text-align:center; font-family:sans-serif; padding:20px;">
            <h1 style="font-size:5rem;">🚫</h1>
            <h2 style="color:#e67e22; letter-spacing:2px;">ACCÈS SUSPENDU</h2>
            <p style="max-width:400px; line-height:1.6; color:#bbb;">Votre compte a été désactivé par l'administration. Veuillez régulariser votre situation pour retrouver vos cours.</p>
            <button onclick="location.reload()" style="margin-top:20px; padding:12px 30px; border-radius:50px; border:none; background:#333; color:white; cursor:pointer;">Actualiser</button>
        </div>
    `;
}
// --- SYSTÈME DE SÉCURITÉ SOLIDE V1 ---
// --- SYSTÈME DE SÉCURITÉ SOLIDE V1 ---
// --- SYSTÈME DE SÉCURITÉ SOLIDE V1 ---
// --- SYSTÈME DE SÉCURITÉ SOLIDE V1 ---

function togglePreview() {
    const content = document.getElementById('preview-content');
    content.style.display = (content.style.display === "block") ? "none" : "block";
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


// 2. WHATSAPP : Message automatique
function envoyerRappel(tel, nom, cat) {
    const msg = `Bonjour ${nom}, votre abonnement (Catégorie ${cat}) arrive à échéance. Merci de régulariser votre situation.`;
    const url = `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
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
    
    let nbAttendu = 0;    
    let totalArgent = 0;  
    let nbRetards = 0;    

    try {
        const tarifsSnap = await database.ref('reglages/tarifs').once('value');
        const tarifs = tarifsSnap.val() || { A: 10000, B: 7000, C: 4000 };

        const usersSnap = await database.ref('clients').once('value');
        list.innerHTML = ""; 

        usersSnap.forEach(u => {
            const val = u.val();
            if (!val || !val.infos_client) return;
            
            const data = val.infos_client;
            const tel = u.key;
            const cat = (data.categorie || "C").trim().toUpperCase();

            // --- 1. GESTION DU FILTRE ---
            // Si le filtre n'est pas "TOUT" et qu'il ne correspond pas à la catégorie, on passe au suivant
            if (filtre !== 'TOUT' && cat !== filtre) return;

            const joker = data.recup_effectuee || 0; 
            const jours = calculerJours(data.date_inscription);
            const prix = parseInt(tarifs[cat]) || 0;

            // --- 2. LOGIQUE DE STATUT ---
            const estBanniDefinitif = data.etat_acces === "banni"; 
            const estSuspenduOuExpire = (data.statut === "suspendu" || jours >= 35) && !estBanniDefinitif;

            // Le dashboard ne compte que les gens non-bannis affichés par le filtre
            if (!estBanniDefinitif) {
                nbAttendu++;
                totalArgent += prix;
                if (jours >= 35) nbRetards++;
            }

            // --- 3. DESIGN DYNAMIQUE ---
            let borderCol = "#2ecc71"; // Vert
            let bgCard = "#111";       
            let labelStatut = "";
            let btnBanIcon = "🚫";
            let btnBanCol = "#333";

            if (estBanniDefinitif) {
                borderCol = "#e74c3c"; // Rouge
                bgCard = "#1a0505";    
                labelStatut = '<span style="color:#e74c3c; font-size:0.7rem; font-weight:900;">💀 COMPTE BANNI</span>';
                btnBanIcon = "💀";
                btnBanCol = "#e74c3c";
            } else if (estSuspenduOuExpire) {
                borderCol = "#f1c40f"; // Jaune
                bgCard = "#1a1805";    
                labelStatut = `<span style="color:#f1c40f; font-size:0.7rem; font-weight:900;">🔒 ${jours >= 35 ? 'ABONNEMENT EXPIRÉ' : 'SUSPENDU'}</span>`;
                btnBanIcon = "🔓";
                btnBanCol = "#f1c40f";
            }

            let circleCol = (jours >= 35) ? "#e74c3c" : (jours >= 26 ? "#f1c40f" : "#2ecc71");

            // --- 4. GÉNÉRATION DU HTML ---
            list.innerHTML += `
                <div class="user-card" style="background:${bgCard}; margin-bottom:12px; padding:15px; border-radius:12px; border-left:7px solid ${borderCol}; border-bottom:1px solid #333; transition: 0.3s;">
                    <div style="display:flex; justify-content:space-between; align-items:center;">
                        
                        <div style="flex:1;">
                            <div style="display:flex; align-items:center; gap:10px;">
                                <b style="font-size:0.9rem; color:white; white-space:nowrap;">${data.nom.toUpperCase()}</b>
                                <div style="width:9px; height:9px; border-radius:50%; background-color:${val.status === 'en_ligne' ? '#2ecc71' : '#555'}; box-shadow:${val.status === 'en_ligne' ? '0 0 10px #2ecc71' : 'none'}; flex-shrink:0;"></div>
                                <span style="font-size:0.6rem; background:#222; color:#f1c40f; border:1px solid #444; padding:2px 6px; border-radius:4px; font-weight:bold;">${cat}</span>
                            </div>
                            <div style="font-size:0.75rem; color:gray; margin-top:3px;">📞 ${tel}</div>
                            <div style="margin-top:5px;">${labelStatut}</div>
                        </div>

                        <div style="margin: 0 10px; text-align:center; min-width:60px;">
                            <div style="font-size:0.85rem; color:${joker === 0 ? '#2ecc71' : '#e74c3c'};">
                                ${joker === 0 ? '🛡️ Libre' : '🔓 Grillé'}
                            </div>
                            <small style="font-size:0.55rem; color:gray; display:block;">JOKER: ${joker}</small>
                        </div>

                        <div style="margin: 0 15px; text-align:center;">
                            <div style="width:38px; height:38px; border-radius:50%; border:2px solid ${circleCol}; display:flex; align-items:center; justify-content:center; font-size:0.75rem; font-weight:900; color:white;">
                                ${jours}
                            </div>
                            <small style="font-size:0.5rem; color:gray; display:block; margin-top:2px;">JOURS</small>
                        </div>

                        <div style="display:flex; gap:6px; align-items:center;">
                            <button onclick="window.open('https://wa.me/${tel}')" title="WhatsApp" style="background:#25D366; border:none; border-radius:8px; width:34px; height:34px; cursor:pointer; font-size:1.1rem;">🟢</button>
                            <button onclick="validerPaiementFinal('${tel}')" title="Payer" style="background:#2ecc71; border:none; border-radius:8px; width:34px; height:34px; cursor:pointer; font-size:1.1rem;">💰</button>
                       <select onchange="changerCategorie('${tel}', this.value)" style="background:#222; color:white; border:1px solid #444; border-radius:6px; padding:6px; font-size:0.75rem; font-weight:bold; cursor:pointer;">
                                <option value="A" ${cat==='A'?'selected':''}>A</option>
                                <option value="B" ${cat==='B'?'selected':''}>B</option>
                                <option value="C" ${cat==='C'?'selected':''}>C</option>
                            </select>

                            <button onclick="toggleBan('${tel}', '${filtre}')" title="Bloquer/Débloquer" style="background:${btnBanCol}; border:none; border-radius:8px; width:34px; height:34px; cursor:pointer; font-size:1.1rem; transition:0.3s;">
                                ${btnBanIcon}
                            </button>

                            <button onclick="deleteClient('${tel}')" title="Supprimer" style="background:#444; border:none; border-radius:8px; width:34px; height:34px; cursor:pointer; font-size:1.1rem;">🗑️</button>
                        </div>
                    </div>
                </div>`;
        });

        // Mise à jour finale du Dashboard
        const eltNb = document.getElementById('stat-attendu');
        const eltPrix = document.getElementById('stat-estime');
        const eltRetard = document.getElementById('stat-retard');
        if (eltNb) eltNb.innerText = nbAttendu;
        if (eltPrix) eltPrix.innerText = totalArgent.toLocaleString() + " FG";
        if (eltRetard) eltRetard.innerText = nbRetards;

    } catch (e) {
        console.error("Erreur critique loadUsers:", e);
        list.innerHTML = `<p style="color:#e74c3c; text-align:center; padding:20px;">Erreur de connexion</p>`;
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
    const input = document.getElementById('search-historique').value.toUpperCase().trim();
    const lignes = document.querySelectorAll('.ligne-historique');
    let totalFiltre = 0;

    lignes.forEach(ligne => {
        // 1. On récupère tout le texte brut de la ligne (Nom, Tel, Date)
        const texteBrut = ligne.innerText.toUpperCase();
        
        // 2. On récupère spécifiquement le montant et on enlève les espaces et "FG"
        // pour que la recherche sur "1500" fonctionne même si c'est écrit "1 500 FG"
        const cellulePrix = ligne.querySelector('.col-prix');
        const montantPur = cellulePrix ? cellulePrix.innerText.replace(/\s/g, '').replace('FG', '') : "";

        // 3. Vérification : si l'input est dans le texte brut OU dans le montant pur
        if (texteBrut.indexOf(input) > -1 || montantPur.indexOf(input) > -1) {
            ligne.style.display = ""; // On utilise le style par défaut (table-row)
            
            // Recalcul du total visible
            const montantLigne = parseInt(montantPur) || 0;
            totalFiltre += montantLigne;
        } else {
            ligne.style.display = "none";
        }
    });

    // 4. Mise à jour du total en bas de page
    const totalElt = document.getElementById('total-historique');
    if (totalElt) {
        totalElt.innerText = totalFiltre.toLocaleString() + " FG";
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

    // Message d'attente pendant le chargement
    corps.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:20px; color:gray;'>Calcul du bilan financier en cours...</td></tr>";

    try {
        // Récupération simultanée des tarifs et des clients
        const [tarifsSnap, usersSnap] = await Promise.all([
            database.ref('reglages/tarifs').once('value'),
            database.ref('clients').once('value')
        ]);

        // On définit les tarifs de secours si Firebase est vide
        const tarifsSecours = { A: 5000, B: 3000, C: 1500 };
        const tarifsFirebase = tarifsSnap.val() || tarifsSecours;
        
        let html = "";
        let totalGeneral = 0;

        usersSnap.forEach(client => {
            const val = client.val();
            
            // ============================================================
            // 🔒 FILTRE DE SÉCURITÉ : LE GARDIEN DE LA CAISSE
            // On ne laisse passer QUE ceux qui ont "VALIDE" dans statut_paiement
            // ============================================================
            if (val && val.infos_client && val.infos_client.statut_paiement === "VALIDE") {
                
                const info = val.infos_client;
                const cat = (info.categorie || "C").trim().toUpperCase();
                
                // On utilise en priorité les tarifs chargés dans window, sinon Firebase
                const montantReel = parseInt(window['tarif' + cat]) || parseInt(tarifsFirebase[cat]) || 0;
                
                // Formatage de la date (YYYY-MM-DD)
                const dateAffiche = info.date_inscription ? info.date_inscription.split('T')[0] : "---";

                // On ajoute au montant total de la caisse
                totalGeneral += montantReel;

                // On génère la ligne du tableau
                html += `
                    <tr style="border-bottom: 1px solid #222; font-size: 0.85rem;">
                        <td style="padding:12px 10px; color:#888;">${dateAffiche}</td>
                        <td style="padding:12px 10px;">
                            <b style="color:white; display:block;">${info.nom.toUpperCase()}</b>
                            <small style="color:#f1c40f;">OFFRE ${cat}</small>
                        </td>
                        <td style="padding:12px 10px; color:#888;">${client.key}</td>
                        <td style="padding:12px 10px; text-align:right;">
                            <b style="color:#2ecc71;">${montantReel.toLocaleString()}</b> <small style="color:#2ecc71;">FG</small>
                        </td>
                    </tr>`;
            }
        });

        // Affichage final du tableau
        if (totalGeneral === 0) {
            corps.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:40px; color:gray;'>Aucun encaissement validé trouvé.</td></tr>";
        } else {
            corps.innerHTML = html;
        }
        
        // Mise à jour du compteur total en bas de l'écran
        if(totalElt) {
            totalElt.innerText = totalGeneral.toLocaleString() + " FG";
        }

    } catch (e) {
        console.error("Erreur historique:", e);
        corps.innerHTML = "<tr><td colspan='4' style='color:red; text-align:center;'>Erreur de connexion à la base de données.</td></tr>";
    }
}
function exporterCSV() {
    const lignes = document.querySelectorAll('.ligne-historique');
    if (lignes.length === 0) return alert("Rien à exporter !");

    let csv = "\ufeff"; 
    csv += "DATE;NOM CLIENT;CAT;TELEPHONE;MONTANT\n";

    let totalPourCSV = 0;

    lignes.forEach(ligne => {
        if (ligne.style.display !== "none") {
            const cellules = ligne.querySelectorAll('td');
            const date = cellules[0].innerText;
            const nom = cellules[1].innerText.split('\n')[0];
            const cat = cellules[2].innerText.trim();
            const tel = cellules[3].innerText;
            const prixBrut = cellules[4].innerText.replace(/\D/g, '');
            
            totalPourCSV += parseInt(prixBrut) || 0;
            csv += `${date};${nom};${cat};${tel};${prixBrut}\n`;
        }
    });

    // --- AJOUT DE LA LIGNE TOTAL À LA FIN DU CSV ---
    csv += `\n;;;TOTAL ENCAISSÉ;${totalPourCSV} FCFA\n`;

    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `Bilan_Maths5eme_${new Date().toLocaleDateString()}.csv`;
    link.click();
}
function nettoyerChiffre(str) {
    if (!str) return "0";
    // Enlève tout ce qui n'est pas un chiffre (slashs, espaces, lettres)
    return str.toString().replace(/\D/g, '');
}

function exporterPDF() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    
    // Configuration de la police pour éviter les bugs d'encodage
    doc.setFont("helvetica", "bold");
    doc.setFontSize(16);
    doc.text("RAPPORT DE PAIEMENT - MATHS 5EME", 14, 20);
    
    doc.setFont("helvetica", "normal");
    doc.setFontSize(10);
    doc.text(`Genere le : ${new Date().toLocaleString()}`, 14, 28);

    const rows = [];
    const lignes = document.querySelectorAll('.ligne-historique');

    lignes.forEach(ligne => {
        if (ligne.style.display !== "none") {
            const cellules = ligne.querySelectorAll('td');
            
            // NETTOYAGE CHIRURGICAL : 
            // On récupère le texte, on remplace tous les types d'espaces bizarres (\s+) 
            // par un espace normal, et on retire les caractères non-standards.
            const date = cellules[0].innerText.replace(/\s+/g, ' ').trim();
            const nom = cellules[1].innerText.split('\n')[0].replace(/\s+/g, ' ').trim();
            const cat = cellules[2].innerText.replace(/\s+/g, ' ').trim();
            const tel = cellules[3].innerText.replace(/\s+/g, ' ').trim();
            const montant = cellules[4].innerText.replace(/\s+/g, ' ').trim();

            rows.push([date, nom, cat, tel, montant]);
        }
    });

    // Generation du tableau
    doc.autoTable({
        startY: 35,
        head: [['Date', 'Nom Client', 'Cat', 'Telephone', 'Montant']],
        body: rows,
        theme: 'striped',
        headStyles: { fillStyle: [44, 62, 80], textColor: 255 },
        styles: { 
            font: "helvetica", 
            fontSize: 8,
            cellPadding: 3 
        },
        // Cette option force jsPDF à ne pas espacer les lettres bizarrement
        columnStyles: {
            4: { halign: 'right' } // Aligne la colonne Montant à droite
        }
    });

    // AJOUT DU TOTAL EN BAS DU PDF
    const totalElt = document.getElementById('total-historique');
    if (totalElt) {
        // Nettoyage du texte du total pour le PDF
        const totalTexte = totalElt.innerText.replace(/\s+/g, ' ').trim();
        const finalY = doc.lastAutoTable.finalY + 15;
        
        doc.setFontSize(12);
        doc.setFont("helvetica", "bold");
        doc.setTextColor(39, 174, 96); // Vert
        doc.text("TOTAL ENCAISSE : " + totalTexte, 14, finalY);
    }

    doc.save(`Rapport_Maths5eme_${new Date().getTime()}.pdf`);
}
async function sauvegarderPuisVider() {
    // 1. Sécurités
    const check1 = confirm("⚠️ ATTENTION : L'historique va être sauvegardé en Excel puis effacé de la base de données.\n\nContinuer ?");
    if (!check1) return;

    const check2 = prompt("Tapez 'CLOTURE' (en majuscules) pour valider l'opération :");
    if (check2 !== "CLOTURE") {
        alert("Action annulée.");
        return;
    }

    try {
        const lignes = document.querySelectorAll('.ligne-historique');
        
        // 2. ÉTAPE DE SAUVEGARDE (On génère le fichier même s'il y a 0 ligne)
        let csv = "\ufeff"; // BOM pour les accents
        csv += "DATE;NOM CLIENT;CAT;TELEPHONE;MONTANT (FCFA)\n";
        let totalFichier = 0;

        lignes.forEach(ligne => {
            const cellules = ligne.querySelectorAll('td');
            const date = cellules[0].innerText.trim();
            const nom = cellules[1].innerText.split('\n')[0].trim();
            const cat = cellules[2].innerText.trim();
            const tel = cellules[3].innerText.trim();
            const prix = cellules[4].innerText.replace(/\D/g, '');
            
            totalFichier += parseInt(prix) || 0;
            csv += `${date};${nom};${cat};${tel};${prix}\n`;
        });

        csv += `\n;;;TOTAL ENCAISSE;${totalFichier} FCFA\n`;

        // Téléchargement automatique du CSV
        const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement("a");
        link.href = url;
        link.download = `SAUVEGARDE_PAIEMENTS_${new Date().toISOString().split('T')[0]}.csv`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        // 3. ÉTAPE DE VIDAGE (On efface uniquement la date d'inscription)
        const snapshot = await database.ref('clients').once('value');
        if (snapshot.exists()) {
            const updates = {};
            snapshot.forEach(client => {
                // On met à 'null' uniquement la date pour réinitialiser le paiement
                // On NE TOUCHE PAS à la catégorie (info.categorie)
                updates[`clients/${client.key}/infos_client/date_inscription`] = null;
            });

            await database.ref().update(updates);
            alert("✅ Succès ! Le fichier de sauvegarde est téléchargé et l'historique est maintenant vide.");
            
            // Rafraîchir l'écran
            ouvrirHistorique();
        }

    } catch (e) {
        console.error("Erreur clôture:", e);
        alert("Une erreur technique est survenue.");
    }
}
async function ouvrirHistorique() {
    const page = document.getElementById('page-historique');
    const corps = document.getElementById('corps-historique');
    const totalElt = document.getElementById('total-historique');
    
    page.style.display = 'flex'; 
    corps.innerHTML = "<tr><td colspan='5' style='text-align:center; padding:30px; color:gray;'>Analyse du bilan FCFA...</td></tr>";

    try {
        const [tarifsSnap, usersSnap] = await Promise.all([
            database.ref('reglages/tarifs').once('value'),
            database.ref('clients').once('value')
        ]);

        const tarifs = tarifsSnap.val() || { A: 5000, B: 3000, C: 1500 };
        let html = "";
        let sommeTotale = 0;

        usersSnap.forEach(client => {
            const val = client.val();
            if (val && val.infos_client) {
                const info = val.infos_client;
                
                // CONDITION : On n'affiche que si une date de paiement existe
                if (info.date_inscription && info.date_inscription !== "") {
                    
                    const cat = (info.categorie || "C").trim().toUpperCase();
                    
                    // Nettoyage du montant pour le calcul
                    const montantBrut = tarifs[cat] || 0;
                    const montantNumerique = parseInt(montantBrut.toString().replace(/\D/g, '')) || 0;
                    sommeTotale += montantNumerique;

                    // Formatage de la date (AAAA-MM-DD)
                    const datePay = info.date_inscription.split('T')[0];

                    html += `
                        <tr class="ligne-historique" style="border-bottom: 1px solid #222;">
                            <td class="col-date" style="width:18%; padding:12px; color:#888; font-size:0.75rem;">
                                ${datePay}
                            </td>
                            <td class="col-nom" style="width:32%; padding:12px; color:white; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                                <b>${info.nom.toUpperCase()}</b>
                            </td>
                            <td class="col-cat" style="width:10%; text-align:center;">
                                <span style="border:1px solid #f1c40f; color:#f1c40f; padding:2px 5px; border-radius:4px; font-size:0.65rem; font-weight:bold;">
                                    ${cat}
                                </span>
                            </td>
                            <td class="col-tel" style="width:22%; padding:12px; color:#888; font-size:0.75rem;">
                                ${client.key.replace(/\D/g, '')}
                            </td>
                            <td class="col-prix" style="width:18%; padding:12px; text-align:right; font-weight:bold; color:#2ecc71; font-size:0.85rem;">
                                ${montantNumerique.toLocaleString()} FCFA
                            </td>
                        </tr>`;
                }
            }
        });

        corps.innerHTML = html !== "" ? html : "<tr><td colspan='5' style='text-align:center; padding:50px; color:gray;'>Aucun paiement enregistré.</td></tr>";
        
        if(totalElt) {
            totalElt.innerText = sommeTotale.toLocaleString() + " FCFA";
        }

    } catch (e) {
        console.error("Erreur historique:", e);
        corps.innerHTML = "<tr><td colspan='5' style='color:red; text-align:center;'>Erreur de connexion base de données</td></tr>";
    }
}

function filtrerClients() {
    const input = document.getElementById('admin-search');
    if (!input) return;

    const filtre = input.value.toLowerCase().trim();
    
    // On cible les cartes d'utilisateurs que tu génères dans loadUsers
    const cartes = document.querySelectorAll('.user-card');

    cartes.forEach(carte => {
        // On récupère tout le texte (Nom + Téléphone + Catégorie)
        const contenu = carte.innerText.toLowerCase();

        if (contenu.includes(filtre)) {
            carte.style.display = "block"; // On affiche la carte
        } else {
            carte.style.display = "none"; // On cache la carte
        }
    });
}
function initAdminTrigger() {
    const trigger = document.getElementById('admin-trigger');
    if (!trigger) return;

    // --- 1. SÉCURITÉ : ON NETTOIE LES ANCIENS ÉCOUTEURS ---
    // On clone le bouton et on le remplace par son clone. 
    // Cela efface instantanément tous les écouteurs en double.
    const newTrigger = trigger.cloneNode(true);
    trigger.parentNode.replaceChild(newTrigger, trigger);

    const demarrerChrono = (e) => {
        if (e.type === 'touchstart') e.preventDefault(); 
        
        // On s'assure qu'un seul chrono tourne
        clearTimeout(window.minuteurAdmin); 

        window.minuteurAdmin = setTimeout(() => {
            const p = prompt("🔑 CODE ACCÈS ADMIN :");
            
            if (p === "0000") { // Remplace par ton code
                naviguer('page-admin'); 
                loadUsers('TOUT');
            } else if (p !== null) {
                alert("❌ Code incorrect");
            }
        }, 3000); 
    };

    const stopperChrono = () => clearTimeout(window.minuteurAdmin);

    // --- 2. ON REBRANCHE PROPREMENT ---
    newTrigger.addEventListener('touchstart', demarrerChrono);
    newTrigger.addEventListener('mousedown', demarrerChrono);
    newTrigger.addEventListener('touchend', stopperChrono);
    newTrigger.addEventListener('mouseup', stopperChrono);
    newTrigger.addEventListener('mouseleave', stopperChrono);
}
// On l'appelle UNE SEULE FOIS
initAdminTrigger();

// NOUVETE
// NOUVETE
// NOUVETE
// NOUVETE
async function chargerTarifsConfig() {
    try {
        // On récupère la branche 'config_tarifs' dans Firebase
        const snap = await database.ref('admin/config_tarifs').once('value');
        const tarifs = snap.val();

        if (tarifs) {
            // 1. Mise à jour des variables de calcul
            window.tarifA = parseFloat(tarifs.A) || 5000;
            window.tarifB = parseFloat(tarifs.B) || 3000;
            window.tarifC = parseFloat(tarifs.C) || 2000;

            // 2. Mise à jour visuelle des cases (inputs) dans l'interface admin
            const inputA = document.getElementById('input-tarif-a');
            const inputB = document.getElementById('input-tarif-b');
            const inputC = document.getElementById('input-tarif-c');

            if(inputA) inputA.value = window.tarifA;
            if(inputB) inputB.value = window.tarifB;
            if(inputC) inputC.value = window.tarifC;

            console.log("✅ Tarifs réels chargés :", window.tarifA, window.tarifB, window.tarifC);
        }
    } catch (e) {
        console.error("Erreur chargement tarifs:", e);
    }
}
function calculerBilan(stats) {
    // stats.catA, stats.catB sont les nombres d'élèves par catégorie
    const totalFinancier = (stats.catA * window.tarifA) + 
                           (stats.catB * window.tarifB) + 
                           (stats.catC * window.tarifC);
    
    // Affichage dans le tableau de bord
    document.getElementById('montant-total').innerText = totalFinancier + " FCFA";
}


// 1. UNE SEULE FONCTION POUR TOUT CHARGER
async function chargerTarifs() {
    try {
        const snap = await database.ref('reglages/tarifs').once('value');
        if(snap.exists()){
            const t = snap.val();
            
            // Mise à jour des variables globales pour TOUS les calculs
            window.tarifA = parseFloat(t.A) || 0;
            window.tarifB = parseFloat(t.B) || 0;
            window.tarifC = parseFloat(t.C) || 0;

            // Mise à jour des cases dans l'interface (on gère tous les IDs possibles)
            const ids = ['price-A', 'input-tarif-a', 'price-B', 'input-tarif-b', 'price-C', 'input-tarif-c'];
            ids.forEach(id => {
                const el = document.getElementById(id);
                if(el) {
                    // On cherche le tarif correspondant (A, B ou C)
                    const letter = id.slice(-1).toUpperCase(); 
                    el.value = t[letter];
                }
            });
            console.log("💰 Tarifs synchronisés :", {A: window.tarifA, B: window.tarifB, C: window.tarifC});
        }
    } catch (e) {
        console.error("Erreur synchro tarifs:", e);
    }
}

// 2. UNE SEULE FONCTION POUR SAUVEGARDER
async function sauvegarderTarifs() {
    // On essaie de récupérer les valeurs soit de 'price-A' soit de 'input-tarif-a'
    const getVal = (id1, id2) => document.getElementById(id1)?.value || document.getElementById(id2)?.value || 0;

    const tarifs = {
        A: getVal('price-A', 'input-tarif-a'),
        B: getVal('price-B', 'input-tarif-b'),
        C: getVal('price-C', 'input-tarif-c')
    };
    
    await database.ref('reglages/tarifs').set(tarifs);
    alert("✅ Tarifs mis à jour !");
    
    await chargerTarifs(); // On synchronise tout
    if (typeof loadUsers === "function") loadUsers('TOUT'); 
}
// EXEMPLE DE CALCUL DU BILAN
function calculerRecettes(stats) {
    // On multiplie le nombre d'élèves par les tarifs chargés depuis Firebase
    const total = (stats.catA * window.tarifA) + 
                  (stats.catB * window.tarifB) + 
                  (stats.catC * window.tarifC);
                  
    document.getElementById('total-caisse').innerText = total + " FCFA";
}
// C'EST CETTE FONCTION QU'IL FAUT UTILISER POUR LE BOUTON VALIDER (💰)
async function validerPaiementFinal(id) {
    if(confirm("Confirmer le paiement ? Cet élève sera ajouté à l'historique financier.")) {
        try {
            const dateJour = new Date().toISOString();
            
            // On met à jour TOUT d'un coup dans la bonne branche
            await database.ref(`clients/${id}/infos_client`).update({
                statut_paiement: "VALIDE",    // 👈 Indispensable pour l'historique
                date_inscription: dateJour,   // 👈 Pour remettre les jours à zéro
                derniere_maj: firebase.database.ServerValue.TIMESTAMP
            });

            alert("✅ Paiement validé et ajouté au bilan !");
            
            // On rafraîchit tout pour voir le nouveau montant total
            if (typeof loadUsers === "function") loadUsers('TOUT');
            if (typeof chargerContenuHistorique === "function") chargerContenuHistorique();

        } catch (e) {
            console.error(e);
            alert("❌ Erreur lors de la validation du paiement.");
        }
    }
}
// NOUVETE
// NOUVETE
// NOUVETE
// NOUVETE


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


// Cette variable permettra de garder les données en mémoire pour le filtrage rapide
let snapshotClientsActuel = null;

/**
 * ACTIVE LA SURVEILLANCE TEMPS RÉEL
 * À appeler une seule fois au chargement de la page admin
 */
function activerSurveillanceAdmin() {
    console.log("🚀 Initialisation de la surveillance en direct...");

    // 1. On récupère d'abord les tarifs pour les calculs d'argent
    database.ref('reglages/tarifs').once('value').then(tarifsSnap => {
        window.mesTarifs = tarifsSnap.val(); // On les stocke globalement

        // 2. On écoute la branche 'clients' en continu (.on)
        database.ref('clients').on('value', (snapshot) => {
            console.log("⚡ Mise à jour détectée : Un client a changé ou s'est inscrit !");
            
            // On sauvegarde le snapshot pour le réutiliser si on change de filtre
            snapshotClientsActuel = snapshot;

            // On récupère le filtre actuellement sélectionné dans votre menu <select>
            // Assurez-vous que votre menu de filtre a l'id "filtre-categorie"
            const selectElt = document.getElementById('filtre-categorie');
            const filtreChoisi = selectElt ? selectElt.value : 'TOUT';

            // On appelle votre fonction de l'étape 1 pour dessiner la liste
            loadUsers(filtreChoisi); 
        });
    });
}

/**
 * CETTE FONCTION EST POUR VOS FILTRES (A, B, C)
 * À appeler dans le 'onchange' de votre menu de sélection
 */
function rafraichirListeParFiltre() {
    const filtre = document.getElementById('filtre-categorie').value;
    
    // Si on a déjà des données en mémoire, on redessine sans interroger le réseau
    if (snapshotClientsActuel) {
        loadUsers(filtre);
    } else {
        // Sinon on force un rechargement classique
        loadUsers(filtre);
    }
}

// MENU DES 3 TRAITS GAUCHE°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
// MENU DES 3 TRAITS GAUCHE°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
// MENU DES 3 TRAITS GAUCHE°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
/** Ouvre le sommaire (Appelé par les 3 traits du header) */
function openMenu() {
    document.getElementById("side-menu").style.width = "280px";
}

/** Ferme le sommaire */
function closeMenu() {
    document.getElementById("side-menu").style.width = "0";
}

/** Ferme l'overlay de travail pour revenir au menu principal */
function closeWorkOverlay() {
    const overlay = document.getElementById("work-overlay");
    if (overlay) {
        overlay.style.display = "none";
        // On vide le contenu pour libérer de la mémoire
        document.getElementById("overlay-body").innerHTML = "";
    }
}
// ==========================================
// PROGRAMME MATHÉMATIQUES (C11 à C14)
// ==========================================

const programmeMaths = [
    { id: "C11", titre: "Puissance" },
    { id: "C12", titre: "Fractions" },
    { id: "C13", titre: "Nombres décimaux & Opérations" },
    { id: "C14", titre: "Calcul littéral & Équations" }
];

/** GÉNÈRE LE SOMMAIRE DANS LE MENU GAUCHE */
function chargerSommaire() {
    const listeUl = document.getElementById("chapters-list");
    if (!listeUl) return;

    listeUl.innerHTML = ""; // Nettoyage de sécurité

    programmeMaths.forEach(chap => {
        const li = document.createElement("li");
        
        // Style du bouton de chapitre (Harmonisé 2026)
        li.style.padding = "15px";
        li.style.margin = "8px 0";
        li.style.background = "rgba(255,255,255,0.05)";
        li.style.borderRadius = "10px";
        li.style.cursor = "pointer";
        li.style.transition = "0.3s";
        
        // Contenu du bouton
        li.innerHTML = `
            <b style="color:#ffd700; margin-right:10px;">${chap.id}</b> 
            <span style="color:white; text-transform:uppercase; font-size:0.85rem;">${chap.titre}</span>
        `;

        // --- LIAISON DIRECTE AU CLIC ---
        li.onclick = () => ouvrirChapitre(chap.id);

        // Effet de survol
        li.onmouseenter = () => li.style.background = "rgba(255,215,0,0.15)";
        li.onmouseleave = () => li.style.background = "rgba(255,255,255,0.05)";

        listeUl.appendChild(li);
    });
}

/** OUVRE UN CHAPITRE DANS L'OVERLAY */
function ouvrirChapitre(id) {
    const chapitre = programmeMaths.find(c => c.id === id);
    if (!chapitre) return;

    closeMenu(); // On ferme le sommaire

    const overlay = document.getElementById("work-overlay");
    const corps = document.getElementById("overlay-body");

    if (overlay && corps) {
        overlay.style.display = "flex";
        
        // Structure interne de l'overlay (Liaison vers Leçon et Exos)
        corps.innerHTML = `
            <div style="text-align:center; padding-top:40px;">
                <h1 style="color:#ffd700; font-size:1.8rem;">${chapitre.id}</h1>
                <h2 style="color:white; margin-bottom:40px;">${chapitre.titre}</h2>
                
                <div style="display:flex; flex-direction:column; gap:20px; max-width:400px; margin: 0 auto;">
                    <button class="btn-modern-2026" onclick="chargerLecon('${id}')" style="padding:20px; font-weight:bold;">📖 ACCÉDER AU COURS</button>
                    <button class="btn-modern-2026" onclick="chargerExos('${id}')" style="padding:20px; font-weight:bold; background:#2ecc71; color:white;">📝 FAIRE LES EXERCICES</button>
                </div>
            </div>
        `;
    }
}

// MENU DES 3 TRAITS GAUCHE°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
// MENU DES 3 TRAITS GAUCHE°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
// MENU DES 3 TRAITS GAUCHE°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°



// --- GESTION DU THÈME (COULEURS)°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
// --- GESTION DU THÈME (COULEURS)°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
// --- GESTION DU THÈME (COULEURS)°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
// --- GESTION DU THÈME (COULEURS)°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
// ==========================================
// GESTION DU MENU DROIT (RÉGLAGES)
// ==========================================
// ==========================================
// 1. NAVIGATION DU MENU DROIT
// ==========================================

function openMenu() { document.getElementById("side-menu").style.width = "280px"; }
function closeMenu() { document.getElementById("side-menu").style.width = "0"; }
function openRightMenu() { document.getElementById("right-menu").style.width = "280px"; }
function closeRightMenu() { document.getElementById("right-menu").style.width = "0"; }


// ==========================================
// 2. ACTIONS DE PERSONNALISATION
// ==========================================

/** Change la couleur de fond de l'application */
function changerTheme(theme) {
    const b = document.body.style;
    
    if (theme === 'noir') { 
        b.background = "#000000"; 
        b.color = "#ffffff"; 
    }
    if (theme === 'blanc') { 
        b.background = "#ffffff"; 
        b.color = "#111111"; 
    }
    if (theme === 'bleu') { 
        b.background = "#0f172a"; // Bleu nuit profond
        b.color = "#ffffff"; 
    }
    
    // Sauvegarde pour que l'élève retrouve son choix à la prochaine connexion
    localStorage.setItem('maths5_theme', theme);
}

/** Change la couleur du texte des boutons de l'interface */
function changerCouleurTexte(couleur) {
    // On cible tous les boutons modernes et leurs textes
    const elements = document.querySelectorAll('.btn-modern-2026, .btn-modern-2026 span');
    
    elements.forEach(el => {
        el.style.color = couleur;
    });
    
    // Sauvegarde de la préférence couleur
    localStorage.setItem('maths5_color', couleur);
}
// --- GESTION DU THÈME (COULEURS)°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
// --- GESTION DU THÈME (COULEURS)°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
// --- GESTION DU THÈME (COULEURS)°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
// --- GESTION DU THÈME (COULEURS)°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°


// CONSTRUCTIO GEOMETRIQUE°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
//  CONSTRUCTIO GEOMETRIQUE°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
// CONSTRUCTIO GEOMETRIQUE°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
//  CONSTRUCTIO GEOMETRIQUE°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°




// --- INITIALISATION ---
function ouvrirGeometrie() {
    document.getElementById('geo-container').style.display = 'flex';
    setTimeout(() => {
        canvas = document.getElementById('geoCanvas');
        const area = document.getElementById('canvas-area');
        if (canvas && area) {
            ctx = canvas.getContext('2d');
            canvas.width = area.clientWidth;
            canvas.height = area.clientHeight;

            canvas.onpointerdown = (e) => {
                const rect = canvas.getBoundingClientRect();
                const x = e.clientX - rect.left;
                const y = e.clientY - rect.top;
                handleInput(x, y);
            };
            refreshCanvas();
        }
    }, 400);
}

function fermerGeometrie() { 
    document.getElementById('geo-container').style.display = 'none'; 
}

function setMode(m) {
    mode = m;
    selection = []; // On vide la sélection quand on change d'outil pour débloquer
    document.querySelectorAll('.btn-ui-geo').forEach(b => b.classList.remove('active'));
    if (document.getElementById('btn-' + m)) document.getElementById('btn-' + m).classList.add('active');
    if (document.getElementById('msg-geo')) document.getElementById('msg-geo').innerText = m.toUpperCase();
    refreshCanvas();
}

// --- GESTION DES COULEURS ---
function setCouleur(hex) {
    couleurActive = hex;
    console.log("Couleur active :", hex);
}

// --- LOGIQUE DE CALCUL ---
const milieu = (p1, p2) => ({ x: (p1.x + p2.x) / 2, y: (p1.y + p2.y) / 2 });

function projectionPointSurDroite(P, A, B) {
    const v = { x: B.x - A.x, y: B.y - A.y };
    const u = { x: P.x - A.x, y: P.y - A.y };
    const dot = u.x * v.x + u.y * v.y;
    const lenSq = v.x * v.x + v.y * v.y;
    const param = (lenSq !== 0) ? dot / lenSq : 0;
    return { x: A.x + param * v.x, y: A.y + param * v.y };
}

// --- SYSTÈME DE NOMMAGE ---
function genererNomPoint() {
    const n = points.length;
    return n < 26 ? String.fromCharCode(65 + n) : String.fromCharCode(65 + (n % 26)) + Math.floor(n / 26);
}

// --- ENTRÉE UTILISATEUR (LE CŒUR) ---
function handleInput(x, y) {
    // MODE CRÉATION DE POINT
    if (mode === 'point') {
        points.push({ x: x, y: y, label: genererNomPoint(), color: couleurActive });
        refreshCanvas();
        return;
    }

    // DÉTECTION D'UN POINT EXISTANT
    const pProche = points.find(p => Math.hypot(p.x - x, p.y - y) < 20);
    if (!pProche) return;

    // SÉCURITÉ DOUBLE CLIC
    if (selection.length > 0 && selection[selection.length - 1] === pProche) return;

    // AJOUT À LA SÉLECTION ET ALLUMAGE ROUGE IMMÉDIAT
    selection.push(pProche);
    refreshCanvas(); 

    const nb = selection.length;

    // LOGIQUE 2 POINTS
    const modesAuto2 = ['segment', 'droite', 'cercle', 'milieu', 'mediatrice'];
    if (nb === 2 && modesAuto2.includes(mode)) {
        const [p1, p2] = selection;
        if (mode === 'milieu') {
            points.push({ x: (p1.x + p2.x)/2, y: (p1.y + p2.y)/2, label: genererNomPoint(), color: couleurActive });
        } else if (mode === 'mediatrice') {
            const mx = (p1.x + p2.x) / 2, my = (p1.y + p2.y) / 2;
            const dx = p2.x - p1.x, dy = p2.y - p1.y;
            elements.push({ type: 'mediatrice', p1: {x: mx, y: my}, p2: {x: mx - dy, y: my + dx}, color: couleurActive });
        } else {
            elements.push({ type: mode, p1, p2, color: couleurActive });
        }
        selection = []; // Retour au noir
        refreshCanvas();
        return;
    }

    // LOGIQUE 3 POINTS
    if (nb === 3) {
        const [p1, p2, p3] = selection;
        const dx = p2.x - p1.x, dy = p2.y - p1.y;

        if (dx === 0 && dy === 0) { selection.pop(); return; }

        if (mode === 'parallele' || mode === 'para') {
            elements.push({ type: 'parallele', p1: p3, p2: { x: p3.x + dx, y: p3.y + dy }, color: couleurActive });
        } 
        else if (mode === 'perpendiculaire' || mode === 'perp' || mode === 'hauteur') {
            const isH = (mode === 'hauteur');
            // Pour la hauteur, p1 et p2 forment la base, p3 est le sommet
            const pBase = isH ? projectionPointSurDroite(p3, p1, p2) : { x: p3.x - dy, y: p3.y + dx };
            elements.push({ type: isH ? 'segment' : 'perpendiculaire', p1: p3, p2: pBase, color: couleurActive, isHauteur: isH });
        }
        else if (mode === 'mediane') {
            elements.push({ type: 'segment', p1: p3, p2: milieu(p1, p2), color: couleurActive });
        }
        
        selection = []; // Retour au noir
        refreshCanvas();
    }
}

// --- DESSIN ---
function refreshCanvas() {
    if (!ctx || !canvas) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.fillStyle = "white";
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    elements.forEach(el => {
        ctx.beginPath();
        ctx.strokeStyle = el.color || "#000";
        ctx.lineWidth = 2;
        if (el.isHauteur) ctx.setLineDash([5, 5]);

        if (el.type === 'segment') {
            ctx.moveTo(el.p1.x, el.p1.y);
            ctx.lineTo(el.p2.x, el.p2.y);
        } else {
            const dx = el.p2.x - el.p1.x, dy = el.p2.y - el.p1.y;
            const dist = Math.hypot(dx, dy);
            if (dist > 0) {
                const ux = (dx / dist) * 5000, uy = (dy / dist) * 5000;
                ctx.moveTo(el.p1.x - ux, el.p1.y - uy);
                ctx.lineTo(el.p1.x + ux, el.p1.y + uy);
            }
        }
        ctx.stroke();
        ctx.setLineDash([]);
    });

    points.forEach(p => {
        ctx.beginPath();
        ctx.arc(p.x, p.y, 6, 0, Math.PI * 2);
        const estRouge = selection.some(sel => sel === p);
        ctx.fillStyle = estRouge ? "#ff4757" : (p.color || "#0f172a");
        ctx.fill();
        ctx.fillStyle = "#0f172a";
        ctx.font = "bold 15px Arial";
        ctx.fillText(p.label, p.x + 12, p.y - 12);
    });
}

// --- ACTIONS ---
function undo() {
    if (selection.length > 0) { selection = []; } 
    else if (elements.length > 0) { elements.pop(); } 
    else if (points.length > 0) { points.pop(); }
    refreshCanvas();
}
// CONSTRUCTIO GEOMETRIQUE°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
//  CONSTRUCTIO GEOMETRIQUE°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
// CONSTRUCTIO GEOMETRIQUE°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°
//  CONSTRUCTIO GEOMETRIQUE°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°°

// =========================================================
//  LANCEMENT UNIQUE ET SÉCURISÉ DU SYSTÈME DIOUF 2026
// =========================================================
window.addEventListener('load', async () => {
    console.log("🚀 Initialisation du moteur Maths 5em...");

    // 1. AFFICHAGE IMMÉDIAT DE L'ID
    const devIdDisplay = document.getElementById('display-device-id');
    if (devIdDisplay && typeof getDeviceId === "function") {
        devIdDisplay.innerText = getDeviceId();
    }

    // 2. PRÉPARATION DES OUTILS ADMIN
    if (typeof initAdminTrigger === "function") {
        initAdminTrigger();
    }

    // 3. SYNCHRONISATION DES DONNÉES CRUCIALES (Tarifs)
    if (typeof chargerTarifs === "function") {
        try {
            console.log("📊 Synchronisation des tarifs...");
            await chargerTarifs();
        } catch(e) { console.warn("Tarifs chargés en mode local."); }
    }

    // 4. LE TUNNEL DE SÉCURITÉ (DÉCISION DE LA PAGE)
    if (typeof launchApp === "function") {
        console.log("🔓 Vérification de la licence...");
        await launchApp();
    }

    // 5. ACTIVATION DES SERVICES "BACKGROUND"
    const telLocal = localStorage.getItem('user_tel_id');
    const estActif = localStorage.getItem('v32_active') === 'true';

    if (telLocal && estActif) {
        if (typeof activerSignalEnLigne === "function") activerSignalEnLigne();
        if (typeof surveillerStatutEnDirect === "function") surveillerStatutEnDirect(telLocal);
        if (typeof surveillerConnexion === "function") surveillerConnexion();
    }

    // --- ⬇️ AJOUT DES PARAMÈTRES INTERFACE 2026 ⬇️ ---

    // 6. GÉNÉRATION DU SOMMAIRE
    if (typeof chargerSommaire === "function") {
        chargerSommaire();
    }

    // 7. RESTAURATION DU THÈME PRÉFÉRÉ
    const themeSauve = localStorage.getItem('theme_prefere');
    if (themeSauve && typeof changerTheme === "function") {
        changerTheme(themeSauve);
    }

    // 8. ÉCOUTEUR TECHNIQUE POUR LE TABLEAU DE GÉOMÉTRIE
    // On utilise 'pointerdown' pour gérer à la fois la souris et le tactile (doigt/stylet)
    document.addEventListener('pointerdown', (e) => {
        // Sécurité : On n'agit que si la cible est bien le canvas
        if (e.target.id !== 'geoCanvas') return;
        
        // On récupère la position exacte du canvas sur l'écran
        const r = e.target.getBoundingClientRect(); 
        
        // Calcul des coordonnées relatives au coin haut-gauche du tableau
        const x = e.clientX - r.left;
        const y = e.clientY - r.top;
        
        if (typeof handleInput === "function") {
            handleInput(x, y);
        }
    });
    
    console.log("✅ Système Diouf Maths 5ème prêt (Interface & Géométrie OK).");
});

// --- GESTION DU REDIMENSIONNEMENT & ROTATION ---
// Indispensable pour que les points ne se décalent pas si l'élève tourne son téléphone
window.addEventListener('resize', () => {
    const area = document.getElementById('canvas-area');
    const geoContainer = document.getElementById('geo-container');

    // On ne redimensionne que si l'espace géométrie est actuellement ouvert
    if (geoContainer && geoContainer.style.display === 'flex' && area && canvas) {
        canvas.width = area.clientWidth;
        canvas.height = area.clientHeight;
        
        // On redessine tout immédiatement pour éviter un écran blanc
        if (typeof refreshCanvas === "function") {
            refreshCanvas();
        }
    }
});
