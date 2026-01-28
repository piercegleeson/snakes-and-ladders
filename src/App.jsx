import { useState, useRef } from 'react'
import './App.css'

const SNAKES = {
  99: 54,
  95: 72,
  92: 51,
  83: 58,
  73: 28,
  64: 19,
  48: 5,
  16: 6,
}

const LADDERS = {
  2: 38,
  7: 14,
  8: 31,
  15: 26,
  21: 42,
  28: 84,
  36: 44,
  51: 67,
  71: 91,
  78: 98,
  87: 94,
}

const PLAYER_COLORS = ['🔴', '🔵', '🟢', '🟡']
const PLAYER_NAMES = ['Red', 'Blue', 'Green', 'Yellow']

const SQUARE_SIZE = 60
const BOARD_SIZE = SQUARE_SIZE * 10

// Convert square number (1-100) to pixel coordinates (center of square)
function squareToCoords(squareNum) {
  if (squareNum <= 0) {
    // Start position: just below the board, centered on square 1
    return { x: SQUARE_SIZE / 2, y: BOARD_SIZE + 20 }
  }

  const index = squareNum - 1
  const rowFromBottom = Math.floor(index / 10)
  const posInRow = index % 10

  const col = rowFromBottom % 2 === 0 ? posInRow : 9 - posInRow
  const rowFromTop = 9 - rowFromBottom

  const x = col * SQUARE_SIZE + SQUARE_SIZE / 2
  const y = rowFromTop * SQUARE_SIZE + SQUARE_SIZE / 2

  return { x, y }
}

// Generate a wavy snake path
function generateSnakePath(start, end) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  const waves = Math.max(2, Math.floor(dist / 80))
  const waveAmplitude = 15

  const perpX = -dy / dist
  const perpY = dx / dist

  let path = `M ${start.x} ${start.y}`

  for (let i = 1; i <= waves; i++) {
    const t = i / waves
    const midT = (i - 0.5) / waves

    const direction = i % 2 === 0 ? 1 : -1
    const cpX = start.x + dx * midT + perpX * waveAmplitude * direction
    const cpY = start.y + dy * midT + perpY * waveAmplitude * direction

    const endX = start.x + dx * t
    const endY = start.y + dy * t

    path += ` Q ${cpX} ${cpY} ${endX} ${endY}`
  }

  return path
}

function Ladder({ from, to }) {
  const start = squareToCoords(from)
  const end = squareToCoords(to)

  const dx = end.x - start.x
  const dy = end.y - start.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  const perpX = (-dy / dist) * 8
  const perpY = (dx / dist) * 8

  const rail1Start = { x: start.x + perpX, y: start.y + perpY }
  const rail1End = { x: end.x + perpX, y: end.y + perpY }
  const rail2Start = { x: start.x - perpX, y: start.y - perpY }
  const rail2End = { x: end.x - perpX, y: end.y - perpY }

  const rungCount = Math.max(3, Math.floor(dist / 40))
  const rungs = []
  for (let i = 1; i < rungCount; i++) {
    const t = i / rungCount
    rungs.push({
      x1: rail1Start.x + (rail1End.x - rail1Start.x) * t,
      y1: rail1Start.y + (rail1End.y - rail1Start.y) * t,
      x2: rail2Start.x + (rail2End.x - rail2Start.x) * t,
      y2: rail2Start.y + (rail2End.y - rail2Start.y) * t,
    })
  }

  return (
    <g className="ladder">
      <line
        x1={rail1Start.x} y1={rail1Start.y}
        x2={rail1End.x} y2={rail1End.y}
        stroke="#8B4513"
        strokeWidth="4"
        strokeLinecap="round"
      />
      <line
        x1={rail2Start.x} y1={rail2Start.y}
        x2={rail2End.x} y2={rail2End.y}
        stroke="#8B4513"
        strokeWidth="4"
        strokeLinecap="round"
      />
      {rungs.map((rung, i) => (
        <line
          key={i}
          x1={rung.x1} y1={rung.y1}
          x2={rung.x2} y2={rung.y2}
          stroke="#A0522D"
          strokeWidth="3"
          strokeLinecap="round"
        />
      ))}
    </g>
  )
}

function Snake({ from, to }) {
  const start = squareToCoords(from)
  const end = squareToCoords(to)
  const path = generateSnakePath(start, end)

  return (
    <g className="snake">
      <path
        d={path}
        fill="none"
        stroke="#2d5a27"
        strokeWidth="12"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d={path}
        fill="none"
        stroke="#4a9c3d"
        strokeWidth="8"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <circle cx={start.x} cy={start.y} r="10" fill="#2d5a27" />
      <circle cx={start.x - 4} cy={start.y - 3} r="2" fill="#ff0000" />
      <circle cx={start.x + 4} cy={start.y - 3} r="2" fill="#ff0000" />
      <circle cx={end.x} cy={end.y} r="4" fill="#4a9c3d" />
    </g>
  )
}

