import React, { useState, useEffect, useCallback } from 'react';
import './App.css';

const GAME_STATE = {
  IDLE: 'idle',
  STARTED: 'started',
  OVER: 'over',
  PAUSED: 'paused',
};

const GRID_SIZE = 4;
const TILE_COUNT = GRID_SIZE * GRID_SIZE;

const isSolvable = (tiles, gridSize) => {
  let invCount = 0;
  const numberedTiles = tiles.filter(tile => tile !== 0);
  for (let i = 0; i < numberedTiles.length; i++) {
    for (let j = i + 1; j < numberedTiles.length; j++) {
      if (numberedTiles[i] > numberedTiles[j]) invCount++;
    }
  }
  if (gridSize % 2 === 1) {
    return invCount % 2 === 0;
  } else {
    const emptyRow = Math.floor(tiles.indexOf(0) / gridSize);
    const rowFromBottom = gridSize - emptyRow;
    return rowFromBottom % 2 === 0 ? invCount % 2 === 1 : invCount % 2 === 0;
  }
};

const shuffleArray = (array) => {
  let arr = array.slice();
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
};

const generateSolvablePuzzle = (gridSize) => {
  let puzzle;
  const totalTiles = gridSize * gridSize;
  let attempts = 0;
  do {
    puzzle = [...Array(totalTiles - 1).keys()].map(x => x + 1).concat(0);
    puzzle = shuffleArray(puzzle);
    attempts++;
    if (attempts > 1000) return puzzle.sort(); 
  } while (!isSolvable(puzzle, gridSize));
  return puzzle;
};

const swapElements = (list, idx1, idx2) => {
  const newList = [...list];
  [newList[idx1], newList[idx2]] = [newList[idx2], newList[idx1]];
  return newList;
};

const areNeighbours = (emptyIdx, tileIdx, gridSize) => {
  const [er, ec] = [Math.floor(emptyIdx / gridSize), emptyIdx % gridSize];
  const [tr, tc] = [Math.floor(tileIdx / gridSize), tileIdx % gridSize];
  return (Math.abs(er - tr) === 1 && ec === tc) || (Math.abs(ec - tc) === 1 && er === tr);
};

const isSolved = (tiles, gridSize) => {
  for (let i = 0; i < tiles.length - 1; i++) {
    if (tiles[i] !== i + 1) return false;
  }
  return tiles[tiles.length - 1] === 0;
};

const Tile = ({ number, onClick, isEmpty }) => (
  <div
    className={`tile ${isEmpty ? 'tile-empty' : ''}`}
    onClick={!isEmpty ? onClick : undefined}
    role={!isEmpty ? 'button' : undefined}
    tabIndex={!isEmpty ? 0 : undefined}
    onKeyDown={!isEmpty ? (e) => (e.key === 'Enter' || e.key === ' ') && onClick() : undefined}
  >
    {isEmpty ? '' : number}
  </div>
);

const Board = ({ numbers, gridSize, onTileClick }) => (
  <div className="board-container">
    <div
      className="game-board"
      style={{ gridTemplateColumns: `repeat(${gridSize}, 1fr)` }}
    >
      {numbers.map((number, index) => (
        <Tile
          key={index}
          number={number}
          onClick={() => onTileClick(index)}
          isEmpty={number === 0}
        />
      ))}
    </div>
  </div>
);

