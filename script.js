
// --- INITIALISATION DES VARIABLES ---
const firebaseConfig = { databaseURL: "https://gestion-boutiques-diouf-default-rtdb.firebaseio.com" };
if (!firebase.apps.length) firebase.initializeApp(firebaseConfig);
const database = firebase.database();
const SECRET_KEY = 7391;
const ADMIN_PASS = "0000";

// --- GESTION ID UNIQUE ---
function getDeviceId() {
    let id = localStorage.getItem('diouf_device_id');
    if(!id) {
        id = "D-" + Math.random().toString(36).substr(2, 6).toUpperCase();
        try { localStorage.setItem('diouf_device_id', id); } catch(e) {}
    }
    return id;
}

// On définit currentId une seule fois (Priorité au téléphone si enregistré)
let currentId = localStorage.getItem('user_tel_id') || getDeviceId();

// --- SURVEILLANCE VOYANT CLOUD ---
database.ref(".info/connected").on("value", (snap) => {
    const dot = document.getElementById('cloud-dot');
    const text = document.getElementById('cloud-text');
    if (snap.val() === true) {
        dot.style.background = "#10b981";
        text.innerText = "CLOUD ACTIF";
    } else {
        dot.style.background = "#ef4444";
        text.innerText = "HORS-LIGNE";
    }
});

// --- SÉCURITÉ & ACCÈS ---
function verifierLicence() {
    const input = document.getElementById('input-license').value.trim();
    const device = getDeviceId(); // On utilise l'ID physique pour la licence
    let hash = 0;
    for (let i = 0; i < device.length; i++) {
        hash = ((hash << 5) - hash) + device.charCodeAt(i);
        hash |= 0;
    }
    const codeAttendu = Math.abs(hash + SECRET_KEY).toString().substring(0, 8);
    if(input === codeAttendu) {
        localStorage.setItem('v32_active', 'true');
        launchApp();
    } else { alert("❌ CODE PIN INCORRECT"); }
}

async function enregistrerProfil() {
    const nom = document.getElementById('reg-nom').value.trim();
    const tel = document.getElementById('reg-tel').value.trim();
    
    // Vérification des champs
    if(!nom || !tel) {
        return alert("Veuillez remplir tous les champs.");
    }
    
    // Nettoyage du numéro de téléphone (uniquement des chiffres)
    const cleanTel = tel.replace(/\D/g,''); 
    
    try {
        // Enregistrement sur le Cloud Firebase
        await database.ref('clients/' + cleanTel + '/infos_client').set({
            nom: nom, 
            tel: cleanTel,
            // Format ISO : Très important pour le calcul des jours (ex: 2026-03-16T10:00:00Z)
            date_inscription: new Date().toISOString(), 
            device_source: getDeviceId(),
            categorie: 'C' // Catégorie par défaut à l'inscription
        });

        // Sauvegarde locale pour la session
        localStorage.setItem('user_tel_id', cleanTel);
        localStorage.setItem('v32_registered', 'true');
        
        // Mise à jour de l'ID actuel et lancement de l'application
        currentId = cleanTel; 
        
        alert("✅ Compte Cloud créé avec succès !");
        launchApp();
        
    } catch(e) { 
        console.error("Erreur Inscription:", e);
        alert("⚠️ Erreur de connexion au Cloud. Vérifiez votre internet."); 
    }
}

async function checkBanStatus() {
    try {
        // On vérifie le ban sur l'ID actuel (Tél ou Device)
        const snapshot = await database.ref('blacklist/' + currentId).once('value');
        if (snapshot.exists() && snapshot.val() === true) {
            document.getElementById('banned-screen').style.display = 'flex';
            document.getElementById('ban-id-display').innerText = "ID: " + currentId;
            return true;
        }
    } catch (e) { console.log("Check ban ignoré"); }
    return false;
}

// --- LOGIQUE ADMIN ---
let adminTimer;
const trigger = document.getElementById('admin-trigger');
if(trigger) {
    trigger.addEventListener('touchstart', () => adminTimer = setTimeout(openAdmin, 3000));
    trigger.addEventListener('mousedown', () => adminTimer = setTimeout(openAdmin, 3000));
    trigger.addEventListener('touchend', () => clearTimeout(adminTimer));
    trigger.addEventListener('mouseup', () => clearTimeout(adminTimer));
}

function openAdmin() {
    const code = prompt("ENTRER LE MOT DE PASSE ADMIN :");
    if(code === ADMIN_PASS) {
        naviguer('page-admin');
        loadUsers();
    }
}


