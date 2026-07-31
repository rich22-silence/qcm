import { createServer } from 'node:http'
import { Server, type Socket } from 'socket.io'

type Team = 'A' | 'B'
type Player = { id: string; name: string; avatar: string; team: Team; connected: boolean; resumeToken: string }
type GameSettings = { category: string; difficulty: string; questionsCount: number; phase: string }
type Game = { id: string; hostId: string; codes: Record<Team, string>; players: Player[]; scores: Record<Team, number>; activeTeam: Team; phase: 'waiting' | 'starting' | 'question' | 'rebound-decision' | 'rebound-answer' | 'result'; maxPlayers: number; teamNames: Record<Team, string>; settings: GameSettings }
type Session = { gameId: string; team: Team } | undefined

const httpServer = createServer()
const io = new Server(httpServer, { cors: { origin: process.env.CLIENT_ORIGIN ?? 'http://localhost:5173' } })
const games = new Map<string, Game>()
const publicRoom = (gameId: string) => `game:${gameId}`
const teamRoom = (gameId: string, team: Team) => `game:${gameId}:team:${team}`
const publicState = (game: Game) => ({ id: game.id, scores: game.scores, activeTeam: game.activeTeam, phase: game.phase, teamNames: game.teamNames, settings: game.settings, teamCounts: { A: game.players.filter((player) => player.team === 'A' && player.connected).length, B: game.players.filter((player) => player.team === 'B' && player.connected).length } })
const roster = (game: Game, team: Team) => game.players.filter((player) => player.team === team).map(({ name, avatar, connected }) => ({ name, avatar, connected }))
const broadcastRosters = (game: Game) => {
  io.to(teamRoom(game.id, 'A')).emit('team:roster', { team: 'A', players: roster(game, 'A') })
  io.to(teamRoom(game.id, 'B')).emit('team:roster', { team: 'B', players: roster(game, 'B') })
}
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
  socket.on('game:create', (payload: { gameId: string; player: Omit<Player, 'id' | 'team' | 'connected' | 'resumeToken'>; maxPlayers?: number; teamNames?: Record<Team, string>; settings?: GameSettings }) => {
    if (!payload?.gameId || !payload?.player?.name) return socket.emit('game:error', { message: 'Données de création invalides.' })
    if (games.has(payload.gameId)) return socket.emit('game:error', { message: 'Cette partie existe déjà.' })
    const resumeToken = crypto.randomUUID()
    const game: Game = { id: payload.gameId, hostId: socket.id, codes: { A: createCode('A'), B: createCode('B') }, players: [{ ...payload.player, id: socket.id, team: 'A', connected: true, resumeToken }], scores: { A: 0, B: 0 }, activeTeam: 'A', phase: 'waiting', maxPlayers: Math.min(Math.max(payload.maxPlayers ?? 3, 1), 8), teamNames: payload.teamNames ?? { A: 'Équipe A', B: 'Équipe B' }, settings: payload.settings ?? { category: 'Culture générale', difficulty: 'Difficile', questionsCount: 6, phase: 'Qualification' } }
    games.set(game.id, game)
    socket.data.session = { gameId: game.id, team: 'A' }
    socket.join(publicRoom(game.id)); socket.join(teamRoom(game.id, 'A'))
    socket.emit('game:created', { state: publicState(game), codes: game.codes, resumeToken })
    broadcastRosters(game)
  })

  socket.on('game:join', (payload: { code: string; player: Omit<Player, 'id' | 'team' | 'connected' | 'resumeToken'> }) => {
    const game = [...games.values()].find((candidate) => candidate.codes.A === payload?.code || candidate.codes.B === payload?.code)
    if (!game) return socket.emit('game:error', { message: 'Partie introuvable.' })
    const team = payload.code === game.codes.A ? 'A' : payload.code === game.codes.B ? 'B' : null
    if (!team) return socket.emit('game:error', { message: 'Code d’équipe invalide.' })
    if (game.phase !== 'waiting') return socket.emit('game:error', { message: 'Cette partie a déjà commencé.' })
    if (game.players.filter((player) => player.team === team).length >= game.maxPlayers) return socket.emit('game:error', { message: 'Cette équipe est complète.' })
    if (game.players.some((player) => player.team === team && player.name.toLocaleLowerCase() === payload.player.name.trim().toLocaleLowerCase())) return socket.emit('game:error', { message: 'Ce pseudo est déjà présent dans cette équipe.' })
    socket.data.session = { gameId: game.id, team }
    const resumeToken = crypto.randomUUID()
    game.players.push({ ...payload.player, id: socket.id, team, connected: true, resumeToken })
    socket.join(publicRoom(game.id)); socket.join(teamRoom(game.id, team))
    io.to(publicRoom(game.id)).emit('game:state', publicState(game))
    socket.emit('game:joined', { team, state: publicState(game), teamRoster: roster(game, team), resumeToken })
    broadcastRosters(game)
    io.to(teamRoom(game.id, team)).emit('lobby:notice', { message: `${payload.player.name.trim()} vient de rejoindre ${game.teamNames[team]}.` })
    socket.to(publicRoom(game.id)).except(teamRoom(game.id, team)).emit('lobby:notice', { message: 'Un joueur a rejoint la partie.' })
  })

  socket.on('team:chat', (payload: { text: string }) => {
    const current = requireSession(socket)
    if (!current || !payload?.text?.trim()) return
    // Never emit team chat to the public room or the other team's room.
    const player = current.game.players.find((candidate) => candidate.id === socket.id)
    io.to(teamRoom(current.game.id, current.team)).emit('team:chat', { team: current.team, author: player?.name ?? 'Joueur', text: payload.text.trim(), at: Date.now() })
  })

  socket.on('game:start', () => {
    const current = requireSession(socket)
    if (!current) return
    if (socket.id !== current.game.hostId) return socket.emit('game:error', { message: 'Seul l’organisateur peut lancer la partie.' })
    if (current.game.phase !== 'waiting') return socket.emit('game:error', { message: 'La partie a déjà commencé.' })
    if (!current.game.players.some((player) => player.team === 'A') || !current.game.players.some((player) => player.team === 'B')) return socket.emit('game:error', { message: 'Au moins un joueur est requis dans chaque équipe.' })
    current.game.phase = 'starting'
    io.to(publicRoom(current.game.id)).emit('game:state', publicState(current.game))
    for (const value of [3, 2, 1]) setTimeout(() => io.to(publicRoom(current.game.id)).emit('game:countdown', { value }), (3 - value) * 1000)
    setTimeout(() => {
      current.game.phase = 'question'
      io.to(publicRoom(current.game.id)).emit('game:started', { settings: current.game.settings })
      io.to(publicRoom(current.game.id)).emit('game:state', publicState(current.game))
    }, 3000)
  })

  socket.on('game:leave', () => {
    const current = requireSession(socket)
    if (!current || current.game.phase !== 'waiting') return
    if (current.game.hostId === socket.id) {
      io.to(publicRoom(current.game.id)).emit('game:closed', { message: 'Le salon a été fermé par l’organisateur.' })
      games.delete(current.game.id); socket.data.session = undefined
      return
    }
    current.game.players = current.game.players.filter((player) => player.id !== socket.id)
    socket.leave(publicRoom(current.game.id)); socket.leave(teamRoom(current.game.id, current.team)); socket.data.session = undefined
    io.to(publicRoom(current.game.id)).emit('game:state', publicState(current.game))
    broadcastRosters(current.game)
  })

  socket.on('game:resume', ({ resumeToken }: { resumeToken?: string }) => {
    const game = [...games.values()].find((candidate) => candidate.players.some((player) => player.resumeToken === resumeToken))
    const player = game?.players.find((candidate) => candidate.resumeToken === resumeToken)
    if (!game || !player) return socket.emit('game:error', { message: 'Session de lobby expirée.' })
    const wasHost = game.hostId === player.id
    player.id = socket.id; player.connected = true
    if (wasHost) game.hostId = socket.id
    socket.data.session = { gameId: game.id, team: player.team }
    socket.join(publicRoom(game.id)); socket.join(teamRoom(game.id, player.team))
    socket.emit('game:resumed', { team: player.team, state: publicState(game), teamRoster: roster(game, player.team), code: game.codes[player.team], isHost: game.hostId === socket.id })
    io.to(publicRoom(game.id)).emit('game:state', publicState(game)); broadcastRosters(game)
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
    const player = game.players.find((candidate) => candidate.id === socket.id)
    if (player) player.connected = false
    io.to(publicRoom(game.id)).emit('game:state', publicState(game))
    broadcastRosters(game)
  })
})

httpServer.listen(Number(process.env.SOCKET_PORT ?? 3001), () => console.log('Quiz Arena Socket server listening on port 3001'))
