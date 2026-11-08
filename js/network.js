let peer = null;
let connection = null;
let isHost = false;
let dataListenerAttached = false; // Evita le doppie giocate

function showMultiplayerSetup() {
  document.getElementById('multiplayer-setup').style.display = 'block';
}

// ======================================================
// CONFIGURAZIONE DI RETE: BATTERIA TURN COMPLETA 
// ======================================================
const peerConfig = {
  debug: 3,
  config: {
    'iceServers': [
      // 1. STUN proprietario di Metered (Obbligatorio per sbloccare il TURN)
      { urls: 'stun:wordblitz.metered.live:80' },
      
      // 2. I tre tunnel TURN (UDP e TCP)
      { urls: 'turn:wordblitz.metered.live:80', username: 'd320ebb9b0b435f7d7013b1e', credential: 'ivPnAkRKyLfsRRVw' },
      { urls: 'turn:wordblitz.metered.live:443', username: 'd320ebb9b0b435f7d7013b1e', credential: 'ivPnAkRKyLfsRRVw' },
      { urls: 'turn:wordblitz.metered.live:443?transport=tcp', username: 'd320ebb9b0b435f7d7013b1e', credential: 'ivPnAkRKyLfsRRVw' }
    ]
  }
};

function createRoom() {
  isHost = true;
  let customId = document.getElementById('room-code-input').value.trim();
  
  if (!customId) {
    customId = "room-" + Math.floor(1000 + Math.random() * 9000);
  }
  
  const statusEl = document.getElementById('connection-status');
  if (statusEl) statusEl.innerText = "Creazione stanza in corso...";

  peer = new Peer(customId, peerConfig);

  peer.on('error', (err) => {
    alert("Errore di rete (Host): " + err.type);
    if (statusEl) statusEl.innerText = "Errore: " + err.type;
  });

  peer.on('open', (id) => {
    if (statusEl) statusEl.innerText = `Stanza creata! Codice: ${id}. In attesa dell'amico...`;
  });

  // 👇 METODO DI FORZATURA TOTALE: Appena l'amico bussa, sblocchiamo tutto
  peer.on('connection', (conn) => {
    connection = conn;
    if (statusEl) statusEl.innerText = "🎉 Connessione stabilita! Entrambi dentro.";
    
    if (typeof bot !== 'undefined') bot.stopThinking();

    // Sblocca subito la grafica nascondendo il setup
    const setupEl = document.getElementById('multiplayer-setup');
    if (setupEl) setupEl.style.display = 'none';

    dataListenerAttached = false; 
    setupDataListener();

    // Avvia immediatamente la partita per l'Host e manda il segnale
    if (typeof DICTIONARY !== 'undefined') {
      const categories = Object.keys(DICTIONARY);
      currentCategory = categories[Math.floor(Math.random() * categories.length)];
      
      startMultiplayerGame(currentCategory);
      
      // Piccolo timer di cortesia per assicurarci che il canale dati sia pronto a ricevere
      setTimeout(() => {
        sendData({ 
          type: 'START_MULTIPLAYER', 
          category: currentCategory,
          mode: gameMode 
        });
      }, 500);
    }
  });
}

function joinRoom() {
  isHost = false;
  const targetId = document.getElementById('room-code-input').value.trim();
  if (!targetId) return alert("Inserisci un codice stanza!");

  const statusEl = document.getElementById('connection-status');
  if (statusEl) statusEl.innerText = "1. Contatto il server..."; 

  peer = new Peer(peerConfig);

  peer.on('error', (err) => {
    alert("Errore di rete (Guest): " + err.type);
    if (statusEl) statusEl.innerText = "Errore: " + err.type;
  });

  peer.on('open', () => {
    if (statusEl) statusEl.innerText = `2. Connesso al server, aggancio stanza...`;
    
    connection = peer.connect(targetId); 
    
    connection.on('open', () => {
      if (statusEl) statusEl.innerText = `3. Aggancio riuscito! Sincronizzazione...`;
      if (typeof bot !== 'undefined') bot.stopThinking();
      
      dataListenerAttached = false;
      setupDataListener();
    });
  });
}

function setupDataListener() {
  if (!connection || dataListenerAttached) return;
  dataListenerAttached = true;

  // Tutto quello che riceviamo dalla rete passa da qui dentro:
  connection.on('data', (data) => {
    
    if (data.type === 'GUEST_READY' && isHost) {
      if (typeof DICTIONARY === 'undefined') {
        alert("⚠️ ERRORE: Il file dictionary.js è rotto! Controlla le virgole.");
        return;
      }
      
      const categories = Object.keys(DICTIONARY);
      currentCategory = categories[Math.floor(Math.random() * categories.length)];
      
      startMultiplayerGame(currentCategory);
      
      sendData({ 
        type: 'START_MULTIPLAYER', 
        category: currentCategory,
        mode: gameMode 
      });
    }

    if (data.type === 'START_MULTIPLAYER') {
      if (data.mode) {
        gameMode = data.mode;
      }
      // Sblocca la grafica anche per il Guest se riceve il via
      const setupEl = document.getElementById('multiplayer-setup');
      if (setupEl) setupEl.style.display = 'none';

      startMultiplayerGame(data.category);
    }

    if (data.type === 'PLAY_CARD_STAGE') {
      showCenterStage(data.letter, "L'avversario ha giocato questa lettera (ha parlato a voce)");
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
      if (errorMsg) errorMsg.innerText = "L'avversario ha cambiato categoria! +1 carta a testa.";
    }

    if (data.type === 'CHANGE_CATEGORY_ONLY') {
      currentCategory = data.category;
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
    }

    // L'avversario ha chiuso la mano per primo
    if (data.type === 'ROUND_OVER') {
      alert("L'avversario ha svuotato la mano per primo! Conteggio fulmini.");
      triggerRoundEnd(false, data.category, data.lightnings);
    }

    if (data.type === 'CHANGE_CATEGORY') {
      currentCategory = data.category;
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
      if (botLightningsEl) {
        botLightningsEl.innerText = data.lightnings;
      }
    }
  });
}

function sendData(payload) {
  if (connection) {
    connection.send(payload);
  }
}