async function loadUsers(filtre = 'TOUT') {
    const list = document.getElementById('admin-user-list');
    list.innerHTML = "<p style='text-align:center; color:gray; padding:20px;'>Chargement des données...</p>";
    
    try {
        const usersSnap = await database.ref('clients').once('value');
        const blackSnap = await database.ref('blacklist').once('value');
        const blacklisted = blackSnap.val() || {};
        
        let clientsArray = [];

        usersSnap.forEach(u => {
            const data = u.val().infos_client;
            if(data) {
                const maCat = data.categorie || 'C';

                if (filtre === 'TOUT' || maCat === filtre) {
                    // FORCE LE RECALCUL ICI
                    const joursCalcules = calculerJours(data.date_inscription);
                    
                    clientsArray.push({
                        id: u.key,
                        nom: data.nom,
                        date: data.date_inscription,
                        jours: joursCalcules, // Utilise la valeur fraîchement calculée
                        isBanned: blacklisted[u.key] === true,
                        categorie: maCat
                    });
                }
            }
        });

        // Tri : les plus urgents en haut
        clientsArray.sort((a, b) => b.jours - a.jours);

        const titreVue = filtre === 'TOUT' ? 'TOUS LES CLIENTS' : 'CATÉGORIE ' + filtre;
        list.innerHTML = `
            <p style="font-size:0.75rem; color:var(--p); margin-bottom:15px; font-weight:800; text-align:center; border-bottom:1px solid #222; padding-bottom:10px;">
                📊 ${titreVue} : ${clientsArray.length}
            </p>`;

        clientsArray.forEach(c => {
            let colorClass = "status-ok";
            if(c.jours >= 26) colorClass = "status-warning";
            if(c.jours >= 30) colorClass = "status-danger";

            list.innerHTML += `
                <div class="user-row" style="display:flex; align-items:center; gap:10px; border-bottom: 1px solid #222; padding: 12px 0;">
                    
                    <div class="stats-circle ${colorClass}" style="flex-shrink:0;">
                        ${c.jours}j
                    </div>

                    <div style="flex:1; min-width:0;">
                        <b style="font-size:0.85rem; display:block; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
                            ${c.nom}
                        </b>
                        <small style="font-size:0.6rem; color:#666;">TEL: ${c.id}</small>
                    </div>

                    <div style="flex-shrink:0;">
                        <select onchange="changerCategorie('${c.id}', this.value)" 
                                style="background:#1a1a1a; color:white; border:1px solid #444; border-radius:4px; font-size:0.65rem; padding:4px; cursor:pointer;">
                            <option value="A" ${c.categorie === 'A' ? 'selected' : ''}>CAT A</option>
                            <option value="B" ${c.categorie === 'B' ? 'selected' : ''}>CAT B</option>
                            <option value="C" ${c.categorie === 'C' ? 'selected' : ''}>CAT C</option>
                        </select>
                    </div>
                 
                    <div style="display:flex; flex-direction:column; gap:5px; flex-shrink:0; align-items:flex-end;">
                        <button onclick="envoyerRappel('${c.id}', '${c.nom}', '${c.categorie}')" 
                                style="width:75px; background:#25D366; color:white; border:none; padding:5px; font-size:0.55rem; border-radius:4px; font-weight:bold; cursor:pointer; display:flex; align-items:center; justify-content:center; gap:3px;">
                            WHATSAPP
                        </button>
                        <button class="pay-btn" onclick="validerPaiement('${c.id}')" 
                                style="width:75px; padding:5px; font-size:0.55rem; font-weight:bold;">💰 PAYÉ</button>
                        
                        <button class="badge-ban" onclick="toggleBan('${c.id}')"
                                style="width:75px; background:${c.isBanned ? '#10b981' : '#ef4444'}; padding:5px; font-size:0.55rem; border-radius:4px; border:none; color:white; cursor:pointer; font-weight:bold;">
                            ${c.isBanned ? 'RÉACT' : 'SUSPEND'}
                        </button>
                        
                        <button onclick="deleteClient('${c.id}')" 
                                style="width:75px; background:transparent; border:1px solid #ff4444; color:#ff4444; font-size:0.5rem; padding:3px; border-radius:4px; font-weight:bold; cursor:pointer; text-align:center;">
                            🗑️ DELETE
                        </button>
                    </div>
                </div>`;
        });

        mettreAJourDashboard(clientsArray);

    } catch(e) { 
        list.innerHTML = "<p style='color:red; text-align:center; padding:20px;'>⚠️ Erreur Cloud.</p>"; 
        console.error("Erreur LoadUsers:", e);
    }
}
async function toggleBan(idUser) {
    const ref = database.ref('blacklist/' + idUser);
    const snap = await ref.once('value');
    await ref.set(!(snap.val() === true));
    loadUsers();
}

// --- NAVIGATION & LANCEMENT ---
function naviguer(id) {
    document.getElementById('hub-accueil').style.display = 'none';
    document.querySelectorAll('.full-page').forEach(p => p.style.display = 'none');
    const target = document.getElementById(id);
    if(target) target.style.display = 'block';
}

