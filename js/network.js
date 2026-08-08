let peer = null;
let connection = null;
let isHost = false;
let dataListenerAttached = false; 

function showMultiplayerSetup() {
  document.getElementById('multiplayer-setup').style.display = 'block';
}

function createRoom() {
  isHost = true;
  const shortId = "game-" + Math.floor(1000 + Math.random() * 9000);
  
  peer = new Peer(shortId);

  peer.on('open', (id) => {
    document.getElementById('connection-status').innerText = `Stanza creata! Codice: ${id}. In attesa dell'amico...`;
  });

  peer.on('connection', (conn) => {
    connection = conn;
    document.getElementById('connection-status').innerText = "Amico connesso! Avvio partita...";
    
    if (typeof bot !== 'undefined') bot.stopThinking();

    setTimeout(() => {
      // SALVAVITA: Controlla se il dizionario è rotto
      if (typeof DICTIONARY === 'undefined') {
        alert("⚠️ ERRORE: Il file dictionary.js è rotto! Controlla di non aver dimenticato una virgola tra le categorie.");
        document.getElementById('connection-status').innerText = "Errore nel dizionario. Sistema il file!";
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
      
      // Attiva subito l'ascolto dei dati per ricevere categoria e modalità dall'host
      setupDataListener();
    });
  });
}



function setupDataListener() {
  // Evita che il telefono si metta in ascolto doppio!
  if (!connection || dataListenerAttached) return;
  dataListenerAttached = true;

  connection.on('data', (data) => {
    // RICEZIONE AVVIO PARTITA
    if (data.type === 'START_MULTIPLAYER') {
      if (data.mode) {
        gameMode = data.mode;
      }
      startMultiplayerGame(data.category);
    }

    // MODALITÀ VICINI: L'avversario gioca la carta
    if (data.type === 'PLAY_CARD_STAGE') {
      showCenterStage(data.letter, "L'avversario ha giocato questa lettera (ha parlato a voce)");
      lastPlayerId = "AVVERSARIO";
      registerWordPlay(`[LETTERA ${data.letter}]`, false, "AMICO"); // <-- Chiamerà sempre AMICO
    }

    // MODALITÀ LONTANI: L'avversario scrive la parola
    if (data.type === 'PLAY_WORD_REMOTE') {
      lastPlayedWord = data.word;
      showCenterStage(data.letter, `L'avversario ha scritto: "${data.word}"`);
      lastPlayerId = "AVVERSARIO";
      registerWordPlay(data.word, false, "AMICO"); // <-- Chiamerà sempre AMICO
    }

    // GESTIONE CONTESTAZIONI
    if (data.type === 'CONTEST_PLAY') {
      if (lastPlayerId === "TU") {
        assignPenaltyCard("L'avversario ha contestato la tua parola!");
      }
    }

    // CAMBIO CATEGORIA CON PENALITÀ
    if (data.type === 'PENALTY_CARD_BOTH') {
      const penaltyCard = LETTERS_POOL[Math.floor(Math.random() * LETTERS_POOL.length)];
      playerHand.push({ ...penaltyCard, id: Math.random() });
      renderHand();
      const errorMsg = document.getElementById('error-msg');
      if (errorMsg) errorMsg.innerText = "L'avversario ha cambiato categoria! +1 carta a testa.";
    }

    // CAMBIO CATEGORIA REGOLARE (Comandato solo dall'Host)
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
      
      // Quando arriva la nuova categoria, rimischia la mano bilanciata per quella categoria!
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
