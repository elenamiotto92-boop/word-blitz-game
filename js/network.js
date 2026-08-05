let peer = null;
let connection = null;
let isHost = false;

function showMultiplayerSetup() {
  document.getElementById('multiplayer-setup').style.display = 'block';
}

function createRoom() {
  isHost = true;
  const shortId = "blitz-" + Math.floor(1000 + Math.random() * 9000);
  
  peer = new Peer(shortId);

  peer.on('open', (id) => {
    document.getElementById('connection-status').innerText = `Stanza creata! Codice: ${id}. In attesa dell'amico...`;
  });

  peer.on('connection', (conn) => {
    connection = conn;
    document.getElementById('connection-status').innerText = "Amico connesso! Avvio partita...";
    
    if (typeof bot !== 'undefined') bot.stopThinking();

    setTimeout(() => {
      // 1. L'host genera la categoria e avvia la sua schermata
      const categories = Object.keys(DICTIONARY);
      currentCategory = categories[Math.floor(Math.random() * categories.length)];
      
      startMultiplayerGame(currentCategory);
      
      // 2. Invia subito il segnale di avvio all'amico (ospite)
      sendData({ type: 'START_MULTIPLAYER', category: currentCategory });
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
      
      // Attiva subito l'ascolto dei dati per ricevere la categoria dall'host
      setupDataListener();
    });
  });
}

function setupDataListener() {
  if (!connection) return;

  connection.on('data', (data) => {
    if (data.type === 'PLAY_WORD') {
      registerWordPlay(data.word, false, isHost ? "AMICO" : "HOST");
    }

    if (data.type === 'CHANGE_CATEGORY') {
      currentCategory = data.category;
      wordsPlayedOnCard = 0;
      document.getElementById('current-category').innerText = currentCategory;
      document.getElementById('played-words').innerHTML = "";
      document.getElementById('words-count').innerText = "0";
    }

    // Ricevuto dall'host: sblocca la schermata anche per l'amico e fa partire il gioco
    if (data.type === 'START_MULTIPLAYER') {
      startMultiplayerGame(data.category);
    }
  });
}

function sendData(payload) {
  if (connection && connection.open) {
    connection.send(payload);
  }
}