async function launchApp() {
    console.log("Démarrage de l'application...");

    // --- CORRECTION : AFFICHER L'ID IMMÉDIATEMENT ---
    const deviceId = getDeviceId();
    const displayElement = document.getElementById('display-device-id');
    if(displayElement) displayElement.innerText = deviceId;
    // -----------------------------------------------

    let joursUtilisation = 0;
    try {
        // On vérifie si on a un numéro de téléphone enregistré pour ce client
        const savedTel = localStorage.getItem('user_tel_id');
        const idToSearch = savedTel || deviceId;

        const snap = await database.ref('clients/' + idToSearch + '/infos_client').once('value');
        if (snap.exists()) {
            joursUtilisation = calculerJours(snap.val().date_inscription);
        }
    } catch (e) { console.log("Erreur de lecture date ou hors-ligne"); }

    // 2. VÉRIFICATION DU BANNISSEMENT
    const banni = await checkBanStatus();
    if (banni) return;

    // 3. VÉRIFICATION AUTOMATIQUE DES 35 JOURS
    if (joursUtilisation >= 35) {
        document.getElementById('banned-screen').style.display = 'flex';
        document.getElementById('ban-id-display').innerText = "ABONNEMENT EXPIRÉ (" + joursUtilisation + " jours)";
        document.querySelector('#banned-screen h2').innerText = "DÉLAI DE PAIEMENT DÉPASSÉ";
        return;
    }

    // 4. LOGIQUE D'AFFICHAGE DES ÉCRANS (GATES)
    const active = localStorage.getItem('v32_active') === 'true';
    const reg = localStorage.getItem('v32_registered') === 'true';

    // On cache tout par défaut
    document.querySelectorAll('.gate').forEach(g => g.style.display = 'none');
    document.getElementById('hub-accueil').style.display = 'none';

    if (!active) {
        // Si pas de licence, on montre l'écran du PIN (L'ID sera bien visible maintenant)
        document.getElementById('license-gate').style.display = 'flex';
    } else if (!reg) {
        // Si activé mais pas de profil Cloud
        document.getElementById('registration-gate').style.display = 'flex';
    } else {
        // Si tout est OK
        document.getElementById('hub-accueil').style.display = 'block';
    }
}

async function validerPaiement(userId) {
    if(!confirm("Voulez-vous valider le paiement pour ce compte ?")) return;

    try {
        // 1. Récupération globale du compte (ID machine ou Tel)
        const snap = await database.ref('clients/' + userId).once('value');
        const data = snap.val();

        if (!data) {
            alert("❌ Compte introuvable sur le Cloud.");
            return;
        }

        // 2. RECHERCHE FLEXIBLE : On cherche les infos là où elles sont
        // On regarde dans 'infos_client' OU directement à la racine de l'ID
        const client = data.infos_client ? data.infos_client : data;

        // 3. Récupération des tarifs Cloud
        const snapTarifs = await database.ref('parametres/tarifs').once('value');
        const tarifs = snapTarifs.val() || { 'A': 5000, 'B': 3000, 'C': 1500 };

        // 4. Identification de la catégorie (A par défaut si non trouvée)
        const maCat = (client.categorie || "A").trim().toUpperCase();
        const montant = Number(tarifs[maCat]) || 0;

        if (montant === 0) {
            alert("❌ Erreur : Le tarif pour la catégorie " + maCat + " est à 0.");
            return;
        }

        const maintenant = new Date();
        const dateFr = maintenant.toLocaleDateString('fr-FR') + " " + maintenant.toLocaleTimeString('fr-FR');

        // 5. MISE À JOUR (On répare la structure en passant)
        await database.ref('clients/' + userId + '/infos_client').update({
            nom: client.nom || "Utilisateur Inconnu",
            categorie: maCat,
            date_inscription: maintenant.toISOString()
        });

        // 6. ENREGISTREMENT HISTORIQUE
        await database.ref('historique_paiements').push({
            nom: client.nom || "Utilisateur Inconnu",
            telephone: userId,
            categorie: maCat,
            date: dateFr,
            montant: montant,
            situation: "PAYÉ"
        });

        alert("✅ Paiement de " + montant + " F validé pour votre compte machine !");
        loadUsers(); 

    } catch (e) {
        console.error(e);
        alert("❌ Erreur technique lors du paiement.");
    }
}
  function filtrerClients() {
    const searchVal = document.getElementById('admin-search').value.toLowerCase();
    const rows = document.querySelectorAll('.user-row');
    let count = 0; // On crée un compteur

    rows.forEach(row => {
        const text = row.innerText.toLowerCase();
        
        if (text.includes(searchVal)) {
            row.style.display = "flex";
            count++; // On ajoute 1 si le client est trouvé
        } else {
            row.style.display = "none";
        }
    });

    // Optionnel : Si vous voulez afficher le nombre de résultats trouvés
    // Il faudrait avoir un petit élément HTML dédié pour afficher "count"
}
    async function deleteClient(idUser) {
    // BARRIÈRE 1 : Confirmation simple
    const confirmationInitiale = confirm("⚠️ SUPPRIMER CET ÉLÈVE ?\n(Cette action est définitive)");
    
    if (confirmationInitiale) {
        // BARRIÈRE 2 : Le code de sécurité (on garde la sécurité car c'est une action critique)
        const codeSecurite = prompt("🔒 ACTION CRITIQUE\nTapez le mot 'SUPPRIMER' pour confirmer l'effacement définitif :");

        if (codeSecurite === "SUPPRIMER") {
            try {
                // Suppression propre sur Firebase
                await database.ref('clients/' + idUser).remove();
                
                // On nettoie aussi la blacklist s'il y était
                await database.ref('blacklist/' + idUser).remove();
                
                alert("✅ ÉLÈVE EFFACÉ : Les données ont été supprimées du Cloud.");
                loadUsers(); // Rafraîchit la liste admin
                
            } catch (error) {
                alert("❌ ERREUR : Connexion au Cloud impossible.");
                console.error("Erreur Delete:", error);
            }
        } else {
            alert("🚫 Annulé : Mot de confirmation incorrect.");
        }
    }
}

    async function changerCategorie(idUser, nouvelleCat) {
    try {
        await database.ref('clients/' + idUser + '/infos_client').update({
            categorie: nouvelleCat
        });
        // Optionnel : un petit message discret ou une console log
        console.log("Catégorie mise à jour pour " + idUser);
    } catch (e) {
        alert("Erreur lors de la mise à jour de la catégorie");
    }
}
// --- CONFIGURATION FINANCIÈRE ---
// --- GESTION DYNAMIQUE DES TARIFS ---

