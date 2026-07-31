import { createServer } from 'node:http'
import { Server, type Socket } from 'socket.io'

type Team = 'A' | 'B'
type Player = { id: string; name: string; avatar: string; team: Team }
type Game = { id: string; codes: Record<Team, string>; players: Player[]; scores: Record<Team, number>; activeTeam: Team; phase: 'waiting' | 'question' | 'rebound-decision' | 'rebound-answer' | 'result'; maxPlayers: number; teamNames: Record<Team, string> }
type Session = { gameId: string; team: Team } | undefined

const httpServer = createServer()
const io = new Server(httpServer, { cors: { origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' } })
const games = new Map<string, Game>()
const publicRoom = (gameId: string) => `game:${gameId}`
const teamRoom = (gameId: string, team: Team) => `game:${gameId}:team:${team}`
const publicState = (game: Game) => ({ id: game.id, scores: game.scores, activeTeam: game.activeTeam, phase: game.phase, teamNames: game.teamNames, teamCounts: { A: game.players.filter((player) => player.team === 'A').length, B: game.players.filter((player) => player.team === 'B').length } })
const createCode = (team: Team) => {
  let code = ''
  do code = `TEAM-${team}-${Math.floor(100000 + Math.random() * 900000)}`
  while ([...games.values()].some((game) => game.codes.A === code || game.codes.B === code))
  return code
}

function requireSession(socket: Socket): { game: Game; team: Team } | null {
  const current = socket.data.session as Session
  if (!current) { socket.emit('game:error', { message: 'Session d’équipe requise.' }); return null }
  const game = games.get(current.gameId)
  if (!game) { socket.emit('game:error', { message: 'Partie introuvable.' }); return null }
  return { game, team: current.team }
}

io.on('connection', (socket) => {
  socket.on('game:create', (payload: { gameId: string; player: Omit<Player, 'id' | 'team'>; maxPlayers?: number; teamNames?: Record<Team, string> }) => {
    if (!payload?.gameId || !payload?.player?.name) return socket.emit('game:error', { message: 'Données de création invalides.' })
    if (games.has(payload.gameId)) return socket.emit('game:error', { message: 'Cette partie existe déjà.' })
    const game: Game = { id: payload.gameId, codes: { A: createCode('A'), B: createCode('B') }, players: [{ ...payload.player, id: socket.id, team: 'A' }], scores: { A: 0, B: 0 }, activeTeam: 'A', phase: 'waiting', maxPlayers: Math.min(Math.max(payload.maxPlayers ?? 3, 1), 8), teamNames: payload.teamNames ?? { A: 'Équipe A', B: 'Équipe B' } }
    games.set(game.id, game)
    socket.data.session = { gameId: game.id, team: 'A' }
    socket.join(publicRoom(game.id)); socket.join(teamRoom(game.id, 'A'))
    socket.emit('game:created', { state: publicState(game), codes: game.codes })
  })

  socket.on('game:join', (payload: { code: string; player: Omit<Player, 'id' | 'team'> }) => {
    const game = [...games.values()].find((candidate) => candidate.codes.A === payload?.code || candidate.codes.B === payload?.code)
    if (!game) return socket.emit('game:error', { message: 'Partie introuvable.' })
    const team = payload.code === game.codes.A ? 'A' : payload.code === game.codes.B ? 'B' : null
    if (!team) return socket.emit('game:error', { message: 'Code d’équipe invalide.' })
    if (game.phase !== 'waiting') return socket.emit('game:error', { message: 'Cette partie a déjà commencé.' })
    if (game.players.filter((player) => player.team === team).length >= game.maxPlayers) return socket.emit('game:error', { message: 'Cette équipe est complète.' })
    if (game.players.some((player) => player.team === team && player.name.toLocaleLowerCase() === payload.player.name.trim().toLocaleLowerCase())) return socket.emit('game:error', { message: 'Ce pseudo est déjà présent dans cette équipe.' })
    socket.data.session = { gameId: game.id, team }
    game.players.push({ ...payload.player, id: socket.id, team })
    socket.join(publicRoom(game.id)); socket.join(teamRoom(game.id, team))
    io.to(publicRoom(game.id)).emit('game:state', publicState(game))
    socket.emit('game:joined', { team, state: publicState(game), teamRoster: game.players.filter((player) => player.team === team).map(({ name, avatar }) => ({ name, avatar })) })
  })

  socket.on('team:chat', (payload: { text: string }) => {
    const current = requireSession(socket)
    if (!current || !payload?.text?.trim()) return
    // Never emit team chat to the public room or the other team's room.
    io.to(teamRoom(current.game.id, current.team)).emit('team:chat', { author: socket.id, text: payload.text.trim(), at: Date.now() })
  })

  socket.on('answer:submit', (payload: { answer: 'A' | 'B' | 'C' | 'D' }) => {
    const current = requireSession(socket)
    if (!current) return
    if (!payload?.answer || (current.game.phase !== 'question' && current.game.phase !== 'rebound-answer')) return socket.emit('game:error', { message: 'Aucune réponse ne peut être envoyée maintenant.' })
    if (current.game.activeTeam !== current.team) return socket.emit('game:error', { message: 'Votre équipe n’a pas le tour.' })
    // The submitted answer stays server-side until the game engine publishes a public round result.
    socket.emit('answer:received', { accepted: true })
  })

  socket.on('disconnect', () => {
    const current = socket.data.session as Session
    if (!current) return
    const game = games.get(current.gameId)
    if (!game) return
    game.players = game.players.filter((player) => player.id !== socket.id)
    io.to(publicRoom(game.id)).emit('game:state', publicState(game))
  })
})

httpServer.listen(Number(process.env.SOCKET_PORT ?? 3001), () => console.log('Quiz Arena Socket server listening on port 3001'))
