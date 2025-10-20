import { useCallback, useEffect, useMemo, useState } from 'react';
import './App.css';

const RANKS = [
  { label: '2', value: 2 },
  { label: '3', value: 3 },
  { label: '4', value: 4 },
  { label: '5', value: 5 },
  { label: '6', value: 6 },
  { label: '7', value: 7 },
  { label: '8', value: 8 },
  { label: '9', value: 9 },
  { label: '10', value: 10 },
  { label: 'J', value: 11 },
  { label: 'Q', value: 12 },
  { label: 'K', value: 13 },
  { label: 'A', value: 14 }
];

const randomRank = () => {
  const rank = RANKS[Math.floor(Math.random() * RANKS.length)];
  return { ...rank };
};

const SUITS = [
  { name: 'spades', symbol: '♠', color: 'black' },
  { name: 'hearts', symbol: '♥', color: 'red' },
  { name: 'clubs', symbol: '♣', color: 'black' },
  { name: 'diamonds', symbol: '♦', color: 'red' }
];

const randomSuit = () => {
  const suit = SUITS[Math.floor(Math.random() * SUITS.length)];
  return { ...suit };
};

const createRandomCard = () => ({
  rank: randomRank(),
  suit: randomSuit()
});

const drawDifferentCard = (currentCard) => {
  if (!currentCard) {
    return createRandomCard();
  }

  let next = createRandomCard();
  while (next.rank.value === currentCard.rank.value) {
    next = createRandomCard();
  }
  return next;
};

const toTitleCase = (direction) => direction.charAt(0).toUpperCase() + direction.slice(1);