// Fonction pour récupérer les tarifs (soit sauvegardés, soit par défaut)
function obtenirTarifs() {
    const sauvegardes = localStorage.getItem('mes_tarifs');
    if (sauvegardes) {
        return JSON.parse(sauvegardes);
    }
    // Tarifs par défaut si rien n'est enregistré
    return { 'A': 5000, 'B': 3000, 'C': 1500 };
}

// Fonction pour enregistrer vos nouveaux prix
async function sauvegarderTarifs() {
    const nouveauxTarifs = {
        'A': parseInt(document.getElementById('price-A').value) || 0,
        'B': parseInt(document.getElementById('price-B').value) || 0,
        'C': parseInt(document.getElementById('price-C').value) || 0
    };
    
    try {
        // On met à jour Firebase pour que le bouton PAYÉ voie les mêmes chiffres que le filtre
        await database.ref('parametres/tarifs').set(nouveauxTarifs);
        
        // On sauvegarde en local aussi
        localStorage.setItem('mes_tarifs', JSON.stringify(nouveauxTarifs));
        
        alert("✅ TARIFS SYNCHRONISÉS !\nLe bouton PAYÉ utilisera désormais ces montants.");
        loadUsers('TOUT'); 
    } catch(e) {
        alert("Erreur Cloud : Vérifiez votre connexion.");
    }
}
window.onload = function() {
    // On remplit les cases avec ce qu'on a en mémoire locale
    const t = obtenirTarifs();
    document.getElementById('price-A').value = t.A || 5000;
    document.getElementById('price-B').value = t.B || 3000;
    document.getElementById('price-C').value = t.C || 1500;
    
    launchApp();
};
// 1. OUVRIR LE BILAN
function ouvrirRapport() {
    // 1. Récupération des tarifs dynamiques et des éléments de l'interface
    const t = obtenirTarifs(); 
    const modal = document.getElementById('modal-rapport');
    const zoneContenu = document.getElementById('contenu-rapport');
    
    // On récupère uniquement les clients actuellement affichés (ceux qui respectent le filtre)
    const rows = document.querySelectorAll('.user-row'); 
    
    if (rows.length === 0) {
        alert("Aucun client à afficher dans le rapport.");
        return;
    }

    let totalArgent = 0;
    
    // 2. Construction de l'en-tête du tableau (Style pro pour le PDF)
    let tableauHTML = `
        <div style="text-align:center; margin-bottom:20px;">
            <h2 style="margin:0; color:#222; text-transform:uppercase;">Bilan Financier Clients</h2>
            <p style="margin:5px 0; color:#666; font-size:0.85rem;">Extraits le : ${new Date().toLocaleString()}</p>
        </div>
        
        <table style="width:100%; border-collapse: collapse; font-family: Arial, sans-serif; font-size: 0.9rem;">
            <thead>
                <tr style="background:#f2f2f2; border-bottom: 2px solid #333;">
                    <th style="padding:12px; text-align:left; border:1px solid #ddd;">NOM DU CLIENT</th>
                    <th style="padding:12px; text-align:center; border:1px solid #ddd;">CAT.</th>
                    <th style="padding:12px; text-align:center; border:1px solid #ddd;">RETARD</th>
                    <th style="padding:12px; text-align:right; border:1px solid #ddd;">MONTANT</th>
                </tr>
            </thead>
            <tbody>`;

    // 3. Boucle sur les clients pour remplir les lignes et calculer le total
    rows.forEach(row => {
        const nom = row.querySelector('b').innerText;
        const cat = row.querySelector('select').value;
        const jours = row.querySelector('.stats-circle').innerText;
        
        // On récupère le montant basé sur VOTRE réglage (A, B ou C)
        const montant = t[cat] || 0; 
        totalArgent += montant;

        tableauHTML += `
            <tr style="border-bottom: 1px solid #eee;">
                <td style="padding:10px; border:1px solid #ddd;"><b>${nom}</b></td>
                <td style="padding:10px; border:1px solid #ddd; text-align:center;">${cat}</td>
                <td style="padding:10px; border:1px solid #ddd; text-align:center;">${jours}</td>
                <td style="padding:10px; border:1px solid #ddd; text-align:right; font-family: monospace;">
                    ${montant.toLocaleString()} FCFA
                </td>
            </tr>`;
    });

    // 4. Pied de tableau avec le Total Général
    tableauHTML += `
            </tbody>
            <tfoot>
                <tr style="background:#f9f9f9; font-weight:bold; font-size:1.1rem;">
                    <td colspan="3" style="padding:15px; text-align:right; border:1px solid #ddd;">TOTAL GÉNÉRAL :</td>
                    <td style="padding:15px; text-align:right; border:1px solid #ddd; color:#27ae60;">
                        ${totalArgent.toLocaleString()} FCFA
                    </td>
                </tr>
            </tfoot>
        </table>
        
        <div style="margin-top:30px; font-size:0.75rem; color:#888; text-align:center; font-style:italic;">
            Rapport certifié conforme - Système de Gestion Admin
        </div>`;

    // 5. Injection du contenu et affichage de la fenêtre plein écran
    zoneContenu.innerHTML = tableauHTML;
    modal.style.display = 'block';
    
    // Empêcher le défilement de la page en arrière-plan
    document.body.style.overflow = 'hidden';
}

