// Inizializza Supabase (solo l'URL base, senza /rest/v1/)
const supabaseUrl = 'https://itjgnwldswolupeekmzq.supabase.co';
const supabaseKey = 'sb_publishable__XpUuZxIvIlEYjn5hrE1ww_g0lcJcIt';

// INIZIALIZZAZIONE UNICA:
const supabaseClient = window.supabase.createClient(supabaseUrl, supabaseKey);

let gameChannel = null;
let isHost = false;
let connection = {
  open: true,
  send: function(payload) {
    sendData(payload); // Dirotta il pacchetto nel nuovo tunnel!
  }
};
let peer = true;

function showMultiplayerSetup() {
  document.getElementById('multiplayer-setup').style.display = 'block';
}

function createRoom() {
  isHost = true;
  let customId = document.getElementById('room-code-input').value.trim();
  
  if (!customId) {
    customId = "room-" + Math.floor(1000 + Math.random() * 9000);
  }
  
  const statusEl = document.getElementById('connection-status');
  if (statusEl) statusEl.innerText = "Creazione stanza sul server...";

  gameChannel = supabaseClient.channel(`room-${customId}`);
  setupSupabaseListener();

  gameChannel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      if (statusEl) statusEl.innerText = `Stanza creata! Codice: ${customId}. In attesa dell'amico...`;
    }
  });
}

function joinRoom() {
  isHost = false;
  const targetId = document.getElementById('room-code-input').value.trim();
  if (!targetId) return alert("Inserisci un codice stanza!");

  const statusEl = document.getElementById('connection-status');
  if (statusEl) statusEl.innerText = "Connessione al server di gioco..."; 

  gameChannel = supabaseClient.channel(`room-${targetId}`);
  setupSupabaseListener();

  gameChannel.subscribe((status) => {
    if (status === 'SUBSCRIBED') {
      if (statusEl) statusEl.innerText = "Agganciato! Invio segnale all'Host...";
      if (typeof bot !== 'undefined') bot.stopThinking();
      
      // Il canale è aperto: mandiamo subito il segnale di ready
      setTimeout(() => {
        sendData({ type: 'GUEST_READY' });
      }, 500);
    }
  });
}

function setupSupabaseListener() {
  // Tutto quello che riceviamo dalla rete passa da qui dentro
  gameChannel.on('broadcast', { event: 'game-action' }, (payload) => {
    const data = payload.payload;
    const statusEl = document.getElementById('connection-status');

    if (data.type === 'GUEST_READY' && isHost) {
      if (statusEl) statusEl.innerText = "L'amico è entrato! Avvio in corso...";
      
      if (typeof DICTIONARY === 'undefined') {
        alert("⚠️ ERRORE: Il file dictionary.js è rotto!");
        return;
      }
      
      const categories = Object.keys(DICTIONARY);
      const chosenCategory = categories[Math.floor(Math.random() * categories.length)];
      
      // 1. SPEDIAMO IL SEGNALE AL TELEFONO SUBITO, a mente sgombra
      sendData({ 
        type: 'START_MULTIPLAYER', 
        category: chosenCategory,
        mode: typeof gameMode !== 'undefined' ? gameMode : 'LONTANI'
      });
      
      // 2. Facciamo aspettare il PC 300 millisecondi per essere certi che il messaggio sia partito, poi avvia
      setTimeout(() => {
        const setupEl = document.getElementById('multiplayer-setup');
        if (setupEl) setupEl.style.display = 'none';
        
        window.currentCategory = chosenCategory;
        startMultiplayerGame(chosenCategory);
      }, 300);
    }

    if (data.type === 'START_MULTIPLAYER') {
      // Ricevuto dal telefono! Sblocchiamo tutto in sicurezza
      if (data.mode) {
        window.gameMode = data.mode;
      }
      window.currentCategory = data.category;
      
      const setupEl = document.getElementById('multiplayer-setup');
      if (setupEl) setupEl.style.display = 'none';

      try {
        startMultiplayerGame(data.category);
      } catch (err) {
        alert("Errore caricamento grafica telefono: " + err);
      }
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
      if (lastPlayerId === "TU") {
        assignPenaltyCard("L'avversario ha contestato la tua parola!");
      }
    }

    if (data.type === 'PENALTY_CARD_BOTH') {
      const penaltyCard = LETTERS_POOL[Math.floor(Math.random() * LETTERS_POOL.length)];
      playerHand.push({ ...penaltyCard, id: Math.random() });
      renderHand();
      const errorMsg = document.getElementById('error-msg');
      if (errorMsg) errorMsg.innerText = "L'avversario ha cambiato categoria! +1 carta.";
    }

    if (data.type === 'CHANGE_CATEGORY_ONLY') {
      window.currentCategory = data.category;
      wordsPlayedOnCard = 0;
      const catEl = document.getElementById('current-category');
      if (catEl) catEl.innerText = window.currentCategory;
      const playedEl = document.getElementById('played-words');
      if (playedEl) playedEl.innerHTML = "";
      const countEl = document.getElementById('words-count');
      if (countEl) countEl.innerText = "0";
      
      const stage = document.getElementById('center-stage');
      if (stage) stage.style.display = 'none';
      
      renderHand();
    }

  if (data.type === 'ROUND_OVER') {
      alert("L'avversario ha svuotato la mano per primo! Conteggio fulmini.");
      
      // Aggiorna subito i fulmini dell'avversario a schermo (tu ricevi i suoi fulmini)
      const botLightningsEl = document.getElementById('bot-lightnings');
      if (botLightningsEl && typeof data.lightnings !== 'undefined') {
        botLightningsEl.innerText = data.lightnings;
      }

      triggerRoundEnd(false, data.category, data.lightnings);
    }
    if (data.type === 'CHANGE_CATEGORY') {
      window.currentCategory = data.category;
      wordsPlayedOnCard = 0;
      const catEl = document.getElementById('current-category');
      if (catEl) catEl.innerText = window.currentCategory;
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
      if (botLightningsEl) {
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
