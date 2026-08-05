let peer = null;
let connection = null;
let isHost = false;

// 1. L'HOST CREA LA STANZA
function createRoom() {
  isHost = true;
  const shortId = "blitz-" + Math.floor(1000 + Math.random() * 9000);
  
  peer = new Peer(shortId);

  peer.on('open', (id) => {
    document.getElementById('connection-status').innerText = `Stanza creata! Codice: ${id}`;
  });

  peer.on('connection', (conn) => {
    connection = conn;
    document.getElementById('connection-status').innerText = "Amico connesso! Buon gioco.";
    setupDataListener();
    
    // Disattiva il bot perché si gioca in due umani
    if (typeof bot !== 'undefined') {
      bot.stopThinking();
    }

    // Invia subito la categoria iniziale all'amico
    setTimeout(() => {
      sendData({ type: 'CHANGE_CATEGORY', category: currentCategory });
    }, 500);
  });
}

// 2. L'AMICO SI UNISCE ALLA STANZA
function joinRoom() {
  isHost = false;
  const targetId = document.getElementById('room-code-input').value.trim();
  if (!targetId) return alert("Inserisci un codice stanza!");

  peer = new Peer();

  peer.on('open', () => {
    connection = peer.connect(targetId);
    
    connection.on('open', () => {
      document.getElementById('connection-status').innerText = `Connesso alla stanza ${targetId}!`;
      setupDataListener();
      
      // Disattiva il bot anche per l'ospite
      if (typeof bot !== 'undefined') {
        bot.stopThinking();
      }
    });
  });
}

// 3. ASCOLTO MESSAGGI IN TEMPO REALE
function setupDataListener() {
  connection.on('data', (data) => {
    console.log("Dati ricevuti:", data);

    // Quando un giocatore lancia una parola
    if (data.type === 'PLAY_WORD') {
      registerWordPlay(data.word, false, isHost ? "AMICO" : "HOST");
    }

    // Quando cambia la categoria (ricevuta dall'host)
    if (data.type === 'CHANGE_CATEGORY') {
      currentCategory = data.category;
      wordsPlayedOnCard = 0;
      document.getElementById('current-category').innerText = currentCategory;
      document.getElementById('played-words').innerHTML = "";
      document.getElementById('words-count').innerText = "0";
    }
  });
}

// 4. INVIA DATI ALL'ALTRO GIOCATORE
function sendData(payload) {
  if (connection && connection.open) {
    connection.send(payload);
  }
}
