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

// Convert square number to visual grid position
function squareToRowCol(squareNum) {
  const index = squareNum - 1
  const rowFromBottom = Math.floor(index / 10)
  const posInRow = index % 10
  const col = rowFromBottom % 2 === 0 ? posInRow : 9 - posInRow
  return { rowFromBottom, col }
}

// Convert visual grid position to square number
function rowColToSquare(rowFromBottom, col) {
  if (rowFromBottom % 2 === 0) {
    return rowFromBottom * 10 + col + 1
  } else {
    return rowFromBottom * 10 + (10 - col)
  }
}

// Get the square number directly above (one visual row up)
function getSquareAbove(squareNum) {
  if (squareNum <= 0 || squareNum > 90) return null
  const { rowFromBottom, col } = squareToRowCol(squareNum)
  const newRow = rowFromBottom + 1
  if (newRow > 9) return null
  return rowColToSquare(newRow, col)
}

const SQUARE_COLORS = ['color-green', 'color-red', 'color-blue', 'color-yellow']

// Generate a random color map ensuring no horizontal or vertical repeats
function generateColorMap() {
  const colorMap = []

  for (let row = 0; row < 10; row++) {
    const rowColors = []
    for (let col = 0; col < 10; col++) {
      const forbidden = []

      // Check left neighbor
      if (col > 0) {
        forbidden.push(rowColors[col - 1])
      }
      // Check top neighbor
      if (row > 0) {
        forbidden.push(colorMap[row - 1][col])
      }

      // Get available colors
      const available = SQUARE_COLORS.filter(c => !forbidden.includes(c))

      // Pick random from available
      const color = available[Math.floor(Math.random() * available.length)]
      rowColors.push(color)
    }
    colorMap.push(rowColors)
  }

  return colorMap
}

// Convert square number (1-100) to pixel coordinates (center of square)
function squareToCoords(squareNum) {
  if (squareNum <= 0) {
    return { x: SQUARE_SIZE / 2, y: BOARD_SIZE + 20 }
  }

  const { rowFromBottom, col } = squareToRowCol(squareNum)
  const rowFromTop = 9 - rowFromBottom

  return {
    x: col * SQUARE_SIZE + SQUARE_SIZE / 2,
    y: rowFromTop * SQUARE_SIZE + SQUARE_SIZE / 2,
  }
}

