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
      startGameScreen();
      sendData({ type: 'START_MULTIPLAYER', category: currentCategory });
    }, 1000);
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
      document.getElementById('connection-status').innerText = `Connesso! Avvio partita...`;
      if (typeof bot !== 'undefined') bot.stopThinking();
      
      setTimeout(() => {
        startGameScreen();
      }, 1000);
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

    if (data.type === 'START_MULTIPLAYER') {
      currentCategory = data.category;
      startGameScreen();
    }
  });
}

function sendData(payload) {
  if (connection && connection.open) {
    connection.send(payload);
  }
}
