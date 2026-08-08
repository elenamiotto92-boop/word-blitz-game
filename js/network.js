let peer = null;
let connection = null;
let isHost = false;
let dataListenerAttached = false; // Evita le doppie giocate

function showMultiplayerSetup() {
  document.getElementById('multiplayer-setup').style.display = 'block';
}

function createRoom() {
  isHost = true;
  const shortId = "room-" + Math.floor(1000 + Math.random() * 9000);
  
  peer = new Peer(shortId);

  peer.on('open', (id) => {
    document.getElementById('connection-status').innerText = `Stanza creata! Codice: ${id}. In attesa dell'amico...`;
  });

  peer.on('connection', (conn) => {
    connection = conn;
    document.getElementById('connection-status').innerText = "Amico connesso! Avvio partita...";
    
    if (typeof bot !== 'undefined') bot.stopThinking();

    setTimeout(() => {
      if (typeof DICTIONARY === 'undefined') {
        alert("⚠️ ERRORE: Il file dictionary.js è rotto! Controlla le virgole.");
        document.getElementById('connection-status').innerText = "Errore nel dizionario!";
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
    }, 800);
  });
}

function joinRoom() {
  isHost = false;
  const targetId = document.getElementById('room-code-input').value.trim();
  if (!targetId) return alert("Inserisci un codice stanza!");

  peer = new Peer();

  peer.on('open', () => {
    connection = peer.connect(targetId);
    
    connection.on('open', () => {
      document.getElementById('connection-status').innerText = `Connesso alla stanza! Sincronizzazione in corso...`;
      if (typeof bot !== 'undefined') bot.stopThinking();
      
      setupDataListener();
    });
  });
}

function setupDataListener() {
  // Se è già in ascolto, non si sdoppia!
  if (!connection || dataListenerAttached) return;
  dataListenerAttached = true;

  connection.on('data', (data) => {
    // 1. Avvio partita multiplayer
    if (data.type === 'START_MULTIPLAYER') {
      if (data.mode) {
        gameMode = data.mode;
      }
      startMultiplayerGame(data.category);
    }

    // 2. Modalità Vicini (Giocata lettera a voce)
    if (data.type === 'PLAY_CARD_STAGE') {
      showCenterStage(data.letter, "L'avversario ha giocato questa lettera (ha parlato a voce)");
      lastPlayerId = "AVVERSARIO";
      registerWordPlay(`[LETTERA ${data.letter}]`, false, "AMICO");
    }

    // 3. Modalità Lontani (Parola scritta)
    if (data.type === 'PLAY_WORD_REMOTE') {
      lastPlayedWord = data.word;
      showCenterStage(data.letter, `L'avversario ha scritto: "${data.word}"`);
      lastPlayerId = "AVVERSARIO";
      registerWordPlay(data.word, false, "AMICO");
    }

    // 4. Contestazioni
    if (data.type === 'CONTEST_PLAY') {
      if (lastPlayerId === "TU") {
        assignPenaltyCard("L'avversario ha contestato la tua parola!");
      }
    }

    // 5. Penalità cambio categoria
    if (data.type === 'PENALTY_CARD_BOTH') {
      const penaltyCard = LETTERS_POOL[Math.floor(Math.random() * LETTERS_POOL.length)];
      playerHand.push({ ...penaltyCard, id: Math.random() });
      renderHand();
      const errorMsg = document.getElementById('error-msg');
      if (errorMsg) errorMsg.innerText = "L'avversario ha cambiato categoria! +1 carta a testa.";
    }

    // 6. Cambio categoria ogni 3 parole (mantenendo le stesse carte in mano)
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
      
      renderHand(); // Aggiorna la visualizzazione tenendo le stesse carte
    }

    // 7. L'avversario ha finito le carte per primo (Fine Manche)
    if (data.type === 'ROUND_OVER') {
      alert("L'avversario ha svuotato la mano per primo! Conteggio fulmini.");
      triggerRoundEnd(false); // false = ha chiuso l'avversario, tu prendi i fulmini delle tue carte in mano
    }

    // 8. Vecchio comando di cambio categoria completo (mantenuto per compatibilità)
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
  });
}

function sendData(payload) {
  if (connection && connection.open) {
    connection.send(payload);
  }
}