// Fonction pour fermer et restaurer le défilement
function fermerRapport() {
    document.getElementById('modal-rapport').style.display = 'none';
    document.body.style.overflow = 'auto';
}

// 3. TÉLÉCHARGER EN PDF (Déclenche l'aperçu système)
function sauvegarderPDF() {
    // On change temporairement le titre de la page (ce sera le nom du fichier PDF)
    const ancienTitre = document.title;
    document.title = "Bilan_Financier_" + new Date().toLocaleDateString();

    // On lance la génération
    window.print();

    // On remet le titre original après
    setTimeout(() => {
        document.title = ancienTitre;
    }, 1000);
}

// 4. TÉLÉCHARGER EN CSV (Pour Excel)
function genererCSV() {
    let csv = ["NOM;CATEGORIE;RETARD;MONTANT"];
    const rows = document.querySelectorAll("#contenu-rapport tbody tr");
    
    rows.forEach(tr => {
        let cols = tr.querySelectorAll("td");
        let ligne = [
            cols[0].innerText,
            cols[1].innerText,
            cols[2].innerText,
            cols[3].innerText.replace(" FCFA", "")
        ];
        csv.push(ligne.join(";"));
    });

    const csvBlob = new Blob([csv.join("\n")], { type: "text/csv;charset=utf-8;" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(csvBlob);
    link.download = `BILAN_${new Date().toLocaleDateString()}.csv`;
    link.click();
}


   function envoyerRappel(idUser, nom, cat) {
    const t = obtenirTarifs();
    const montant = t[cat] || 0;
    
    // 1. Nettoyage du numéro : on garde uniquement les chiffres
    // Cela enlève les espaces, les "+" ou les tirets éventuels
    let tel = idUser.replace(/\D/g, ''); 

    // 2. Vérification de l'indicatif
    // Si le numéro ne commence pas déjà par 221, on l'ajoute
    if (!tel.startsWith('221')) {
        tel = '221' + tel;
    }
    
    // 3. Préparation du message
    const message = `Bonjour ${nom},%0A%0ANous vous informons que votre abonnement (Catégorie ${cat}) est arrivé à échéance.%0A%0AMontant à régulariser : ${montant.toLocaleString()} FCFA.%0A%0AMerci de votre confiance !`;

    // 4. Construction de l'URL finale
    const url = `https://wa.me/${tel}?text=${message}`;

    // 5. Ouverture de WhatsApp
    window.open(url, '_blank');
}
function mettreAJourDashboard(clients) {
    // 1. On récupère les tarifs que VOUS avez définis dans les cases de réglages
    // Si une case est vide, on met 0 par défaut pour éviter les bugs
    const tarifA = parseInt(document.getElementById('price-A').value) || 0;
    const tarifB = parseInt(document.getElementById('price-B').value) || 0;
    const tarifC = parseInt(document.getElementById('price-C').value) || 0;

    let totalArgentAttendu = 0;
    let nbClientsEnRetard = 0;

    // 2. On fait le calcul pour chaque client
    clients.forEach(c => {
        // On applique le prix selon la catégorie enregistrée dans Firebase
        let prixDuClient = 0;
        if (c.categorie === 'A') prixDuClient = tarifA;
        else if (c.categorie === 'B') prixDuClient = tarifB;
        else prixDuClient = tarifC; // Pour la catégorie C (ou si rien n'est coché)

        totalArgentAttendu += prixDuClient;

        // On compte comme "retard" celui qui a 30 jours ou plus
        if (c.jours >= 30) {
            nbClientsEnRetard++;
        }
    });

    // 3. Mise à jour de l'affichage en haut de l'écran
    const elTotal = document.getElementById('dash-total-a');
    const elArgent = document.getElementById('dash-total-global');
    const elRetard = document.getElementById('dash-retard');

    if (elTotal) elTotal.innerText = clients.length;
    if (elArgent) elArgent.innerText = totalArgentAttendu.toLocaleString() + " FCFA";
    if (elRetard) elRetard.innerText = nbClientsEnRetard;
}
    async function recupererCompte() {
    const tel = prompt("Entrez votre numéro de téléphone (celui utilisé à l'inscription) :");
    if(!tel) return;

    const cleanTel = tel.replace(/\D/g,'');
    
    try {
        // On vérifie si ce numéro existe sur Firebase
        const snap = await database.ref('clients/' + cleanTel + '/infos_client').once('value');
        
        if(snap.exists()) {
            // On restaure les clés locales
            localStorage.setItem('user_tel_id', cleanTel);
            localStorage.setItem('v32_registered', 'true');
            localStorage.setItem('v32_active', 'true'); // On réactive aussi la licence
            
            currentId = cleanTel;
            alert("✅ Accès restauré ! Bienvenue " + snap.val().nom);
            location.reload(); // On redémarre l'app proprement
        } else {
            alert("❌ Aucun compte trouvé pour ce numéro.");
        }
    } catch(e) {
        alert("Erreur lors de la récupération.");
    }
}
// --- FONCTION 1 : CALCUL DES JOURS ---
function calculerJours(dateStr) {
    if (!dateStr) return 0;
    try {
        let dInsc;
        // On gère les deux formats possibles
        if (dateStr.includes('/')) {
            let p = dateStr.split(' ')[0].split('/');
            dInsc = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]));
        } else {
            dInsc = new Date(dateStr);
        }

        // On remet les deux dates à MINUIT PILE pour comparer uniquement les jours
        const dateInscription = new Date(dInsc.getFullYear(), dInsc.getMonth(), dInsc.getDate());
        const dateAujourdhui = new Date();
        const aujourdhuiMinuit = new Date(dateAujourdhui.getFullYear(), dateAujourdhui.getMonth(), dateAujourdhui.getDate());

        // Calcul de la différence en millisecondes
        const diffTime = aujourdhuiMinuit.getTime() - dateInscription.getTime();
        
        // Conversion en jours (1 jour = 86 400 000 ms)
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        return diffDays < 0 ? 0 : diffDays;
    } catch (e) { 
        return 0; 
    }
}