// Generate a wavy snake path with pointy tail
function generateSnakePath(start, end) {
  const dx = end.x - start.x
  const dy = end.y - start.y
  const dist = Math.sqrt(dx * dx + dy * dy)

  const waves = Math.max(2, Math.floor(dist / 80))
  const waveAmplitude = 55

  const perpX = -dy / dist
  const perpY = dx / dist

  let path = `M ${start.x} ${start.y}`
  let lastCpX, lastCpY
  let firstCpX, firstCpY

  for (let i = 1; i <= waves; i++) {
    const t = i / waves
    const midT = (i - 0.5) / waves

    const direction = i % 2 === 0 ? 1 : -1
    lastCpX = start.x + dx * midT + perpX * waveAmplitude * direction
    lastCpY = start.y + dy * midT + perpY * waveAmplitude * direction

    if (i === 1) {
      firstCpX = lastCpX
      firstCpY = lastCpY
    }

    const endX = start.x + dx * t
    const endY = start.y + dy * t

    path += ` Q ${lastCpX} ${lastCpY} ${endX} ${endY}`
  }

  // Calculate tail direction and tip
  const tailDirX = end.x - lastCpX
  const tailDirY = end.y - lastCpY
  const tailDist = Math.sqrt(tailDirX * tailDirX + tailDirY * tailDirY)
  const normX = tailDirX / tailDist
  const normY = tailDirY / tailDist
  const tailLength = 20
  const tipX = end.x + normX * tailLength
  const tipY = end.y + normY * tailLength
  const tipXinner = end.x + normX  * (tailLength - 5)
  const tipYinner = end.y + normY * (tailLength - 5)


  // Build teardrop head at the start of the path
  const headDirX = start.x - firstCpX
  const headDirY = start.y - firstCpY
  const headDist = Math.sqrt(headDirX * headDirX + headDirY * headDirY)
  const headNormX = headDirX / headDist
  const headNormY = headDirY / headDist
  const headPerpX = -headNormY
  const headPerpY = headNormX

  // Teardrop dimensions
  const tipLength = 10   // how far the snout extends forward
  const backOffset = 10   // how far the round part extends behind start
  const width = 10       // how wide the head is at its widest
  const tipBulge = 2     // how wide the curve is near the tip

  // Key points
  const headTipX = start.x + headNormX * tipLength
  const headTipY = start.y + headNormY * tipLength
  const backX = start.x - headNormX * backOffset
  const backY = start.y - headNormY * backOffset

  // Teardrop using two cubic beziers: tip → right side → back, back → left side → tip
  const headPath = `M ${headTipX} ${headTipY}
    C ${headTipX + headPerpX * tipBulge} ${headTipY + headPerpY * tipBulge},
      ${backX + headPerpX * width} ${backY + headPerpY * width},
      ${backX} ${backY}
    C ${backX - headPerpX * width} ${backY - headPerpY * width},
      ${headTipX - headPerpX * tipBulge} ${headTipY - headPerpY * tipBulge},
      ${headTipX} ${headTipY}
    Z`

  const fullPath = headPath + ` M ${start.x} ${start.y} ` + path.replace(`M ${start.x} ${start.y}`, '')

  return {
    path: fullPath,
    tail: { tipX, tipY, tipXinner, tipYinner, normX, normY, endX: end.x, endY: end.y },
    head: { normX: headNormX, normY: headNormY, perpX: headPerpX, perpY: headPerpY, startX: start.x, startY: start.y }
  }
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
  const { path, tail, head } = generateSnakePath(start, end)

  // Calculate tail polygon points (tapers from body width to point)
  const outerWidth = 6  // Half of outer stroke width (12/2)
  const innerWidth = 4  // Half of inner stroke width (8/2)

  // Perpendicular to tail direction
  const tailPerpX = -tail.normY
  const tailPerpY = tail.normX

  // Outer tail (dark border)
  const outerTail = `${tail.endX + tailPerpX * outerWidth},${tail.endY + tailPerpY * outerWidth} ${tail.tipX},${tail.tipY} ${tail.endX - tailPerpX * outerWidth},${tail.endY - tailPerpY * outerWidth}`

  // Inner tail (light fill)
  const innerTail = `${tail.endX + tailPerpX * innerWidth},${tail.endY + tailPerpY * innerWidth} ${tail.tipXinner},${tail.tipYinner} ${tail.endX - tailPerpX * innerWidth},${tail.endY - tailPerpY * innerWidth}`

  // Eye positions
  const eyeOffsetForward = 3
  const eyeOffsetSide = 4
  const eyeLeftX = head.startX + head.normX * eyeOffsetForward + head.perpX * eyeOffsetSide
  const eyeLeftY = head.startY + head.normY * eyeOffsetForward + head.perpY * eyeOffsetSide
  const eyeRightX = head.startX + head.normX * eyeOffsetForward - head.perpX * eyeOffsetSide
  const eyeRightY = head.startY + head.normY * eyeOffsetForward - head.perpY * eyeOffsetSide

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
      <polygon points={outerTail} fill="#2d5a27" />
      <polygon points={innerTail} fill="#4a9c3d" />
      <circle cx={eyeLeftX} cy={eyeLeftY} r="2" fill="#ff0000" />
      <circle cx={eyeRightX} cy={eyeRightY} r="2" fill="#ff0000" />
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
  const [gameResult, setGameResult] = useState(null) // 'team' | 'board' | null
  const [slidingPlayer, setSlidingPlayer] = useState(null)
  const [rollCount, setRollCount] = useState(0)
  const [colorMap, setColorMap] = useState(() => generateColorMap())
  const [legUpOffers, setLegUpOffers] = useState([])  // legUpOffers[i] = index of player who gave the leg up, or null
  const [showingLegUp, setShowingLegUp] = useState(false)

  const startGame = (count) => {
    const initialPositions = Array(count).fill(0)
    setPlayerCount(count)
    setPlayerPositions(initialPositions)
    setAnimatedPositions(initialPositions)
    animatedPosRef.current = initialPositions
    setCurrentPlayer(0)
    setDiceValue(null)
    setMessage(`Team effort! ${PLAYER_NAMES[0]} rolls first.`)
    setGamePhase('playing')
    setGameResult(null)
    setSlidingPlayer(null)
    setRollCount(0)
    setColorMap(generateColorMap())
    setLegUpOffers(Array(count).fill(null))
    setShowingLegUp(false)
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

  // After a player moves, check for boost offers:
  // "Leg up" - landed on same square as another player
  // "Hand up" - landed on the square directly above another player
  const checkBoostOffers = (movedPlayerIdx, newPositions) => {
    const landedSquare = newPositions[movedPlayerIdx]
    if (landedSquare <= 0) return

    setLegUpOffers(prev => {
      const updated = [...prev]
      for (let i = 0; i < newPositions.length; i++) {
        if (i === movedPlayerIdx) continue
        const otherPos = newPositions[i]
        if (otherPos <= 0 || otherPos > 90) continue

        // Leg up: landed on the same square
        if (otherPos === landedSquare) {
          updated[i] = { giverIdx: movedPlayerIdx, type: 'legUp' }
        }
        // Hand up: landed directly above another player
        else if (getSquareAbove(otherPos) === landedSquare) {
          updated[i] = { giverIdx: movedPlayerIdx, type: 'handUp' }
        }
      }
      return updated
    })
  }

  const acceptBoost = () => {
    setShowingLegUp(false)
    setIsRolling(true)

    const currentPos = animatedPosRef.current[currentPlayer]
    const offer = legUpOffers[currentPlayer]
    const newPosition = getSquareAbove(currentPos)
    const boostName = offer.type === 'legUp' ? 'leg up' : 'hand up'

    // Clear this player's offer
    setLegUpOffers(prev => {
      const updated = [...prev]
      updated[currentPlayer] = null
      return updated
    })

    // Check for win
    if (newPosition >= 100) {
      animateMovement(currentPlayer, currentPos, 100, () => {
        const newPositions = [...playerPositions]
        newPositions[currentPlayer] = 100
        setPlayerPositions(newPositions)
        setMessage(`${PLAYER_NAMES[currentPlayer]} took the ${boostName} and reached 100! Team wins!`)
        setGameResult('team')
        setGamePhase('finished')
        setIsRolling(false)
      })
      return
    }

    setMessage(`${PLAYER_NAMES[currentPlayer]} took the ${boostName}! Moved to ${newPosition}`)
    setDiceValue('↑')

    // Animate the vertical jump (slide, not step-by-step)
    setSlidingPlayer(currentPlayer)
    updateAnimatedPos(currentPlayer, newPosition)
    const newPositions = [...playerPositions]
    newPositions[currentPlayer] = newPosition
    setPlayerPositions(newPositions)

    setTimeout(() => {
      setSlidingPlayer(null)
      // Check for snakes or ladders at the new position
      if (SNAKES[newPosition]) {
        const snakeEnd = SNAKES[newPosition]
        setMessage(`${PLAYER_NAMES[currentPlayer]} took the ${boostName} to ${newPosition}. Snake! Down to ${snakeEnd}`)
        setTimeout(() => {
          setSlidingPlayer(currentPlayer)
          updateAnimatedPos(currentPlayer, snakeEnd)
          const updatedPositions = [...newPositions]
          updatedPositions[currentPlayer] = snakeEnd
          setPlayerPositions(updatedPositions)
          checkBoostOffers(currentPlayer, updatedPositions)
          setTimeout(() => {
            setSlidingPlayer(null)
            finishTurn(rollCount)  // Leg up doesn't count as a roll
          }, 600)
        }, 400)
      } else if (LADDERS[newPosition]) {
        const ladderEnd = LADDERS[newPosition]
        setMessage(`${PLAYER_NAMES[currentPlayer]} took the ${boostName} to ${newPosition}. Ladder! Up to ${ladderEnd}`)
        setTimeout(() => {
          setSlidingPlayer(currentPlayer)
          updateAnimatedPos(currentPlayer, ladderEnd)
          const updatedPositions = [...newPositions]
          updatedPositions[currentPlayer] = ladderEnd
          setPlayerPositions(updatedPositions)
          checkBoostOffers(currentPlayer, updatedPositions)
          setTimeout(() => {
            setSlidingPlayer(null)
            finishTurn(rollCount)
          }, 600)
        }, 400)
      } else {
        checkBoostOffers(currentPlayer, newPositions)
        finishTurn(rollCount)
      }
    }, 600)
  }

  const declineLegUp = () => {
    setShowingLegUp(false)
    // Clear this player's leg-up offer
    setLegUpOffers(prev => {
      const updated = [...prev]
      updated[currentPlayer] = null
      return updated
    })
    setMessage(`${PLAYER_NAMES[currentPlayer]} declined the leg up. Roll the dice!`)
  }

  const rollDice = () => {
    if (isRolling || showingLegUp || gamePhase !== 'playing') return

    const newRollCount = rollCount + 1
    setRollCount(newRollCount)
    setIsRolling(true)
    const roll = Math.floor(Math.random() * 6) + 1
    setDiceValue(roll)

    setTimeout(() => {
      const currentPos = animatedPosRef.current[currentPlayer]
      let newPosition = currentPos + roll

      // Check if team wins (any player reaches 100+)
      if (newPosition >= 100) {
        animateMovement(currentPlayer, currentPos, 100, () => {
          const newPositions = [...playerPositions]
          newPositions[currentPlayer] = 100
          setPlayerPositions(newPositions)
          setMessage(`${PLAYER_NAMES[currentPlayer]} reached 100! Team wins!`)
          setGameResult('team')
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
          finalMessage += `Snake! Down to ${snakeEnd}`
          setMessage(finalMessage)

          setTimeout(() => {
            setSlidingPlayer(currentPlayer)
            updateAnimatedPos(currentPlayer, snakeEnd)
            const newPositions = [...playerPositions]
            newPositions[currentPlayer] = snakeEnd
            setPlayerPositions(newPositions)
            checkBoostOffers(currentPlayer, newPositions)
            setTimeout(() => {
              setSlidingPlayer(null)
              finishTurn(newRollCount)
            }, 600)
          }, 400)
        } else if (LADDERS[landedOn]) {
          const ladderEnd = LADDERS[landedOn]
          finalMessage += `Ladder! Up to ${ladderEnd}`
          setMessage(finalMessage)

          setTimeout(() => {
            setSlidingPlayer(currentPlayer)
            updateAnimatedPos(currentPlayer, ladderEnd)
            const newPositions = [...playerPositions]
            newPositions[currentPlayer] = ladderEnd
            setPlayerPositions(newPositions)
            checkBoostOffers(currentPlayer, newPositions)
            setTimeout(() => {
              setSlidingPlayer(null)
              finishTurn(newRollCount)
            }, 600)
          }, 400)
        } else {
          finalMessage += `Moved to ${landedOn}`
          setMessage(finalMessage)
          const newPositions = [...playerPositions]
          newPositions[currentPlayer] = landedOn
          setPlayerPositions(newPositions)
          checkBoostOffers(currentPlayer, newPositions)
          finishTurn(newRollCount)
        }
      })
    }, 500)
  }

  const finishTurn = (currentRollCount) => {
    // Check if board wins (exceeded max rolls)
    const maxRolls = playerCount * 30
    if (currentRollCount >= maxRolls) {
      setMessage(`Roll ${currentRollCount} of ${maxRolls}. Out of rolls! The board wins!`)
      setGameResult('board')
      setGamePhase('finished')
      setIsRolling(false)
      return
    }

    const next = (currentPlayer + 1) % playerCount
    setCurrentPlayer(next)
    setIsRolling(false)

    // Check if the next player has a leg-up offer
    // (use setTimeout to let state settle after setCurrentPlayer)
    setTimeout(() => {
      const pos = animatedPosRef.current[next]
      setLegUpOffers(prev => {
        const offer = prev[next]
        if (offer !== null && pos > 0 && pos <= 90) {
          const above = getSquareAbove(pos)
          if (above) {
            setShowingLegUp(true)
            if (offer.type === 'legUp') {
              setMessage(`${PLAYER_NAMES[offer.giverIdx]} can give ${PLAYER_NAMES[next]} a leg up! Move from ${pos} to ${above}?`)
            } else {
              setMessage(`${PLAYER_NAMES[offer.giverIdx]} can give ${PLAYER_NAMES[next]} a hand up! Move from ${pos} to ${above}?`)
            }
          }
        }
        return prev
      })
    }, 50)
  }

  const resetGame = () => {
    setGamePhase('setup')
    setPlayerPositions([])
    setAnimatedPositions([])
    animatedPosRef.current = []
    setCurrentPlayer(0)
    setDiceValue(null)
    setMessage('')
    setGameResult(null)
    setSlidingPlayer(null)
    setRollCount(0)
    setColorMap(generateColorMap())
    setLegUpOffers([])
    setShowingLegUp(false)
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

        let squareClass = `square ${colorMap[row][col]}`
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

  const maxRolls = playerCount * 30
  const rollsRemaining = maxRolls - rollCount

  if (gamePhase === 'setup') {
    return (
      <div className="game-container">
        <h1>Snakes & Ladders</h1>
        <p className="coop-subtitle">Cooperative Team Game</p>
        <div className="setup-screen">
          <h2>How many players?</h2>
          <p className="setup-rules">Get any player to 100 within shared rolls to win!</p>
          <div className="player-select">
            {[2, 3, 4].map(count => (
              <button key={count} onClick={() => startGame(count)} className="player-count-btn">
                {count} Players
                <div className="player-preview">
                  {PLAYER_COLORS.slice(0, count).join(' ')}
                </div>
                <div className="roll-preview">{count * 30} rolls</div>
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
        {/* Roll counter */}
        <div className={`roll-counter ${rollsRemaining <= 10 ? 'danger' : ''}`}>
          <span className="roll-label">Rolls remaining:</span>
          <span className="roll-value">{rollsRemaining}</span>
        </div>

        <div className="player-status">
          {playerPositions.map((pos, idx) => (
            <div
              key={idx}
              className={`player-info ${idx === currentPlayer && gamePhase === 'playing' ? 'active' : ''}`}
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
          {gamePhase === 'playing' && !showingLegUp && (
            <button onClick={rollDice} disabled={isRolling}>
              {isRolling ? 'Rolling...' : `${PLAYER_NAMES[currentPlayer]}: Roll`}
            </button>
          )}
          {gamePhase === 'finished' && (
            <button onClick={resetGame}>Play Again</button>
          )}
        </div>
        {showingLegUp && (
          <div className="leg-up-choice">
            <button onClick={acceptBoost} className="leg-up-btn accept">Take it!</button>
            <button onClick={declineLegUp} className="leg-up-btn decline">No thanks, roll instead</button>
          </div>
        )}
        <p className="message">{message}</p>
        {gameResult && (
          <p className={`game-result ${gameResult}`}>
            {gameResult === 'team' ? '🎉 Team Wins! 🎉' : '🐍 The Board Wins! 🐍'}
          </p>
        )}
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
