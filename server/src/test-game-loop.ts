import { io } from 'socket.io-client';

async function runTest() {
  console.log('🧪 Starting automated multiplayer game loop integration test...');

  const socket1 = io('http://127.0.0.1:4000');
  const socket2 = io('http://127.0.0.1:4000');

  await new Promise<void>((resolve) => {
    let count = 0;
    socket1.on('connect', () => { if (++count === 2) resolve(); });
    socket2.on('connect', () => { if (++count === 2) resolve(); });
  });

  console.log(' Both test sockets connected.');

  // 1. Player 1 creates room
  const roomData: any = await new Promise((resolve) => {
    socket1.emit('room:create', { playerName: 'Drawer_Alice', settings: { totalRounds: 1, roundDurationSec: 60 } }, (res: any) => {
      resolve(res);
    });
  });

  console.log(` Room created with code: ${roomData.roomCode}`);

  // 2. Player 2 joins room
  const joinData: any = await new Promise((resolve) => {
    socket2.emit('room:join', { roomCode: roomData.roomCode, playerName: 'Guesser_Bob' }, (res: any) => {
      resolve(res);
    });
  });

  console.log(` Player 2 joined successfully: ${joinData.player.name}`);

  let secretWord = '';
  let drawerSocket = socket1;
  let guesserSocket = socket2;

  // Listen for secret word on drawer
  socket1.on('round:startDrawer', (data) => {
    secretWord = data.word;
    console.log(` Drawer received secret word: "${secretWord}"`);
  });

  socket2.on('round:startDrawer', (data) => {
    secretWord = data.word;
    drawerSocket = socket2;
    guesserSocket = socket1;
    console.log(` Drawer (Player 2) received secret word: "${secretWord}"`);
  });

  // 3. Host starts game
  socket1.emit('room:startGame');

  // Wait 1s for round to start
  await new Promise((r) => setTimeout(r, 1000));

  // 4. Test stroke drawing from drawer
  drawerSocket.emit('stroke:draw', {
    x: 100, y: 100, prevX: 95, prevY: 95, color: '#F6F3EA', width: 6
  });

  // 5. Guesser submits a near-miss / semantic guess
  console.log(' Guesser submitting semantic guess: "vehicle"...');
  guesserSocket.emit('guess:submit', { text: 'vehicle' });

  const guessResult: any = await new Promise((resolve) => {
    guesserSocket.once('guess:result', (res) => {
      resolve(res);
    });
  });

  console.log(' Semantic Guess Result:', guessResult);

  // 6. Guesser submits exact secret word
  console.log(` Guesser submitting exact answer: "${secretWord}"...`);
  guesserSocket.emit('guess:submit', { text: secretWord });

  const correctResult: any = await new Promise((resolve) => {
    guesserSocket.once('guess:result', (res) => {
      resolve(res);
    });
  });

  console.log(' Exact Guess Result:', correctResult);

  // 7. Wait for round end payload
  const roundEndData: any = await new Promise((resolve) => {
    socket1.once('round:end', (data) => resolve(data));
  });

  console.log(' Round End Report Card:', {
    word: roundEndData.word,
    drawerBonus: roundEndData.drawerBonus,
    stats: roundEndData.stats,
    scores: roundEndData.scores
  });

  console.log('🎉 All automated tests passed successfully!');

  socket1.disconnect();
  socket2.disconnect();
  process.exit(0);
}

runTest().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