// --- FONCTION 2 : RÉPARATION DES DONNÉES ---
async function forceReparationDates() {
    console.log("Démarrage de la réparation...");
    try {
        const snapshot = await database.ref('clients').once('value');
        if (!snapshot.exists()) {
            alert("Aucun client trouvé.");
            return;
        }
        let updates = {};
        let nb = 0;
        snapshot.forEach(child => {
            const info = child.val().infos_client;
            if (info && info.date_inscription) {
                let d = info.date_inscription;
                let dateObj;
                if (d.includes('/')) {
                    let p = d.split(' ')[0].split('/');
                    dateObj = new Date(parseInt(p[2]), parseInt(p[1]) - 1, parseInt(p[0]), 12, 0, 0);
                } else {
                    dateObj = new Date(d);
                }
                if (!isNaN(dateObj.getTime())) {
                    updates["clients/" + child.key + "/infos_client/date_inscription"] = dateObj.toISOString();
                    nb++;
                }
            }
        });
        await database.ref().update(updates);
        alert("✅ Réparation réussie pour " + nb + " clients !");
        location.reload();
    } catch (err) {
        alert("Erreur : " + err.message);
    }
}
    async function chargerHistoriquePaiements() {
    const tbody = document.getElementById('table-paiements-body');
    if(!tbody) return;

    try {
        const snap = await database.ref('historique_paiements').limitToLast(20).once('value');
        let html = "";

        snap.forEach(p => {
            const data = p.val();
            const estPaye = data.situation === "PAYÉ";

            html += `
                <tr style="border-bottom:1px solid #222;">
                    <td style="padding:8px; color:#888;">${data.date}</td>
                    <td style="padding:8px; font-weight:bold;">${data.nom}</td>
                    <td style="padding:8px; text-align:center;">
                        ${estPaye ? '<span style="color:#25D366;">✅ PAYÉ</span>' : '<span style="color:#ff4444;">❌ NON</span>'}
                    </td>
                </tr>
            `;
        });

        tbody.innerHTML = html || "<tr><td colspan='3' style='text-align:center; padding:20px;'>Aucun paiement enregistré</td></tr>";
    } catch (e) {
        console.error("Erreur historique:", e);
    }
}
    // Fonction pour ouvrir la vue plein écran

