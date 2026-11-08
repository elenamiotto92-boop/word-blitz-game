let peer = null;
let connection = null;
let isHost = false;
let dataListenerAttached = false; // Evita le doppie giocate

function showMultiplayerSetup() {
  document.getElementById('multiplayer-setup').style.display = 'block';
}

// CONFIGURAZIONE DI RETE ANTI-FIREWALL
const peerConfig = {
  config: {
    'iceServers': [
      { url: 'stun:stun.l.google.com:19302' },
      { url: 'stun:stun1.l.google.com:19302' }
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

  // 👇 L'Host usa il server Google per scavalcare il router
  peer = new Peer(customId, peerConfig);

  peer.on('error', (err) => {
    alert("Errore di rete (Host): " + err.type);
    if (statusEl) statusEl.innerText = "Errore: " + err.type;
  });

  peer.on('open', (id) => {
    if (statusEl) statusEl.innerText = `Stanza creata! Codice: ${id}. In attesa...`;
  });

  peer.on('connection', (conn) => {
    connection = conn;
    if (statusEl) statusEl.innerText = "L'amico ha bussato! Sto aprendo la porta...";
    
    if (typeof bot !== 'undefined') bot.stopThinking();

    conn.on('open', () => {
      if (statusEl) statusEl.innerText = "Porta aperta! Ascolto l'amico...";
      dataListenerAttached = false; 
      setupDataListener();
    });
  });
}

function joinRoom() {
  isHost = false;
  const targetId = document.getElementById('room-code-input').value.trim();
  if (!targetId) return alert("Inserisci un codice stanza!");

  const statusEl = document.getElementById('connection-status');
  if (statusEl) statusEl.innerText = "1. Contatto il server centrale..."; 

  // 👇 Il Guest usa lo stesso server per trovare la strada
  peer = new Peer(peerConfig);

  peer.on('error', (err) => {
    alert("Errore di rete (Guest): " + err.type);
    if (statusEl) statusEl.innerText = "Errore: " + err.type;
  });

  peer.on('open', () => {
    if (statusEl) statusEl.innerText = `2. Server raggiunto! Cerco la stanza...`;
    
    connection = peer.connect(targetId, { reliable: true }); 
    
    connection.on('open', () => {
      if (statusEl) statusEl.innerText = `3. Agganciato! Sincronizzazione...`;
      if (typeof bot !== 'undefined') bot.stopThinking();
      
      dataListenerAttached = false;
      setupDataListener();
      
      setTimeout(() => {
         if (statusEl) statusEl.innerText = `4. Invio segnale di via libera!`;
         if (connection) {
           connection.send({ type: 'GUEST_READY' });
         }
      }, 800); 
    });
  });
}

function setupDataListener() {
  if (!connection || dataListenerAttached) return;
  dataListenerAttached = true;

  // Tutto quello che riceviamo dalla rete passa da qui dentro:
  connection.on('data', (data) => {
    
    // 👇 ORA È NEL POSTO GIUSTO!
    // L'host riceve l'ok dell'amica e fa partire la partita per entrambi!
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
