
// 1. CONFIGURATION & INITIALISATION
const firebaseConfig = {
    databaseURL: "https://maths5eme-v1-default-rtdb.europe-west1.firebasedatabase.app"
}; 

if (!firebase.apps.length) {
    firebase.initializeApp(firebaseConfig);
}
const database = firebase.database();
let minuteurAdmin; 

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

// ... (Ajoute ici toutes tes autres fonctions : launchApp, naviguer, etc.) ...

// 3. DÉMARRAGE (Toujours à la toute fin du fichier)
window.addEventListener('load', () => {
    console.log("🚀 Lancement du système...");
    surveillerConnexion(); 
    
    const telLocal = localStorage.getItem('user_tel_id');
    if (telLocal) {
        // Au lieu d'appeler activerSignalEnLigne ici, 
        // on laisse launchApp décider si l'élève est autorisé.
        surveillerStatutEnDirect(telLocal);
    }

    initAdminTrigger();
    launchApp(); // C'est cette fonction qui appellera activerSignalEnLigne() si tout est OK
});

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
// --- SYSTÈME DE SÉCURITÉ SOLIDE V1 ---
// --- SYSTÈME DE SÉCURITÉ SOLIDE V1 ---
// --- SYSTÈME DE SÉCURITÉ SOLIDE V1 ---
// --- SYSTÈME DE SÉCURITÉ SOLIDE V1 ---
// 1. La nouvelle fonction de récupération d'identité
async function verifierIdentite() {
    const telLocal = localStorage.getItem('user_tel_id');
    
    if (!telLocal) return "NO_PROFILE"; // L'élève doit s'inscrire

    try {
        const snap = await database.ref('clients/' + telLocal + '/infos_client').once('value');
        if (!snap.exists()) {
            // Le compte a été supprimé par l'admin !
            localStorage.clear();
            return "DELETED";
        }
        
        const data = snap.val();
        if (data.statut === "suspendu") return "BANNED";
        
        return "AUTHORIZED";
    } catch (e) {
        return "OFFLINE_MODE";
    }
}