function telechargerHistorique() {
    // 1. On récupère le contenu du tableau uniquement
    const contenuTableau = document.getElementById('modal-historique').innerHTML;
    
    // 2. On crée une fenêtre temporaire pour l'impression
    const fenetreImpression = window.open('', '', 'height=600,width=800');
    
    fenetreImpression.document.write('<html><head><title>Historique des Paiements</title>');
    fenetreImpression.document.write('<style>');
    fenetreImpression.document.write('body { font-family: sans-serif; padding: 20px; }');
    fenetreImpression.document.write('table { width: 100%; border-collapse: collapse; margin-top: 20px; }');
    fenetreImpression.document.write('th, td { border: 1px solid #ddd; padding: 12px; text-align: left; }');
    fenetreImpression.document.write('th { background-color: #f2f2f2; }');
    fenetreImpression.document.write('button { display: none; }'); // Cache les boutons sur le PDF
    fenetreImpression.document.write('</style></head><body>');
    
    // 3. On écrit le contenu (sans les boutons d'action)
    fenetreImpression.document.write('<h2 style="text-align:center;">JOURNAL DES PAIEMENTS</h2>');
    fenetreImpression.document.write(document.getElementById('table-paiements-body-fullscreen').closest('table').outerHTML);
    
    fenetreImpression.document.write('</body></html>');
    
    fenetreImpression.document.close();
    
    // 4. On lance l'impression / Enregistrement PDF
    setTimeout(() => {
        fenetreImpression.print();
    }, 500);
}

   function telechargerCSV() {
    // 1. Définir l'entête
    let csvContent = "Date;Nom;Telephone;Situation\n";

    // 2. Récupérer les lignes
    const rows = document.querySelectorAll("#table-paiements-body-fullscreen tr");

    if (rows.length === 0 || rows[0].innerText.includes("Aucun")) {
        return alert("L'historique est vide !");
    }

    rows.forEach(row => {
        const cols = row.querySelectorAll("td");
        if (cols.length >= 4) {
            // On nettoie les espaces et les retours à la ligne
            let date = cols[0].innerText.trim().replace(/\n/g, " ");
            let nom = cols[1].innerText.trim();
            let tel = cols[2].innerText.trim();
            let situation = "PAYE";

            csvContent += `${date};${nom};${tel};${situation}\n`;
        }
    });

    // 3. CRUCIAL : Ajouter le BOM UTF-8 pour qu'Excel affiche bien les caractères
    const BOM = "\uFEFF";
    const blob = new Blob([BOM + csvContent], { type: 'text/csv;charset=utf-8;' });
    
    // 4. Téléchargement
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const maintenant = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
    
    link.setAttribute("href", url);
    link.setAttribute("download", `historique_paiements_${maintenant}.csv`);
    link.style.visibility = 'hidden';
    
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}
// Fonction pour fermer la vue
function fermerHistoriquePleinEcran() {
    document.getElementById('modal-historique').style.display = 'none';
}


    async function nettoyerHistoriqueComplet() {
    // 1. Demande de confirmation
    if (!confirm("Voulez-vous SAUVEGARDER sur Excel puis EFFACER tout l'historique ?")) return;

    // 2. Vérification du mot de passe
    const pass = prompt("🔒 Entrez le mot de passe Admin pour confirmer :");
    if (pass !== ADMIN_PASS) return alert("Mot de passe incorrect.");

    try {
        // --- ÉTAPE A : LA SAUVEGARDE AUTOMATIQUE ---
        const snap = await database.ref('historique_paiements').once('value');
        
        if (snap.exists()) {
            let csv = "\uFEFFDate;Nom;Telephone;Categorie;Montant\n";
            snap.forEach(p => {
                const d = p.val();
                csv += `${d.date};${d.nom};${d.telephone};${d.categorie};${d.montant}\n`;
            });

            const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement("a");
            link.href = url;
            link.download = `SAUVEGARDE_AVANT_NETTOYAGE_${new Date().toLocaleDateString()}.csv`;
            link.click(); // Lance le téléchargement
        }

        // --- ÉTAPE B : LE NETTOYAGE ---
        await database.ref('historique_paiements').remove();
        
        alert("✅ Sauvegarde terminée et historique vidé avec succès !");
        
        // Rafraîchir l'affichage
        if (document.getElementById('modal-historique').style.display === 'block') {
            ouvrirHistoriquePleinEcran();
        }

    } catch (e) {
        console.error(e);
        alert("❌ Une erreur est survenue lors du nettoyage.");
    }
}