function App() {
  const [connectionState, setConnectionState] = useState({
    status: 'pending',
    message: 'Detecting Discord Activity environment...'
  });

  const [gameState, setGameState] = useState({
    status: 'idle',
    currentCard: null,
    score: 0,
    history: [],
    lastRound: null
  });

  useEffect(() => {
    let cancelled = false;

    async function initDiscord() {
      if (typeof window === 'undefined' || !window.DiscordSDK) {
        if (!cancelled) {
          setConnectionState({
            status: 'standalone',
            message: 'Discord SDK not detected. Running in standalone preview mode.'
          });
        }
        return;
      }

      const clientId = process.env.REACT_APP_DISCORD_CLIENT_ID;
      if (!clientId) {
        setConnectionState({
          status: 'error',
          message: 'Missing REACT_APP_DISCORD_CLIENT_ID env variable.'
        });
        return;
      }

      try {
        setConnectionState({
          status: 'connecting',
          message: 'Connecting to Discord Activity...'
        });

        const discordSdk = new window.DiscordSDK(clientId);
        await discordSdk.ready();

        setConnectionState({
          status: 'connected',
          message: 'Connected to Discord Activity runtime.'
        });
      } catch (error) {
        setConnectionState({
          status: 'error',
          message: `Failed to connect to Discord Activity runtime: ${error?.message ?? error}`
        });
      }
    }

    initDiscord();

    return () => {
      cancelled = true;
    };
  }, []);

  const startGame = useCallback(() => {
    const firstCard = createRandomCard();
    setGameState({
      status: 'guessing',
      currentCard: firstCard,
      score: 0,
      history: [],
      lastRound: null
    });
  }, []);

  const makeGuess = useCallback((direction) => {
    setGameState((prev) => {
      if (prev.status !== 'guessing' || prev.currentCard === null) {
        return prev;
      }

      const nextCard = drawDifferentCard(prev.currentCard);
      const success =
        direction === 'higher'
          ? nextCard.rank.value >= prev.currentCard.rank.value
          : nextCard.rank.value <= prev.currentCard.rank.value;

      const round = {
        id: prev.history.length + 1,
        guess: direction,
        startingCard: prev.currentCard,
        nextCard,
        success
      };

      if (success) {
        return {
          status: 'guessing',
          currentCard: nextCard,
          score: prev.score + 1,
          history: [...prev.history, round],
          lastRound: {
            outcome: 'correct',
            round
          }
        };
      }

      return {
        status: 'finished',
        currentCard: prev.currentCard,
        score: prev.score,
        history: [...prev.history, round],
        lastRound: {
          outcome: 'failed',
          round
        }
      };
    });
  }, []);

  const canGuess = gameState.status === 'guessing';

  const displayedCard = useMemo(() => {
    if (gameState.status === 'guessing') {
      return gameState.currentCard;
    }

    return gameState.lastRound?.round?.startingCard ?? null;
  }, [gameState.status, gameState.currentCard, gameState.lastRound]);

  const displayedCardRank = displayedCard?.rank.label ?? '—';
  const displayedCardSuit = displayedCard?.suit.symbol ?? '♠';
  const displayedSuitClass = displayedCard?.suit.color ?? 'black';

  const statusBadge = useMemo(() => {
    switch (connectionState.status) {
      case 'connected':
        return 'connected';
      case 'connecting':
        return 'connecting';
      case 'error':
        return 'error';
      default:
        return null;
    }
  }, [connectionState.status]);

  const shouldShowStatus = Boolean(statusBadge);

  return (
    <div className="app-shell">
      <header className="header">
        <h1>Streets</h1>
        {shouldShowStatus && (
          <span className={`status-badge status-${statusBadge}`}>{connectionState.message}</span>
        )}
      </header>

      {gameState.status === 'idle' && (
        <section className="panel">
          <div className="panel-body">
            <h2>How to play</h2>
            <p>
              Predict whether the next number will be higher or lower than the current number. Numbers range from 2 to Ace. Each correct
              guess awards 1 point. Miss once and the game ends.
            </p>
          </div>
        </section>
      )}

      <section className="panel game-panel">
        <div className="panel-body">
          {gameState.status === 'idle' ? (
            <div className="empty-state">
              <p>You haven't started a round yet.</p>
              <button className="primary" onClick={startGame}>
                Start game
              </button>
            </div>
          ) : (
            <>
              <div className="table">
                <div className="card-stack">
                  <div className="card card-back" aria-hidden="true" />
                  <div className="card card-back offset" aria-hidden="true" />
                  <div className="card card-back offset" aria-hidden="true" />
                </div>

                <div className="card current-card" aria-live="polite">
                  <div className={`card-face suit-${displayedSuitClass}`}>
                    <div className="card-corner top">
                      <span className="card-rank">{displayedCardRank}</span>
                      <span className="card-suit">{displayedCardSuit}</span>
                    </div>
                    <div className="card-center">
                      <span className="card-suit-large">{displayedCardSuit}</span>
                    </div>
                    <div className="card-corner bottom">
                      <span className="card-rank">{displayedCardRank}</span>
                      <span className="card-suit">{displayedCardSuit}</span>
                    </div>
                  </div>
                </div>

                <div className="arrow-controls">
                  <button
                    className="arrow arrow-up"
                    disabled={!canGuess}
                    onClick={() => makeGuess('higher')}
                    aria-label="Guess higher"
                  >
                    <span className="arrow-icon">▲</span>
                  </button>
                  <button
                    className="arrow arrow-down"
                    disabled={!canGuess}
                    onClick={() => makeGuess('lower')}
                    aria-label="Guess lower"
                  >
                    <span className="arrow-icon">▼</span>
                  </button>
                </div>
              </div>

              <div className="status">
                {gameState.lastRound?.outcome === 'correct' && canGuess && (
                  <p className="success">
                    You were right! The next number was{' '}
                    <strong>
                      {gameState.lastRound.round.nextCard.rank.label}
                      {gameState.lastRound.round.nextCard.suit.symbol}
                    </strong>
                    .
                  </p>
                )}

                {gameState.lastRound?.outcome === 'failed' && (
                  <div className="failure">
                    <p>
                      Game over! You guessed <strong>{toTitleCase(gameState.lastRound.round.guess)}</strong> but the next
                      card was{' '}
                      <strong>
                        {gameState.lastRound.round.nextCard.rank.label}
                        {gameState.lastRound.round.nextCard.suit.symbol}
                      </strong>
                      .
                    </p>
                    <p>
                      Your final score: <strong>{gameState.score}</strong>
                    </p>
                    <button className="primary" onClick={startGame}>
                      Play again
                    </button>
                  </div>
                )}
              </div>

              <div className="scoreboard">
                <div className="score-header">
                  <h3>Scoreboard</h3>
                  <span className="score">Score: {gameState.score}</span>
                </div>
                <ul>
                  {gameState.history.length === 0 && <li>No rounds yet.</li>}
                  {gameState.history.map((round) => (
                    <li key={round.id} className={round.success ? 'round-success' : 'round-fail'}>
                      <span>Round #{round.id}</span>
                      <span className="card-sequence">
                        <span className={`card-text suit-${round.startingCard.suit.color}`}>
                          {round.startingCard.rank.label}
                          {round.startingCard.suit.symbol}
                        </span>
                        {' '}
                        →
                        {' '}
                        <span className={`card-text suit-${round.nextCard.suit.color}`}>
                          {round.nextCard.rank.label}
                          {round.nextCard.suit.symbol}
                        </span>
                      </span>
                      <span>{toTitleCase(round.guess)}</span>
                      <span>{round.success ? 'Correct' : 'Incorrect'}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </>
          )}
        </div>
      </section>

      <footer className="footer">
        <p>
          Powered by YOINC.
        </p>
      </footer>
    </div>
  );
}

export default App;