// 2. Le nouveau Tunnel de Lancement
async function launchApp() {
    const isActive = localStorage.getItem('v32_active') === 'true';
    const statusIdentite = await verifierIdentite();

    // A. Si pas de licence (PIN)
    if (!isActive) {
        naviguer('license-gate');
        return;
    }

    // B. Gestion des accès selon Firebase
    switch (statusIdentite) {
        case "AUTHORIZED":
            naviguer('hub-accueil');
            activerSignalEnLigne(); // On allume le voyant
            break;
            
        case "BANNED":
            alert("🚫 Votre accès a été suspendu par l'établissement.");
            // On peut afficher un écran noir ici
            break;
            
        case "DELETED":
            alert("⚠️ Votre compte n'existe plus. Veuillez vous réinscrire.");
            naviguer('registration-gate');
            break;

        case "NO_PROFILE":
            naviguer('registration-gate');
            break;

        default:
            // En cas d'erreur réseau, si on est déjà actif, on laisse passer
            naviguer('hub-accueil');
    }
}
// REMPLACE TON ANCIENNE FONCTION deleteClient PAR CELLE-CI :
async function deleteClient(telId, filtreActuel) {
    const confirmation = confirm("⚠️ ALERTE : Supprimer définitivement le compte " + telId + " ?\nL'élève ne pourra plus se reconnecter.");

    if (confirmation) {
        try {
            // .remove() efface TOUT le dossier du numéro (Clé + Données)
            await database.ref('clients/' + telId).remove();
            
            // Nettoyage optionnel de la présence
            await database.ref('presence/' + telId).remove();

            alert("✅ RÉUSSI : Le compte a été totalement éjecté du système.");
            
            // Rafraîchir l'affichage de l'admin
            if (typeof loadUsers === "function") {
                loadUsers(filtreActuel || 'TOUT');
            }
        } catch (e) {
            console.error(e);
            alert("❌ ERREUR : Impossible de joindre la base de données.");
        }
    }
}
// REMPLACE TON ANCIENNE FONCTION ouvrirRecuperation PAR CELLE-CI :
async function ouvrirRecuperation() {
    const tel = prompt("📱 Entrez le numéro de téléphone de votre compte :");
    
    if (!tel || tel.length < 8) {
        alert("⚠️ Numéro invalide.");
        return;
    }

    try {
        // On vérifie spécifiquement si les INFOS du client existent
        const snap = await database.ref('clients/' + tel + '/infos_client').once('value');
        
        if (snap.exists()) {
            // LE COMPTE EXISTE : On restaure les clés locales
            localStorage.setItem('user_tel_id', tel);
            localStorage.setItem('v32_registered', 'true');
            localStorage.setItem('v32_active', 'true'); // On réactive aussi la licence
            
            alert("✅ Compte retrouvé ! Bon retour parmi nous.");
            
            // On relance l'application
            if (typeof launchApp === "function") {
                launchApp();
            }
        } else {
            // LE COMPTE N'EXISTE PAS (Supprimé ou jamais créé)
            alert("❌ AUCUN COMPTE TROUVÉ : Ce numéro n'est pas enregistré ou a été supprimé par l'administration.");
        }
    } catch (e) {
        console.error(e);
        alert("🌐 Erreur de connexion au serveur.");
    }
}
// REMPLACE (OU AJOUTE) CETTE FONCTION :
function surveillerStatutEnDirect(tel) {
    if (!tel) return;

    // On écoute tout le dossier du client
    database.ref('clients/' + tel).on('value', (snapshot) => {
        const data = snapshot.val();
        
        // SI LE DOSSIER EST SUPPRIMÉ (null) OU SI LE STATUT EST SUSPENDU
        if (!snapshot.exists()) {
            alert("⚠️ Votre compte n'existe plus. Redirection...");
            localStorage.clear();
            location.reload(); 
        } else if (data.infos_client && data.infos_client.statut === "suspendu") {
            afficherEcranBloque();
        }
    });
}
async function enregistrerProfil() {
    const nom = document.getElementById('reg-nom').value.trim();
    const tel = document.getElementById('reg-tel').value.trim().replace(/\D/g,'');
    
    if(!nom || tel.length < 8) return alert("Veuillez remplir correctement les champs.");

    try {
        const clientRef = database.ref('clients/' + tel + '/infos_client');
        
        // On utilise .update({}) au lieu de .set({}) pour ne pas effacer 
        // d'autres données (comme l'historique de paiement)
        await clientRef.update({
            nom: nom,
            tel: tel,
            statut: "actif", // Par défaut à la création
            date_inscription: new Date().toISOString(),
            device_source: getDeviceId()
        });

        localStorage.setItem('user_tel_id', tel);
        localStorage.setItem('v32_registered', 'true');
        
        alert("✅ Profil validé !");
        launchApp();
    } catch(e) {
        alert("❌ Erreur Firebase : Vérifiez votre connexion.");
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
// Fonction que tu appelles quand tu cliques sur "Valider Paiement"
async function validerPaiementClient(telId, categorie) {
    const dateJour = new Date().toLocaleDateString('fr-FR');
    
    try {
        await database.ref('clients/' + telId + '/paiement').set({
            statut: "VALIDE",
            date: dateJour,
            offre: categorie,
            timestamp: firebase.database.ServerValue.TIMESTAMP
        });
        alert("✅ Paiement enregistré !");
        // Optionnel : rafraîchir la liste de l'historique ici
    } catch (e) {
        alert("Erreur lors de la validation");
    }
}
// 2. WHATSAPP : Message automatique
function envoyerRappel(tel, nom, cat) {
    const msg = `Bonjour ${nom}, votre abonnement (Catégorie ${cat}) arrive à échéance. Merci de régulariser votre situation.`;
    const url = `https://wa.me/${tel}?text=${encodeURIComponent(msg)}`;
    window.open(url, '_blank');
}



function filtrerClients() {
    // 1. Récupère la saisie (avec sécurité si l'élément n'existe pas)
    const inputElt = document.getElementById('admin-search');
    if(!inputElt) return; 
    
    const query = inputElt.value.toLowerCase().trim();
    
    // 2. Sélectionne toutes les lignes
    const rows = document.querySelectorAll('.user-row');
    
    rows.forEach(row => {
        // On récupère le texte visible (Nom, Tel, etc.)
        const contenu = row.innerText.toLowerCase();
        
        // 3. Logique d'affichage
        if (contenu.includes(query)) {
            // "REMETTRE PAR DÉFAUT" au lieu de forcer "flex"
            // Cela permet à la ligne de reprendre son style CSS d'origine
            row.style.display = ""; 
        } else {
            row.style.display = "none";
        }
    });

    // Optionnel : Debug dans la console pour voir si ça réagit
    const visibles = Array.from(rows).filter(r => r.style.display !== "none").length;
    console.log("Recherche : " + query + " | Trouvés : " + visibles);
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

    corps.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:20px; color:gray;'>Calcul du bilan financier...</td></tr>";

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
            
            // FILTRE STRICT : On ne prend que ceux qui ont payé (statut === 'actif')
            if (val && val.infos_client && val.infos_client.statut === "actif") {
                
                const info = val.infos_client;
                const cat = (info.categorie || "C").trim().toUpperCase();
                const montantReel = parseInt(tarifs[cat]) || 0;
                
                // On utilise la date d'inscription comme date de transaction
                const dateAffiche = info.date_inscription ? info.date_inscription.split('T')[0] : "---";

                totalGeneral += montantReel;

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

        // Affichage si la liste est vide après filtrage
        if (totalGeneral === 0) {
            corps.innerHTML = "<tr><td colspan='4' style='text-align:center; padding:40px; color:gray;'>Aucun encaissement enregistré.</td></tr>";
        } else {
            corps.innerHTML = html;
        }
        
        // Mise à jour du montant total en bas de page
        if(totalElt) {
            totalElt.innerText = totalGeneral.toLocaleString() + " FG";
        }

    } catch (e) {
        console.error("Erreur historique:", e);
        corps.innerHTML = "<tr><td colspan='4' style='color:red; text-align:center;'>Erreur de connexion.</td></tr>";
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

// ==========================================
//  DÉMARRAGE GLOBAL UNIQUE
// ==========================================
window.addEventListener('load', () => {
    console.log("🚀 Lancement du système DIOUF 2026...");

    // 1. On lance la surveillance de connexion (Le voyant LIVE/OFFLINE)
    surveillerConnexion(); 
    
    // 2. On récupère le numéro stocké
    const telLocal = localStorage.getItem('user_tel_id');
    
    // 3. Si l'élève est déjà connecté, on active sa présence et sa surveillance
    if (telLocal) {
        synchroniserPresence(); 
        surveillerStatutEnDirect(telLocal);
    }

    // 4. On prépare l'ID de l'appareil pour l'affichage
    const devIdDisplay = document.getElementById('display-device-id');
    if(devIdDisplay) devIdDisplay.innerText = getDeviceId();

    // 5. On initialise le trigger Admin
    initAdminTrigger();

    // 6. ON LANCE L'APP (Le tunnel de décision)
    launchApp();
});
