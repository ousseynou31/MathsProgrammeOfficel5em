
// NETTOYAGE : Une seule déclaration globale ultra-compatible
window.adminEnCours = window.adminEnCours || false;
window.minuteurAdmin = window.minuteurAdmin || null;
console.log("🚀 Moteur prêt : adminEnCours =", window.adminEnCours);

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

// --- SYSTÈME DE SÉCURITÉ SOLIDE V1 ---OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOXXXXXXXXXXXX
// --- SYSTÈME DE SÉCURITÉ SOLIDE V1 ---OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO00XXXXXXXXXXXXX
// --- SYSTÈME DE SÉCURITÉ SOLIDE V1 ---OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOO0000XXXXXXXXXXXXX
// --- SYSTÈME DE SÉCURITÉ SOLIDE V1 ---OOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOOXXXXXXXXXXXXX
// --- SYSTÈME DE SÉCURITÉ SOLIDE V1 ---000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000000XXXXXXXXXXXXX

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
async function verifierIdentite() {
    const tel = localStorage.getItem('user_tel_id');
    if (!tel) return "NO_PROFILE";

    try {
        // ON GARDE TON CHEMIN : clients/num_tel/infos_client
        const snap = await db.ref(`clients/${tel}/infos_client`).once('value');
        
        if (!snap.exists()) return "DELETED";

        const user = snap.val();

        // 1. Sécurité maximale : Bannissement
        if (user.etat_acces === "banni") return "BANNED";

        // 2. Suspension temporaire
        if (user.etat_acces === "suspendu") return "SUSPENDED";

        // 3. Vérification du paiement (Accès refusé si pas VALIDE)
        if (user.statut_paiement !== "VALIDE") return "PENDING_PAYMENT";

        // 4. Si tout est OK
        return "AUTHORIZED";

    } catch (e) {
        console.error("Erreur sécurité identité:", e);
        return "ERROR";
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

async function enregistrerProfil() {
    const nom = document.getElementById('reg-nom').value.trim();
    const tel = document.getElementById('reg-tel').value.trim().replace(/\D/g,'');
    
    if(!nom || tel.length < 8) return alert("⚠️ Veuillez remplir tous les champs correctement.");

    try {
        // 🔍 VERIFICATION : On vérifie l'existence
        const check = await database.ref('clients/' + tel + '/infos_client').once('value');
        
        if (check.exists()) {
            const data = check.val();
            if (data.etat_acces === "banni" || data.statut === "banni") {
                return alert("🚫 Ce numéro est définitivement banni.");
            }
            return alert("💡 Ce compte existe déjà. Utilisez 'Récupérer mon compte'.");
        }

        // 📝 CRÉATION : On valide tout immédiatement car le PIN a été vérifié avant
        await database.ref('clients/' + tel + '/infos_client').set({
            nom: nom,
            tel: tel,
            // On peut laisser "C" par défaut, tu changeras sa catégorie dans ton interface Admin plus tard
            categorie: "C", 
            
            // --- HARMONISATION : ACCÈS TOTAL IMMÉDIAT ---
            etat_acces: "actif",           
            statut: "actif",               
            statut_paiement: "VALIDE",    // Changé de "NON" à "VALIDE"
            
            date_inscription: new Date().toISOString(),
            device_id: typeof getDeviceId === 'function' ? getDeviceId() : "unknown",
            dernier_token: "user_" + Math.random().toString(36).substr(2, 9) 
        });

        // ✅ SAUVEGARDE LOCALE 
        localStorage.setItem('user_tel_id', tel);
        localStorage.setItem('v32_active', 'true'); // On mémorise que la licence est OK

        alert("✅ Inscription réussie ! Bienvenue dans votre programme de Mathématiques.");
        
        // 🚀 LANCEMENT DE L'APP
        if (typeof launchApp === 'function') {
            launchApp(); 
        } else {
            naviguer('hub-accueil'); // Redirection de secours
        }

    } catch(e) {
        console.error("Erreur Inscription:", e);
        alert("❌ Erreur de communication avec la base de données.");
    }
}
async function deleteClient(id) {
    if(confirm("❗ SUPPRESSION DÉFINITIVE : L'application du client sera désactivée INSTANTANÉMENT. Confirmer ?")) {
        try {
            // --- HARMONISATION TOTALE DES CLÉS ---
            // On écrase 'etat_acces', 'statut' et 'statut_paiement' 
            // pour ne laisser aucune faille de lecture.
            await database.ref(`clients/${id}/infos_client`).update({
                etat_acces: "banni",      // Notre nouveau verrou discipline
                statut: "banni",           // On synchronise l'ancienne clé pour sécurité
                statut_paiement: "EXPIRE", // On coupe l'accès financier
                motif_suspension: "Compte supprimé par l'administrateur"
            });

            // Note : On ne fait pas database.ref(`clients/${id}`).remove() 
            // pour garder le numéro en "Liste Noire" et empêcher la réinscription.

            alert("✅ Client expulsé et banni définitivement.");
            
            // Si tu as une fonction de rafraîchissement de liste, appelle-la ici
            if (typeof loadUsers === 'function') loadUsers();

        } catch (e) {
            console.error("Erreur deleteClient:", e);
            alert("❌ Erreur de communication avec la base de données.");
        }
    }
}
async function toggleBan(id, filtreActuel) {
    try {
        // 1. On récupère l'état actuel pour savoir si on active ou on suspend
        const snap = await database.ref(`clients/${id}/infos_client/etat_acces`).once('value');
        const estActuelActif = snap.val() === "actif";
        
        const nouvelEtat = estActuelActif ? "suspendu" : "actif";
        const messageConfirm = estActuelActif 
            ? `Voulez-vous SUSPENDRE cet accès ?\n(L'élève sera éjecté immédiatement)` 
            : `Voulez-vous RÉACTIVER cet accès ?`;

        if(confirm(messageConfirm)) {
            // 2. MISE À JOUR HARMONISÉE
            await database.ref(`clients/${id}/infos_client`).update({
                "etat_acces": nouvelEtat,
                "statut": nouvelEtat, // On synchronise l'ancien champ pour éviter les conflits
                "motif_suspension": nouvelEtat === "suspendu" ? "Action administrative" : ""
            });
             
            alert(`📱 Accès ${nouvelEtat === "actif" ? "réactivé" : "coupé"}.`);
            
            // 3. Rafraîchissement de la liste (ton ancienne logique)
            if (typeof loadUsers === 'function') loadUsers(filtreActuel);
        }
    } catch (e) {
        console.error("Erreur toggleBan:", e);
        alert("❌ Erreur de modification d'accès.");
    }
}

async function validerPaiementFinal(id) {
    if(confirm("✅ Confirmer le paiement ? Cet élève sera ajouté au bilan financier.")) {
        try {
            // --- HARMONISATION ET NETTOYAGE ---
            // On force les valeurs exactes pour que le 'Radar de Sécurité' 
            // ne voie plus de conflit entre 'statut' et 'etat_acces'.
            await database.ref(`clients/${id}/infos_client`).update({
                statut_paiement: "VALIDE",   // Débloque l'accès financier
                etat_acces: "actif",         // Débloque la porte principale
                statut: "actif",             // NETTOYAGE : On écrase l'ancien champ pour éviter les fuites
                motif_suspension: "",        // On efface d'éventuels anciens motifs de blocage
                date_inscription: new Date().toISOString() 
            });

            alert("💰 Paiement validé ! L'élève est désormais ACTIF.");
            
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
// 3. RÉCUPÉRATION (RÉPARE L'ID QUI CHANGE)
// ==========================================
async function recupererCompte() {
    const saisie = prompt("📱 Entrez votre numéro de téléphone pour restaurer votre accès :");
    if (!saisie) return;
    const tel = saisie.trim().replace(/\D/g,'');

    try {
        const snap = await database.ref(`clients/${tel}/infos_client`).once('value');
        if (!snap.exists()) return alert("❌ Aucun compte trouvé pour ce numéro.");

        const data = snap.val();

        if (data.device_id) {
            // 1. On restaure l'identité technique
            localStorage.setItem('diouf_device_id', data.device_id); 
            localStorage.setItem('user_tel_id', tel);
            
            // 2. Vérification du statut de paiement
            if (data.statut_paiement === "VALIDE" || data.etat_acces === "actif") {
                // S'il est déjà en règle, on lui évite le PIN
                localStorage.setItem('v32_active', 'true');
                alert(`✅ Content de vous revoir ${data.nom} !\nAccès restauré avec succès.`);
                naviguer('hub-accueil');
            } else {
                // S'il n'avait pas fini son activation, on le renvoie au PIN
                alert("✅ Identité restaurée !\nEntrez maintenant votre code PIN pour activer l'application.");
                naviguer('license-gate');
            }
        } else {
            alert("⚠️ Ce compte n'a pas d'ID de sécurité enregistré.");
        }
    } catch (e) { 
        console.error(e);
        alert("❌ Erreur de connexion au serveur."); 
    }
}
// ==========================================
// 4. LANCEMENT (LE CHEF D'ORCHESTRE)
// ==========================================
async function launchApp() {
    const tel = localStorage.getItem('user_tel_id');
    const v32 = localStorage.getItem('v32_active');

    // 1. Si rien dans le cache -> Direction Inscription
    if (!tel) {
        return naviguer('registration-gate');
    }

    // 2. Si inscrit mais pas de PIN validé localement
    if (v32 !== 'true') {
        const displayElem = document.getElementById('display-device-id');
        if(displayElem) displayElem.innerText = getDeviceId();
        return naviguer('license-gate');
    }

    // 3. Si tout semble OK, on vérifie quand même Firebase (le radar)
    const status = await verifierIdentite();
    if (status === "AUTHORIZED") {
        naviguer('hub-accueil');
        surveillerStatutEnDirect(tel); // On lance la surveillance temps réel
    } else if (status === "PENDING_PAYMENT") {
        naviguer('license-gate');
    } else {
        localStorage.clear();
        naviguer('registration-gate');
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
    
    // Variables pour le récapitulatif du dashboard
    let nbAttendu = 0;    
    let totalArgent = 0;  
    let nbRetards = 0;    

    try {
        // Récupération des tarifs configurés
        const tarifsSnap = await database.ref('reglages/tarifs').once('value');
        const tarifs = tarifsSnap.val() || { A: 10000, B: 7000, C: 4000 };

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
                            <div style="display:flex; align-items:center; gap:10px;">
    <b style="font-size:0.9rem; color:white; white-space:nowrap;">${data.nom.toUpperCase()}</b>
    
    <div title="${val.status === 'en_ligne' ? 'Connecté' : 'Hors ligne'}" style="
        width: 9px; 
        height: 9px; 
        border-radius: 50%; 
        background-color: ${val.status === 'en_ligne' ? '#2ecc71' : '#555'}; 
        box-shadow: ${val.status === 'en_ligne' ? '0 0 10px #2ecc71' : 'none'};
        flex-shrink: 0;
        transition: all 0.3s ease;
    "></div>

    <span style="font-size:0.6rem; background:#222; color:#f1c40f; border:1px solid #444; padding:2px 6px; border-radius:4px; font-weight:bold;">${cat}</span>
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
                            
                            <button onclick="validerPaiementFinal('${tel}')" title="Payer" style="background:#2ecc71; border:none; border-radius:8px; width:32px; height:32px; cursor:pointer; font-size:1rem;">💰</button>
                            
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

// --- 1. CHARGEMENT DE LA LISTE ---

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
// =========================================================
//  LANCEMENT UNIQUE ET SÉCURISÉ DU SYSTÈME DIOUF 2026
// =========================================================
window.addEventListener('load', async () => {
    console.log("🚀 Initialisation du moteur Maths 5em...");

    // 1. GESTION DE LA CONNEXION ET PRÉSENCE
    if (typeof surveillerConnexion === "function") {
        surveillerConnexion();
    }
    
    const telLocal = localStorage.getItem('user_tel_id');
    if (telLocal) {
        // Active le signal "En ligne" et la surveillance en temps réel
        if (typeof activerSignalEnLigne === "function") activerSignalEnLigne();
        if (typeof surveillerStatutEnDirect === "function") surveillerStatutEnDirect(telLocal);
    }

    // 2. AFFICHAGE DE L'ID APPAREIL (Pour l'écran d'activation)
    const devIdDisplay = document.getElementById('display-device-id');
    if (devIdDisplay && typeof getDeviceId === "function") {
        devIdDisplay.innerText = getDeviceId();
    }

    // 3. ACTIVATION DU BOUTON CACHÉ ADMIN (Appui long)
    if (typeof initAdminTrigger === "function") {
        initAdminTrigger();
    }

    // --- 3.5 SYNCHRONISATION DES TARIFS (Crucial pour le bilan financier) ---
    // On attend (await) que les prix arrivent de Firebase AVANT de lancer l'app
    if (typeof chargerTarifs === "function") {
        console.log("📊 Synchronisation des tarifs en cours...");
        await chargerTarifs();
    }

    // 4. DÉMARRAGE DE L'INTERFACE (Tunnel de sécurité V1)
    if (typeof launchApp === "function") {
        console.log("🔓 Vérification de la licence...");
        await launchApp();
    }
    
    console.log("✅ Système prêt et débloqué.");
});
