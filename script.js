:root {
    --bg: #050508;
    --gold: #fbbf24;
    --accent: #6366f1;
    --glass: rgba(255, 255, 255, 0.05);
}

body, html { margin: 0; padding: 0; height: 100%; background: var(--bg); color: white; font-family: sans-serif; overflow: hidden; }

/* Centrage du titre sur l'accueil vide */
.hero-center {
    height: 80vh;
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    text-align: center;
}

.main-title { font-size: 3rem; margin: 0; color: var(--gold); }
.sub-title { font-size: 1.2rem; color: #555; letter-spacing: 5px; cursor: pointer; padding: 20px; }

/* Styles des Gates & Admin */
.gate { position: fixed; inset: 0; display: none; align-items: center; justify-content: center; z-index: 1000; background: var(--bg); }
.glass-card { background: var(--glass); backdrop-filter: blur(15px); padding: 30px; border-radius: 20px; border: 1px solid rgba(255,255,255,0.1); text-align: center; width: 80%; max-width: 320px; }
.id-display { background: #000; padding: 10px; color: var(--gold); margin: 15px 0; font-family: monospace; border: 1px solid #333; }
.input-3d { width: 100%; padding: 15px; background: #000; border: 1px solid #333; color: white; border-radius: 10px; margin-bottom: 10px; text-align: center; box-sizing: border-box; }
.btn-3d { width: 100%; padding: 15px; border: none; border-radius: 10px; font-weight: bold; cursor: pointer; text-transform: uppercase; }
.btn-gold { background: var(--gold); }

.full-page { position: fixed; inset: 0; background: var(--bg); display: none; padding: 20px; z-index: 2000; overflow-y: auto; }
.user-row { background: var(--glass); padding: 15px; border-radius: 12px; margin-bottom: 10px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #222; }
.btn-action { padding: 8px 12px; border: none; border-radius: 6px; color: white; font-weight: bold; cursor: pointer; font-size: 0.75rem; margin-left: 5px; }
.wa { background: #25D366; } .pay { background: var(--accent); } .ban { background: #444; }

#cloud-dot { width: 10px; height: 10px; border-radius: 50%; display: inline-block; }
.anim-pop { animation: pop 0.3s ease-out; }
@keyframes pop { from { transform: scale(0.9); opacity: 0; } to { transform: scale(1); opacity: 1; } }