const App = () => {
  const [numbers, setNumbers] = useState(generateSolvablePuzzle(GRID_SIZE));
  const [moves, setMoves] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const [gameState, setGameState] = useState(GAME_STATE.IDLE);
  const [timerId, setTimerId] = useState(null);
  const [difficulty, setDifficulty] = useState('medium');
  const [bestScores, setBestScores] = useState({
    easy: { moves: null, time: null },
    medium: { moves: null, time: null },
    hard: { moves: null, time: null },
  });

  const startTimer = useCallback(() => {
    if (timerId) return;
    const id = setInterval(() => setSeconds(s => s + 1), 1000);
    setTimerId(id);
  }, [timerId]);

  const clearTimer = () => {
    if (timerId) {
      clearInterval(timerId);
      setTimerId(null);
    }
  };

  const resetGame = () => {
    clearTimer();
    setNumbers(generateSolvablePuzzle(GRID_SIZE));
    setMoves(0);
    setSeconds(0);
    setGameState(GAME_STATE.IDLE);
  };

  const handleTileClick = (tileIndex) => {
    if (gameState === GAME_STATE.OVER || gameState === GAME_STATE.PAUSED) return;

    const emptyIndex = numbers.indexOf(0);
    if (areNeighbours(emptyIndex, tileIndex, GRID_SIZE)) {
      const newNumbers = swapElements(numbers, emptyIndex, tileIndex);
      const newMoves = moves + 1;

      if (gameState === GAME_STATE.IDLE) {
        setGameState(GAME_STATE.STARTED);
        startTimer();
      }

      if (isSolved(newNumbers, GRID_SIZE)) {
        clearTimer();
        updateBestScores(newMoves, seconds);
        setGameState(GAME_STATE.OVER);
      }

      setNumbers(newNumbers);
      setMoves(newMoves);
    }
  };

  const updateBestScores = (newMoves, newSeconds) => {
    setBestScores(prev => {
      const prevMoves = prev[difficulty].moves;
      const prevTime = prev[difficulty].time;
      const isBetter = !prevMoves || newMoves < prevMoves || (newMoves === prevMoves && newSeconds < prevTime);
      if (isBetter) {
        return {
          ...prev,
          [difficulty]: { moves: newMoves, time: newSeconds },
        };
      }
      return prev;
    });
  };

  useEffect(() => {
    const saved = localStorage.getItem('bestScores15Puzzle');
    if (saved) setBestScores(JSON.parse(saved));
  }, []);

  useEffect(() => {
    localStorage.setItem('bestScores15Puzzle', JSON.stringify(bestScores));
  }, [bestScores]);

  useEffect(() => () => clearTimer(), []);

  const handleKeyDown = (event) => {
    if (gameState === GAME_STATE.OVER || gameState === GAME_STATE.PAUSED) return;

    const emptyIndex = numbers.indexOf(0);
    const row = Math.floor(emptyIndex / GRID_SIZE);
    const col = emptyIndex % GRID_SIZE;
    let target = -1;

    switch (event.key) {
      case 'ArrowUp': if (row < GRID_SIZE - 1) target = emptyIndex + GRID_SIZE; break;
      case 'ArrowDown': if (row > 0) target = emptyIndex - GRID_SIZE; break;
      case 'ArrowLeft': if (col < GRID_SIZE - 1) target = emptyIndex + 1; break;
      case 'ArrowRight': if (col > 0) target = emptyIndex - 1; break;
      default: return;
    }

    if (target >= 0 && target < TILE_COUNT) {
      event.preventDefault();
      handleTileClick(target);
    }
  };

  useEffect(() => {
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  });

  return (
    <div className="app-container">
      <h1 className="app-title">15 Puzzle Game</h1>

      <div className="game-container">
        <div className="game-stats">
          <div className="stat-item"><span>Moves:</span> {moves}</div>
          <div className="stat-item"><span>Time:</span> {seconds}s</div>
        </div>

        <Board numbers={numbers} gridSize={GRID_SIZE} onTileClick={handleTileClick} />

        <div className="button-row">
          <button className="btn" onClick={resetGame}>Restart</button>
          {gameState === GAME_STATE.PAUSED ? (
            <button className="btn" onClick={() => { setGameState(GAME_STATE.STARTED); startTimer(); }}>Resume</button>
          ) : gameState === GAME_STATE.STARTED ? (
            <button className="btn" onClick={() => { setGameState(GAME_STATE.PAUSED); clearTimer(); }}>Pause</button>
          ) : null}
        </div>
      </div>

      {gameState === GAME_STATE.OVER && (
        <div className="overlay">
          <div className="overlay-content">
            <h2>🎉 You Win!</h2>
            <p>{`Solved in ${moves} moves and ${seconds} seconds.`}</p>
            <button className="btn" onClick={resetGame}>Play Again</button>
          </div>
        </div>
      )}

      {gameState === GAME_STATE.PAUSED && (
        <div className="overlay">
          <div className="overlay-content">
            <h2>Game Paused</h2>
            <p>Click resume to continue.</p>
            <button className="btn" onClick={() => { setGameState(GAME_STATE.STARTED); startTimer(); }}>Resume</button>
          </div>
        </div>
      )}
    </div>
  );
};

export default App;