// Animated player token
function PlayerToken({ position, color, offset, isSliding }) {
  const coords = squareToCoords(position)
  // Offset multiple players on same square
  const offsetX = (offset % 2) * 20 - 10
  const offsetY = Math.floor(offset / 2) * 20 - 10

  return (
    <div
      className={`player-token ${isSliding ? 'sliding' : ''}`}
      style={{
        left: coords.x + offsetX,
        top: coords.y + offsetY,
      }}
    >
      {color}
    </div>
  )
}

function App() {
  const [gamePhase, setGamePhase] = useState('setup')
  const [playerCount, setPlayerCount] = useState(2)
  const [playerPositions, setPlayerPositions] = useState([])
  const [animatedPositions, setAnimatedPositions] = useState([])
  const animatedPosRef = useRef([])
  const [currentPlayer, setCurrentPlayer] = useState(0)
  const [diceValue, setDiceValue] = useState(null)
  const [message, setMessage] = useState('')
  const [isRolling, setIsRolling] = useState(false)
  const [winner, setWinner] = useState(null)
  const [slidingPlayer, setSlidingPlayer] = useState(null)

  const startGame = (count) => {
    const initialPositions = Array(count).fill(0)
    setPlayerCount(count)
    setPlayerPositions(initialPositions)
    setAnimatedPositions(initialPositions)
    animatedPosRef.current = initialPositions
    setCurrentPlayer(0)
    setDiceValue(null)
    setMessage(`${PLAYER_NAMES[0]}'s turn. Roll the dice!`)
    setGamePhase('playing')
    setWinner(null)
    setSlidingPlayer(null)
  }

  // Update animated position (both state and ref)
  const updateAnimatedPos = (playerIdx, position) => {
    animatedPosRef.current = [...animatedPosRef.current]
    animatedPosRef.current[playerIdx] = position
    setAnimatedPositions([...animatedPosRef.current])
  }

  // Animate movement step by step
  const animateMovement = (playerIdx, from, to, onComplete) => {
    const steps = []

    if (to > from) {
      // Moving forward
      for (let i = from + 1; i <= to; i++) {
        steps.push(i)
      }
    } else {
      // Moving backward (snake)
      for (let i = from - 1; i >= to; i--) {
        steps.push(i)
      }
    }

    let stepIndex = 0
    const animateStep = () => {
      if (stepIndex < steps.length) {
        updateAnimatedPos(playerIdx, steps[stepIndex])
        stepIndex++
        setTimeout(animateStep, 150)
      } else {
        onComplete?.()
      }
    }

    if (steps.length > 0) {
      animateStep()
    } else {
      onComplete?.()
    }
  }

  const rollDice = () => {
    if (isRolling || gamePhase !== 'playing') return

    setIsRolling(true)
    const roll = Math.floor(Math.random() * 6) + 1
    setDiceValue(roll)

    setTimeout(() => {
      const currentPos = animatedPosRef.current[currentPlayer]
      let newPosition = currentPos + roll

      if (newPosition >= 100) {
        // Animate to 100 and win
        animateMovement(currentPlayer, currentPos, 100, () => {
          const newPositions = [...playerPositions]
          newPositions[currentPlayer] = 100
          setPlayerPositions(newPositions)
          setMessage(`${PLAYER_NAMES[currentPlayer]} rolled ${roll} and reached 100! ${PLAYER_NAMES[currentPlayer]} wins!`)
          setWinner(currentPlayer)
          setGamePhase('finished')
          setIsRolling(false)
        })
        return
      }

      let finalMessage = `${PLAYER_NAMES[currentPlayer]} rolled ${roll}. `
      const landedOn = newPosition

      // First animate to the landed square
      animateMovement(currentPlayer, currentPos, landedOn, () => {
        // Check for snakes or ladders
        if (SNAKES[landedOn]) {
          const snakeEnd = SNAKES[landedOn]
          finalMessage += `Landed on ${landedOn}. Snake! Down to ${snakeEnd}`
          setMessage(finalMessage)

          // Pause, then slide down the snake (direct movement, not step-by-step)
          setTimeout(() => {
            setSlidingPlayer(currentPlayer)
            updateAnimatedPos(currentPlayer, snakeEnd)
            const newPositions = [...playerPositions]
            newPositions[currentPlayer] = snakeEnd
            setPlayerPositions(newPositions)
            // Wait for slide animation to complete before next turn
            setTimeout(() => {
              setSlidingPlayer(null)
              nextTurn()
            }, 600)
          }, 400)
        } else if (LADDERS[landedOn]) {
          const ladderEnd = LADDERS[landedOn]
          finalMessage += `Landed on ${landedOn}. Ladder! Up to ${ladderEnd}`
          setMessage(finalMessage)

          // Pause, then climb up the ladder (direct movement, not step-by-step)
          setTimeout(() => {
            setSlidingPlayer(currentPlayer)
            updateAnimatedPos(currentPlayer, ladderEnd)
            const newPositions = [...playerPositions]
            newPositions[currentPlayer] = ladderEnd
            setPlayerPositions(newPositions)
            // Wait for climb animation to complete before next turn
            setTimeout(() => {
              setSlidingPlayer(null)
              nextTurn()
            }, 600)
          }, 400)
        } else {
          finalMessage += `Moved to ${landedOn}`
          setMessage(finalMessage)
          const newPositions = [...playerPositions]
          newPositions[currentPlayer] = landedOn
          setPlayerPositions(newPositions)
          nextTurn()
        }
      })
    }, 500)
  }

  const nextTurn = () => {
    const next = (currentPlayer + 1) % playerCount
    setCurrentPlayer(next)
    setMessage(prev => prev + ` → ${PLAYER_NAMES[next]}'s turn`)
    setIsRolling(false)
  }

  const resetGame = () => {
    setGamePhase('setup')
    setPlayerPositions([])
    setAnimatedPositions([])
    animatedPosRef.current = []
    setCurrentPlayer(0)
    setDiceValue(null)
    setMessage('')
    setWinner(null)
    setSlidingPlayer(null)
  }

  const renderBoard = () => {
    const squares = []

    for (let row = 0; row < 10; row++) {
      const rowSquares = []
      for (let col = 0; col < 10; col++) {
        const rowFromBottom = 9 - row
        let squareNum
        if (rowFromBottom % 2 === 0) {
          squareNum = rowFromBottom * 10 + col + 1
        } else {
          squareNum = rowFromBottom * 10 + (10 - col)
        }

        const isSnakeHead = SNAKES[squareNum]
        const isLadderBottom = LADDERS[squareNum]

        let squareClass = 'square'
        if (isSnakeHead) squareClass += ' snake-head'
        if (isLadderBottom) squareClass += ' ladder-bottom'

        rowSquares.push(
          <div key={squareNum} className={squareClass}>
            <span className="square-number">{squareNum}</span>
          </div>
        )
      }
      squares.push(
        <div key={row} className="board-row">
          {rowSquares}
        </div>
      )
    }
    return squares
  }

  // Calculate player offsets for overlapping tokens
  const getPlayerOffset = (playerIdx) => {
    const pos = animatedPositions[playerIdx]
    const playersAtSamePos = animatedPositions
      .slice(0, playerIdx)
      .filter(p => p === pos)
      .length
    return playersAtSamePos
  }

  if (gamePhase === 'setup') {
    return (
      <div className="game-container">
        <h1>Snakes & Ladders</h1>
        <div className="setup-screen">
          <h2>How many players?</h2>
          <div className="player-select">
            {[2, 3, 4].map(count => (
              <button key={count} onClick={() => startGame(count)} className="player-count-btn">
                {count} Players
                <div className="player-preview">
                  {PLAYER_COLORS.slice(0, count).join(' ')}
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="game-container">
      <h1>Snakes & Ladders</h1>

      <div className="game-info">
        <div className="player-status">
          {playerPositions.map((pos, idx) => (
            <div
              key={idx}
              className={`player-info ${idx === currentPlayer && gamePhase === 'playing' ? 'active' : ''} ${idx === winner ? 'winner' : ''}`}
            >
              <span className="player-icon">{PLAYER_COLORS[idx]}</span>
              <span className="player-name">{PLAYER_NAMES[idx]}</span>
              <span className="player-pos">{pos || 'Start'}</span>
            </div>
          ))}
        </div>

        <div className="dice-area">
          <div className={`dice ${isRolling ? 'rolling' : ''}`}>
            {diceValue || '?'}
          </div>
          {gamePhase === 'playing' && (
            <button onClick={rollDice} disabled={isRolling}>
              {isRolling ? 'Rolling...' : `${PLAYER_NAMES[currentPlayer]}: Roll`}
            </button>
          )}
          {gamePhase === 'finished' && (
            <button onClick={resetGame}>Play Again</button>
          )}
        </div>
        <p className="message">{message}</p>
      </div>

      <div className="board-wrapper">
        <svg className="board-overlay" width={BOARD_SIZE} height={BOARD_SIZE}>
          {Object.entries(LADDERS).map(([from, to]) => (
            <Ladder key={`ladder-${from}`} from={Number(from)} to={to} />
          ))}
          {Object.entries(SNAKES).map(([from, to]) => (
            <Snake key={`snake-${from}`} from={Number(from)} to={to} />
          ))}
        </svg>
        <div className="board">
          {renderBoard()}
        </div>
        {/* Animated player tokens */}
        {animatedPositions.map((pos, idx) => (
          <PlayerToken
            key={idx}
            position={pos}
            color={PLAYER_COLORS[idx]}
            offset={getPlayerOffset(idx)}
            isSliding={slidingPlayer === idx}
          />
        ))}
      </div>
    </div>
  )
}

export default App