// 2. OUVERTURE DE L'HISTORIQUE (Correction Date et Montant Variable)
async function ouvrirHistoriquePleinEcran() {
    const tbody = document.getElementById('table-paiements-body-fullscreen');
    const tfoot = document.getElementById('table-paiements-footer');
    const modal = document.getElementById('modal-historique');
    
    if (modal) modal.style.display = 'block';

    try {
        const snap = await database.ref('historique_paiements').once('value');
        let html = "";
        let cumulArgent = 0;
        let nombrePaiements = 0;

        snap.forEach(p => {
            const data = p.val();
            
            // 1. GESTION DU MONTANT (On s'assure que c'est un nombre propre)
            const montant = Number(data.montant) || 0;
            cumulArgent += montant;
            nombrePaiements++;

            // 2. GESTION DE LA DATE (Robuste pour le filtre JJ/MM/AAAA)
            let dateLisible = data.date || "";
            if (dateLisible.includes('-') || !isNaN(Date.parse(dateLisible))) {
                const d = new Date(dateLisible);
                dateLisible = d.toLocaleDateString('fr-FR'); 
                // Optionnel : ajouter l'heure pour plus de précision :
                // dateLisible += " " + d.toLocaleTimeString('fr-FR', {hour:'2-digit', minute:'2-digit'});
            }

            // 3. CONSTRUCTION DE LA LIGNE
            // Note : On met le montant brut dans le texte pour que le filtre le trouve
            html = `
                <tr style="border-bottom:1px solid #222;">
                    <td style="padding:12px; color:#aaa;">${dateLisible}</td>
                    <td style="padding:12px;"><b>${data.nom}</b><br><small style="color:#888;">${data.categorie || 'SANS CAT.'}</small></td>
                    <td style="padding:12px; font-family:monospace;">${data.telephone}</td>
                    <td style="padding:12px; text-align:right; font-weight:bold; color:#25D366;">
                        PAYÉ ${montant} F
                    </td>
                </tr>` + html; 
        });

        if (tbody) tbody.innerHTML = html;
        
        if (tfoot) {
            tfoot.innerHTML = `
                <tr style="background:#000; color:#25D366; font-size:1.1rem;">
                    <td colspan="2" style="padding:15px;">TOTAL (${nombrePaiements} reçus)</td>
                    <td colspan="2" style="padding:15px; text-align:right; font-weight:bold; border-left:1px solid #333;">
                        ${cumulArgent.toLocaleString()} FCFA
                    </td>
                </tr>`;
        }

    } catch (e) { 
        console.error("Erreur lors de l'ouverture de l'historique :", e); 
    }
}
// 3. FONCTION FILTRER (Correction lecture Date et Situation)
function filtrerHistorique() {
    const input = document.getElementById('search-historique');
    if (!input) return;
    
    const filter = input.value.toLowerCase();
    const tbody = document.getElementById('table-paiements-body-fullscreen');
    if (!tbody) return;

    const rows = tbody.getElementsByTagName('tr');
    let nouveauTotal = 0;

    for (let i = 0; i < rows.length; i++) {
        // On lit tout le texte de la ligne (Date formatée, Nom, Prix)
        const texteLigne = rows[i].innerText.toLowerCase();
        
        if (texteLigne.includes(filter)) {
            rows[i].style.display = ""; 
            
            // Extraction du montant depuis la 4ème colonne (index 3)
            const celluleMontant = rows[i].cells[3]; 
            if (celluleMontant) {
                // Cette ligne est magique : elle supprime tout SAUF les chiffres
                const chiffresSeuls = celluleMontant.innerText.replace(/[^\d]/g, '');
                
                if (chiffresSeuls !== "") {
                    nouveauTotal += parseInt(chiffresSeuls);
                }
            }
        } else {
            rows[i].style.display = "none";
        }
    }

    // Mise à jour du footer avec le nouveau total calculé
    const footer = document.getElementById('table-paiements-footer');
    if (footer) {
        // On récupère le nombre de lignes visibles pour l'afficher aussi
        const nbVisibles = Array.from(rows).filter(r => r.style.display !== "none").length;
        
        footer.innerHTML = `
            <tr style="background:#1a1a1a; color:#25D366; font-size:1.1rem;">
                <td colspan="3" style="padding:15px; text-align:right; font-weight:bold;">
                    TOTAL FILTRÉ (${nbVisibles} lignes) :
                </td>
                <td style="padding:15px; text-align:right; font-weight:bold; border-left:1px solid #333;">
                    ${nouveauTotal.toLocaleString()} FCFA
                </td>
            </tr>`;
    }
}
    //  DÉMARRAGE SYNCHRONISÉ
window.addEventListener('load', () => {
    try {
        const t = obtenirTarifs(); 
        if(document.getElementById('price-A')) {
            document.getElementById('price-A').value = t.A || 5000;
            document.getElementById('price-B').value = t.B || 3000;
            document.getElementById('price-C').value = t.C || 1500;
        }
        chargerHistoriquePaiements();
    } catch (e) { console.error("Erreur chargement:", e); }
    launchApp();
});


 function deconnexionManuelle() {
    console.log("Clic détecté !"); // Ceci s'affiche dans la console F12
    if(confirm("Voulez-vous déconnecter l'appareil ? Il faudra saisir à nouveau le MOT DE PASSE pour entrer.")) {
        localStorage.removeItem('v32_active');
        alert("Déconnexion réussie"); // Pour être sûr que ça a fonctionné
        location.reload();
    }
}      
    
// --- MODULE MULTI-MONNAIES ---
const TAUX_CHANGE = {
    "FCFA": 1,
    "GNF": 13,    // Exemple : 1 FCFA = 13 GNF
    "EURO": 0.0015,
    "USD": 0.0016
};

function convertirPrix(montant, devise) {
    const taux = TAUX_CHANGE[devise] || 1;
    return (montant * taux).toLocaleString() + " " + devise;
}

// Fonction pour changer l'affichage des tarifs dans le dashboard
function rafraichirDevise(nouvelleDevise) {
    localStorage.setItem('devise_preferee', nouvelleDevise);
    loadUsers(); // Recharge la liste avec la nouvelle monnaie
}

function ouvrirHistoriquePleinEcran() {
    document.getElementById('modal-historique').style.display = 'block';
    chargerHistoriquePleinEcran();
}

function fermerHistoriquePleinEcran() {
    document.getElementById('modal-historique').style.display = 'none';
}

function deconnexionManuelle() {
    if(confirm("Voulez-vous déconnecter cet appareil ?")) {
        localStorage.clear();
        location.reload();
    }
}