const supabaseUrl = 'https://itjgnwldswolupeekmzq.supabase.co';
const supabaseKey = 'sb_publishable__XpUuZxIvIlEYjn5hrE1ww_g0lcJcIt';

function getSupabaseClient() {
  if (!window.supabase) {
    alert("⚠️ Server Supabase non disponibile, ricarica la pagina.");
    return null;
  }
  if (!window.supabaseClientInstance) {
    window.supabaseClientInstance = window.supabase.createClient(supabaseUrl, supabaseKey);
  }
  return window.supabaseClientInstance;
}

let gameChannel = null;
let isHost = false;

let connection = {
  open: true,
  send: function(payload) {
    sendData(payload);
  }
};
let peer = true;

function showMultiplayerSetup() {
  const setupEl = document.getElementById('multiplayer-setup');
  if (setupEl) setupEl.style.display = 'block';
}

function createRoom() {
  isHost = true;
  const client = getSupabaseClient();
  if (!client) return;

  let customId = document.getElementById('room-code-input').value.trim();
  if (!customId) {
    customId = "room-" + Math.floor(1000 + Math.random() * 9000);
  }
  
  const statusEl = document.getElementById('connection-status');
  if (statusEl) statusEl.innerText = "Creazione stanza sul server...";

  gameChannel = client.channel(`room-${customId}`);
  setupSupabaseListener();

  gameChannel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      if (statusEl) statusEl.innerText = `Stanza creata! Codice: ${customId}. In attesa dell'amico...`;
    }
  });
}

function joinRoom() {
  isHost = false;
  const client = getSupabaseClient();
  if (!client) return;

  const targetId = document.getElementById('room-code-input').value.trim();
  if (!targetId) return alert("Inserisci un codice stanza!");

  const statusEl = document.getElementById('connection-status');
  if (statusEl) statusEl.innerText = "Connessione al server di gioco..."; 

  gameChannel = client.channel(`room-${targetId}`);
  setupSupabaseListener();

  gameChannel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      if (statusEl) statusEl.innerText = "Agganciato! Invio segnale all'Host...";
      if (typeof bot !== 'undefined' && bot) bot.stopThinking();
      
      setTimeout(() => {
        sendData({ type: 'GUEST_READY' });
      }, 500);
    }
  });
}

function setupSupabaseListener() {
  if (!gameChannel) return;

  gameChannel.on('broadcast', { event: 'game-action' }, (payload) => {
    const data = payload.payload;
    const statusEl = document.getElementById('connection-status');

    if (data.type === 'GUEST_READY' && isHost) {
      if (statusEl) statusEl.innerText = "L'amico è entrato! Avvio in corso...";
      if (typeof DICTIONARY === 'undefined') {
        alert("⚠️ ERRORE: Il file dictionary.js è rotto!"); return;
      }
      const categories = Object.keys(DICTIONARY);
      const chosenCategory = categories[Math.floor(Math.random() * categories.length)];
      
      sendData({ 
        type: 'START_MULTIPLAYER', 
        category: chosenCategory,
        mode: typeof gameMode !== 'undefined' ? gameMode : 'LONTANI'
      });
      
      setTimeout(() => {
        const setupEl = document.getElementById('multiplayer-setup');
        if (setupEl) setupEl.style.display = 'none';
        
        if (typeof syncCategory === 'function') syncCategory(chosenCategory);
        else window.currentCategory = chosenCategory;
        
        startMultiplayerGame(chosenCategory);
      }, 300);
    }

    if (data.type === 'START_MULTIPLAYER') {
      if (data.mode) window.gameMode = data.mode;
      
      if (typeof syncCategory === 'function') syncCategory(data.category);
      else window.currentCategory = data.category;
      
      const setupEl = document.getElementById('multiplayer-setup');
      if (setupEl) setupEl.style.display = 'none';

      try { startMultiplayerGame(data.category); } 
      catch (err) { alert("Errore caricamento grafica: " + err); }
    }

    if (data.type === 'PLAY_CARD_STAGE') {
      showCenterStage(data.letter, "L'avversario ha giocato questa lettera");
      lastPlayerId = "AVVERSARIO";
      registerWordPlay(`[LETTERA ${data.letter}]`, false, "AMICO");
    }

    if (data.type === 'PLAY_WORD_REMOTE') {
      lastPlayedWord = data.word;
      showCenterStage(data.letter, `L'avversario ha scritto: "${data.word}"`);
      lastPlayerId = "AVVERSARIO";
      registerWordPlay(data.word, false, "AMICO");
    }

    if (data.type === 'CONTEST_PLAY') {
      if (lastPlayerId === "TU") assignPenaltyCard("L'avversario ha contestato la tua parola!");
    }

    if (data.type === 'PENALTY_CARD_BOTH') {
      const penaltyCard = LETTERS_POOL[Math.floor(Math.random() * LETTERS_POOL.length)];
      playerHand.push({ ...penaltyCard, id: Math.random() });
      renderHand();
      const errorMsg = document.getElementById('error-msg');
      if (errorMsg) errorMsg.innerText = "L'avversario ha cambiato categoria! +1 carta.";
    }

if (data.type === 'CHANGE_CATEGORY_ONLY') {
      if (typeof syncCategory === 'function') syncCategory(data.category);
      else window.currentCategory = data.category;
      
      wordsPlayedOnCard = 0;
      const catEl = document.getElementById('current-category');
      if (catEl) catEl.innerText = currentCategory;
      const playedEl = document.getElementById('played-words');
      if (playedEl) playedEl.innerHTML = "";
      const countEl = document.getElementById('words-count');
      if (countEl) countEl.innerText = "0";
      const stage = document.getElementById('center-stage');
      if (stage) stage.style.display = 'none';
      renderHand();

      // Fai partire il timer di blocco anche sul dispositivo che riceve il cambio
      if (typeof startCategoryCooldownTimer === 'function') {
        startCategoryCooldownTimer();
      }
    }

    if (data.type === 'ROUND_OVER') {
      alert("L'avversario ha svuotato la mano per primo! Conteggio fulmini.");
      const botLightningsEl = document.getElementById('bot-lightnings');
      if (botLightningsEl && typeof data.lightnings !== 'undefined') {
        botLightningsEl.innerText = data.lightnings;
      }
      triggerRoundEnd(false, data.category, data.lightnings);
    }

    if (data.type === 'CHANGE_CATEGORY') {
      if (typeof syncCategory === 'function') syncCategory(data.category);
      else window.currentCategory = data.category;
      
      wordsPlayedOnCard = 0;
      const catEl = document.getElementById('current-category');
      if (catEl) catEl.innerText = currentCategory;
      const playedEl = document.getElementById('played-words');
      if (playedEl) playedEl.innerHTML = "";
      const countEl = document.getElementById('words-count');
      if (countEl) countEl.innerText = "0";
      const stage = document.getElementById('center-stage');
      if (stage) stage.style.display = 'none';
      
      playerHand = drawHand();
      renderHand();
    }

    if (data.type === 'UPDATE_LIGHTNINGS') {
      const botLightningsEl = document.getElementById('bot-lightnings');
      if (botLightningsEl && typeof data.lightnings !== 'undefined') {
        botLightningsEl.innerText = data.lightnings;
      }
    }
  });
}

function sendData(payload) {
  if (gameChannel) {
    gameChannel.send({
      type: 'broadcast',
      event: 'game-action',
      payload: payload
    });
  }
}
