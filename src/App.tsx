import { useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import { io, type Socket } from 'socket.io-client'
import { Clock3, Crown, MessageCircle, ShieldCheck, Sparkles, Trophy, Users, Zap } from 'lucide-react'
import './App.css'

type Screen = 'home' | 'solo-config' | 'duel-config' | 'join' | 'waiting' | 'quiz' | 'results'
type GameMode = 'solo' | 'duel'
type AnswerKey = 'A' | 'B' | 'C' | 'D'
type Difficulty = 'Facile' | 'Moyen' | 'Difficile' | 'Expert'
type Category = 'Culture générale' | 'Histoire' | 'Géographie' | 'Sciences et technologies' | 'Informatique' | 'Intelligence artificielle' | 'Sport' | 'Cinéma et musique' | 'Actualités internationales' | 'Arts et culture'
type TeamKey = 'A' | 'B'
type DuelPhase = 'Qualification' | 'Demi-finale' | 'Grande Finale'

type Question = {
  id: number
  question: string
  options: Record<AnswerKey, string>
  correctAnswer: AnswerKey
  category: Category
  difficulty: Difficulty
  explanation: string
}

type AnswerRecord = {
  questionId: number
  selectedAnswer: AnswerKey | null
  isCorrect: boolean
  points: number
  roundLabel: string
}

type DuelRoundSummary = {
  teamAResponse: AnswerKey | null
  teamBResponse: AnswerKey | null
  teamAResult: 'pending' | 'correct' | 'incorrect' | 'refused'
  teamBResult: 'pending' | 'correct' | 'incorrect' | 'refused'
  teamAPoints: number
  teamBPoints: number
  explanation: string
}

const categories: Category[] = [
  'Culture générale',
  'Histoire',
  'Géographie',
  'Sciences et technologies',
  'Informatique',
  'Intelligence artificielle',
  'Sport',
  'Cinéma et musique',
  'Actualités internationales',
  'Arts et culture',
]

const difficulties: Difficulty[] = ['Facile', 'Moyen', 'Difficile', 'Expert']
const phases: DuelPhase[] = ['Qualification', 'Demi-finale', 'Grande Finale']
const avatars = ['😀', '😎', '🤓', '🧑‍💻', '🏆']

function shuffleArray<T>(array: T[]) {
  const result = [...array]
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[result[i], result[j]] = [result[j], result[i]]
  }
  return result
}

type DifficultFact = {
  prompt: string
  answer: string
  distractors: [string, string, string]
  explanation: string
}

const difficultFacts: Record<'Histoire' | 'Géographie' | 'Sciences et technologies', DifficultFact[]> = {
  Histoire: [
    { prompt: 'Quel traité de 1648 est généralement associé à la fin de la guerre de Trente Ans ?', answer: 'Les traités de Westphalie', distractors: ['Le traité d’Utrecht', 'Le traité de Vienne', 'Le traité de Versailles'], explanation: 'Les traités de Westphalie, conclus en 1648, mettent fin à la guerre de Trente Ans.' },
    { prompt: 'Quel souverain promulgua l’édit de Nantes en 1598 ?', answer: 'Henri IV', distractors: ['Louis XIII', 'François Ier', 'Louis XIV'], explanation: 'Henri IV signe l’édit de Nantes afin d’apaiser les guerres de Religion.' },
    { prompt: 'Quelle bataille de 732 opposa les forces franques de Charles Martel à une armée omeyyade ?', answer: 'La bataille de Poitiers', distractors: ['La bataille de Bouvines', 'La bataille de Tolbiac', 'La bataille de Crécy'], explanation: 'La bataille de Poitiers est traditionnellement datée de 732.' },
    { prompt: 'Quel empereur romain fit de Constantinople la nouvelle capitale impériale en 330 ?', answer: 'Constantin Ier', distractors: ['Théodose Ier', 'Dioclétien', 'Justinien Ier'], explanation: 'Constantin Ier inaugure Constantinople en 330.' },
    { prompt: 'Quel document de 1215 limita le pouvoir du roi Jean sans Terre ?', answer: 'La Magna Carta', distractors: ['Le Bill of Rights', 'L’Acte de suprématie', 'La Pétition des droits'], explanation: 'La Magna Carta est imposée au roi Jean d’Angleterre en 1215.' },
    { prompt: 'Quel pharaon est associé à une réforme religieuse centrée sur le culte d’Aton ?', answer: 'Akhenaton', distractors: ['Ramsès II', 'Toutânkhamon', 'Thoutmôsis III'], explanation: 'Akhenaton promeut le culte d’Aton pendant la XVIIIe dynastie.' },
    { prompt: 'Quel chef carthaginois franchit les Alpes avec des éléphants durant la deuxième guerre punique ?', answer: 'Hannibal Barca', distractors: ['Hamilcar Barca', 'Scipion l’Africain', 'Hasdrubal Gisco'], explanation: 'Hannibal mène son armée de l’Hispanie vers l’Italie à travers les Alpes.' },
    { prompt: 'Quelle dynastie chinoise fit construire une grande partie de la Cité interdite ?', answer: 'La dynastie Ming', distractors: ['La dynastie Tang', 'La dynastie Song', 'La dynastie Qing'], explanation: 'La Cité interdite est construite au début de la dynastie Ming.' },
    { prompt: 'Quel accord de 1978 encadra le retrait israélien du Sinaï après la médiation américaine ?', answer: 'Les accords de Camp David', distractors: ['Les accords d’Oslo', 'Les accords de Dayton', 'Les accords de Taëf'], explanation: 'Les accords de Camp David conduisent au traité de paix israélo-égyptien de 1979.' },
    { prompt: 'Quel dirigeant soviétique lança la perestroïka dans les années 1980 ?', answer: 'Mikhaïl Gorbatchev', distractors: ['Leonid Brejnev', 'Nikita Khrouchtchev', 'Boris Eltsine'], explanation: 'Gorbatchev engage la perestroïka et la glasnost en URSS.' },
  ],
  Géographie: [
    { prompt: 'Quel détroit sépare l’Asie de l’Amérique du Nord ?', answer: 'Le détroit de Béring', distractors: ['Le détroit de Magellan', 'Le détroit d’Ormuz', 'Le détroit de Gibraltar'], explanation: 'Le détroit de Béring sépare la Sibérie de l’Alaska.' },
    { prompt: 'Quelle mer intérieure se situe entre l’Europe et l’Asie occidentale ?', answer: 'La mer Caspienne', distractors: ['La mer Noire', 'La mer d’Aral', 'La mer Rouge'], explanation: 'La mer Caspienne est la plus grande étendue d’eau intérieure du monde.' },
    { prompt: 'Quel fleuve traverse successivement Vienne, Bratislava, Budapest et Belgrade ?', answer: 'Le Danube', distractors: ['Le Rhin', 'La Volga', 'L’Elbe'], explanation: 'Le Danube traverse ou borde dix pays européens.' },
    { prompt: 'Quel pays possède l’exclave de Cabinda ?', answer: 'L’Angola', distractors: ['La République du Congo', 'La Namibie', 'Le Gabon'], explanation: 'Cabinda est une province angolaise séparée du reste du pays par une bande de la RDC.' },
    { prompt: 'Quel sommet est le point culminant de l’Afrique ?', answer: 'Le Kilimandjaro', distractors: ['Le mont Kenya', 'Le Rwenzori', 'Le Toubkal'], explanation: 'Le Kilimandjaro, en Tanzanie, culmine à 5 895 mètres.' },
    { prompt: 'Quel courant marin chaud contribue au climat tempéré de l’Europe occidentale ?', answer: 'Le Gulf Stream', distractors: ['Le courant de Humboldt', 'Le courant du Labrador', 'Le courant de Benguela'], explanation: 'Le Gulf Stream transporte des eaux chaudes vers l’Atlantique Nord.' },
    { prompt: 'Dans quel pays se trouve la majeure partie du désert du Karakoum ?', answer: 'Le Turkménistan', distractors: ['L’Ouzbékistan', 'Le Kazakhstan', 'La Mongolie'], explanation: 'Le Karakoum couvre une grande partie du territoire turkmène.' },
    { prompt: 'Quelle chaîne montagneuse forme une frontière naturelle majeure entre la France et l’Espagne ?', answer: 'Les Pyrénées', distractors: ['Les Alpes', 'Les Carpates', 'Les Apennins'], explanation: 'Les Pyrénées s’étendent entre le golfe de Gascogne et la Méditerranée.' },
    { prompt: 'Quel archipel autonome danois est situé dans l’Atlantique Nord ?', answer: 'Les îles Féroé', distractors: ['Les Açores', 'Les Shetland', 'Les Orcades'], explanation: 'Les îles Féroé constituent un territoire autonome du royaume du Danemark.' },
    { prompt: 'Quelle capitale nationale est située sur les rives du lac Victoria ?', answer: 'Kampala', distractors: ['Kigali', 'Dodoma', 'Nairobi'], explanation: 'Kampala est la capitale de l’Ouganda, au nord du lac Victoria.' },
  ],
  'Sciences et technologies': [
    { prompt: 'Quel protocole assure le chiffrement des communications HTTPS ?', answer: 'TLS', distractors: ['FTP', 'DNS', 'SMTP'], explanation: 'HTTPS repose sur TLS pour chiffrer les échanges entre navigateur et serveur.' },
    { prompt: 'Quelle structure de données suit le principe « premier entré, premier sorti » ?', answer: 'Une file', distractors: ['Une pile', 'Un arbre binaire', 'Une table de hachage'], explanation: 'Une file applique le principe FIFO : first in, first out.' },
    { prompt: 'Quel mécanisme de consensus est utilisé par Bitcoin ?', answer: 'La preuve de travail', distractors: ['La preuve d’enjeu déléguée', 'Le Raft', 'Le Paxos'], explanation: 'Bitcoin utilise un mécanisme de preuve de travail (proof of work).' },
    { prompt: 'Quel est le rôle principal d’un compilateur ?', answer: 'Traduire du code source vers une forme exécutable', distractors: ['Chiffrer un disque', 'Acheminer des paquets réseau', 'Indexer une base de données'], explanation: 'Un compilateur transforme le code source en code machine ou intermédiaire.' },
    { prompt: 'Quelle couche du modèle OSI est responsable du routage ?', answer: 'La couche réseau', distractors: ['La couche liaison', 'La couche transport', 'La couche session'], explanation: 'La couche réseau gère notamment l’adressage logique et le routage.' },
    { prompt: 'Quel algorithme de chiffrement asymétrique repose sur la difficulté de factoriser de grands entiers ?', answer: 'RSA', distractors: ['AES', 'SHA-256', 'ChaCha20'], explanation: 'RSA est un cryptosystème asymétrique fondé sur la factorisation.' },
    { prompt: 'Quelle métrique combine précision et rappel par leur moyenne harmonique ?', answer: 'Le score F1', distractors: ['La précision brute', 'La spécificité', 'La matrice de confusion'], explanation: 'Le score F1 est la moyenne harmonique entre précision et rappel.' },
    { prompt: 'Quel type de mémoire est volatile et sert d’espace de travail au processeur ?', answer: 'La RAM', distractors: ['La ROM', 'Le SSD', 'La mémoire flash'], explanation: 'La RAM perd son contenu lorsque l’alimentation est coupée.' },
    { prompt: 'Quel protocole permet à un client d’obtenir automatiquement une configuration IP ?', answer: 'DHCP', distractors: ['ARP', 'ICMP', 'SNMP'], explanation: 'DHCP attribue notamment une adresse IP, une passerelle et des DNS.' },
    { prompt: 'Quelle propriété d’une base relationnelle signifie qu’une transaction est entièrement appliquée ou annulée ?', answer: 'L’atomicité', distractors: ['La réplication', 'La normalisation', 'La disponibilité'], explanation: 'L’atomicité est le A des propriétés ACID.' },
  ],
}

const wordingPrefixes = ['Question de niveau difficile :', 'Analysez précisément :', 'Connaissance avancée :', 'Défi expert :', 'Repère essentiel :']

function createLargeCategoryQuestions(category: 'Histoire' | 'Géographie' | 'Sciences et technologies', count: number, startId: number): Question[] {
  const facts = difficultFacts[category]
  return Array.from({ length: count }, (_, index) => {
    const fact = facts[index % facts.length]
    return {
      id: startId + index,
      question: `${wordingPrefixes[Math.floor(index / facts.length) % wordingPrefixes.length]} ${fact.prompt}`,
      options: { A: fact.answer, B: fact.distractors[0], C: fact.distractors[1], D: fact.distractors[2] },
      correctAnswer: 'A',
      category,
      difficulty: 'Difficile',
      explanation: fact.explanation,
    }
  })
}

const questionBank: Question[] = (() => {
  const baseQuestions: Question[] = [
    {
      id: 1,
      question: 'En quelle année a eu lieu la chute du Mur de Berlin ?',
      options: { A: '1985', B: '1989', C: '1991', D: '2001' },
      correctAnswer: 'B',
      category: 'Histoire',
      difficulty: 'Moyen',
      explanation: 'Le mur est tombé en 1989, marquant la fin de la guerre froide.',
    },
    {
      id: 2,
      question: 'Quel organe permet de pomper le sang dans le corps humain ?',
      options: { A: 'Le foie', B: 'Le cerveau', C: 'Le cœur', D: 'Le poumon' },
      correctAnswer: 'C',
      category: 'Sciences et technologies',
      difficulty: 'Facile',
      explanation: 'Le cœur est la pompe du système circulatoire.',
    },
    {
      id: 3,
      question: 'Quel langage est principalement utilisé pour créer des interfaces web modernes ?',
      options: { A: 'Python', B: 'SQL', C: 'TypeScript', D: 'C++' },
      correctAnswer: 'C',
      category: 'Informatique',
      difficulty: 'Moyen',
      explanation: 'TypeScript est très utilisé pour développer des applications web robustes.',
    },
    {
      id: 4,
      question: 'Quel pays possède la plus grande superficie du monde ?',
      options: { A: 'Canada', B: 'Russie', C: 'Chine', D: 'États-Unis' },
      correctAnswer: 'B',
      category: 'Géographie',
      difficulty: 'Facile',
      explanation: 'La Russie est le plus grand pays du monde par superficie.',
    },
    {
      id: 5,
      question: 'Qui a conçu la théorie de la relativité générale ?',
      options: { A: 'Isaac Newton', B: 'Stephen Hawking', C: 'Albert Einstein', D: 'Nikola Tesla' },
      correctAnswer: 'C',
      category: 'Sciences et technologies',
      difficulty: 'Moyen',
      explanation: 'Albert Einstein a publié cette théorie au début du XXe siècle.',
    },
    {
      id: 6,
      question: 'Quel film a remporté l’Oscar du meilleur film en 2020 ?',
      options: { A: 'Parasite', B: '1917', C: 'Joker', D: 'Once Upon a Time in Hollywood' },
      correctAnswer: 'A',
      category: 'Cinéma et musique',
      difficulty: 'Moyen',
      explanation: 'Parasite a remporté l’Oscar du meilleur film en 2020.',
    },
    {
      id: 7,
      question: 'Quelle est la capitale du Japon ?',
      options: { A: 'Osaka', B: 'Kyoto', C: 'Tokyo', D: 'Sapporo' },
      correctAnswer: 'C',
      category: 'Géographie',
      difficulty: 'Facile',
      explanation: 'Tokyo est la capitale du Japon.',
    },
    {
      id: 8,
      question: 'Quel terme désigne l’intelligence artificielle capable d’apprendre à partir de données ?',
      options: { A: 'Machine learning', B: 'Cloud', C: 'Algorithme séquentiel', D: 'Firmware' },
      correctAnswer: 'A',
      category: 'Intelligence artificielle',
      difficulty: 'Difficile',
      explanation: 'Le machine learning est une branche de l’IA centrée sur l’apprentissage à partir de données.',
    },
    {
      id: 9,
      question: 'Combien de joueurs composent une équipe de football sur le terrain ?',
      options: { A: '9', B: '10', C: '11', D: '12' },
      correctAnswer: 'C',
      category: 'Sport',
      difficulty: 'Facile',
      explanation: 'Une équipe de football compte 11 joueurs sur le terrain.',
    },
    {
      id: 10,
      question: 'Quel artiste est connu pour l’album 21 ?',
      options: { A: 'Adele', B: 'Taylor Swift', C: 'Beyoncé', D: 'Rihanna' },
      correctAnswer: 'A',
      category: 'Cinéma et musique',
      difficulty: 'Moyen',
      explanation: 'Adele a publié l’album 21, devenu un énorme succès mondial.',
    },
    {
      id: 11,
      question: 'Quelle est la plus grande planète du système solaire ?',
      options: { A: 'Mars', B: 'Jupiter', C: 'Saturne', D: 'Vénus' },
      correctAnswer: 'B',
      category: 'Sciences et technologies',
      difficulty: 'Facile',
      explanation: 'Jupiter est la plus grande planète du système solaire.',
    },
    {
      id: 12,
      question: 'Qui a inventé la théorie de l’évolution par la sélection naturelle ?',
      options: { A: 'Charles Darwin', B: 'Gregor Mendel', C: 'Louis Pasteur', D: 'Jean-Baptiste Lamarck' },
      correctAnswer: 'A',
      category: 'Sciences et technologies',
      difficulty: 'Moyen',
      explanation: 'Charles Darwin a formalisé la théorie de l’évolution par sélection naturelle.',
    },
  ]

  return [
    ...baseQuestions,
    ...createLargeCategoryQuestions('Sciences et technologies', 500, 1000),
    ...createLargeCategoryQuestions('Histoire', 500, 2000),
    ...createLargeCategoryQuestions('Géographie', 500, 3000),
  ]
})()

function randomizeQuestionOptions(question: Question): Question {
  const randomizedChoices = shuffleArray(Object.entries(question.options) as Array<[AnswerKey, string]>)
  const keys: AnswerKey[] = ['A', 'B', 'C', 'D']
  const correctText = question.options[question.correctAnswer]
  const options = Object.fromEntries(randomizedChoices.map(([_, value], index) => [keys[index], value])) as Record<AnswerKey, string>
  const correctAnswer = keys.find((key) => options[key] === correctText) ?? 'A'
  return { ...question, options, correctAnswer }
}

function buildQuestions(category: Category, difficulty: Difficulty, count: number) {
  const categoryQuestions = questionBank.filter((question) => question.category === category)
  const exactDifficulty = categoryQuestions.filter((question) => question.difficulty === difficulty)
  // Les trois catégories enrichies restent difficiles, même si l’utilisateur laisse
  // un autre niveau sélectionné : on ne mélange jamais des catégories différentes.
  // « Culture générale » est une sélection transversale : elle pioche dans toute
  // la banque plutôt que de démarrer un quiz vide.
  const fallbackQuestions = questionBank.filter((question) => question.difficulty === difficulty)
  const pool = exactDifficulty.length > 0
    ? exactDifficulty
    : categoryQuestions.length > 0
      ? categoryQuestions
      : fallbackQuestions.length > 0
        ? fallbackQuestions
        : questionBank
  const selected: Question[] = []
  const seenTopics = new Set<string>()
  for (const question of shuffleArray(pool)) {
    if (seenTopics.has(question.explanation) && selected.length < Math.min(count, 10)) continue
    selected.push(question)
    seenTopics.add(question.explanation)
    if (selected.length === Math.min(count, pool.length)) break
  }
  return selected.map(randomizeQuestionOptions)
}

function App() {
  const [screen, setScreen] = useState<Screen>('home')
  const [gameMode, setGameMode] = useState<GameMode>('solo')
  const [playerName, setPlayerName] = useState('Koffi')
  const [avatar, setAvatar] = useState(avatars[0])
  const [sessionId, setSessionId] = useState(() => `SESSION-${Math.floor(Math.random() * 9000 + 1000)}`)
  const [soloConfig, setSoloConfig] = useState({ category: 'Culture générale' as Category, difficulty: 'Difficile' as Difficulty, questionsCount: 6 })
  const [duelConfig, setDuelConfig] = useState({
    teamAName: 'Equipe A',
    teamBName: 'Equipe B',
    category: 'Culture générale' as Category,
    difficulty: 'Difficile' as Difficulty,
    questionsCount: 6,
    maxPlayers: 3,
    phase: 'Qualification' as DuelPhase,
  })
  const [joinCode, setJoinCode] = useState('')
  const [joinError, setJoinError] = useState('')
  const [joinedTeam, setJoinedTeam] = useState<TeamKey | null>(null)
  const [createdGame, setCreatedGame] = useState<{
    codeA: string
    codeB: string
    teamAName: string
    teamBName: string
    teamARoster: Array<{ name: string; avatar: string; connected?: boolean }>
    teamBRoster: Array<{ name: string; avatar: string; connected?: boolean }>
    phase: DuelPhase
  } | null>(null)
  const [questions, setQuestions] = useState<Question[]>([])
  const [questionIndex, setQuestionIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<AnswerKey | null>(null)
  const [timeLeft, setTimeLeft] = useState(30)
  const [answerLocked, setAnswerLocked] = useState(false)
  const [answers, setAnswers] = useState<AnswerRecord[]>([])
  const [soloScore, setSoloScore] = useState(0)
  const [teamAScore, setTeamAScore] = useState(0)
  const [teamBScore, setTeamBScore] = useState(0)
  const [feedbackMessage, setFeedbackMessage] = useState('')
  const [activeTeam, setActiveTeam] = useState<TeamKey>('A')
  const [answeringTeam, setAnsweringTeam] = useState<TeamKey>('A')
  const [reboundMode, setReboundMode] = useState(false)
  const [showResultOverlay, setShowResultOverlay] = useState(false)
  const [duelRoundSummary, setDuelRoundSummary] = useState<DuelRoundSummary | null>(null)
  const [teamAChat, setTeamAChat] = useState<Array<{ id: number; author: string; text: string }>>([])
  const [teamBChat, setTeamBChat] = useState<Array<{ id: number; author: string; text: string }>>([])
  const [teamAInput, setTeamAInput] = useState('')
  const [teamBInput, setTeamBInput] = useState('')
  const [teamDraftAnswers, setTeamDraftAnswers] = useState<Record<TeamKey, AnswerKey | null>>({ A: null, B: null })
  const [captainName, setCaptainName] = useState<string | null>(null)
  const [duelPhase, setDuelPhase] = useState<DuelPhase>('Qualification')
  const [reboundDecisionPending, setReboundDecisionPending] = useState(false)
  const [reboundDecisionTime, setReboundDecisionTime] = useState(10)
  const [isLobbyHost, setIsLobbyHost] = useState(false)
  const [lobbyCountdown, setLobbyCountdown] = useState<number | null>(null)
  const [lobbyNotice, setLobbyNotice] = useState('🟢 En attente des joueurs')
  const [inviteCodesVisible, setInviteCodesVisible] = useState(false)
  const [lobbyTeamCounts, setLobbyTeamCounts] = useState<Record<TeamKey, number>>({ A: 0, B: 0 })
  const socketRef = useRef<Socket | null>(null)
  const resumeTokenRef = useRef<string | null>(sessionStorage.getItem('quiz-arena-resume-token'))

  const currentQuestion = questions[questionIndex]
  const progress = questions.length > 0 ? ((questionIndex + 1) / questions.length) * 100 : 0

  function getSocket() {
    if (!socketRef.current) {
      socketRef.current = io(import.meta.env.VITE_SOCKET_URL ?? 'http://localhost:3001')
      socketRef.current.on('game:state', (state: { teamCounts: Record<TeamKey, number>; teamRosters?: Record<TeamKey, Array<{ name: string; avatar: string; connected: boolean }>> }) => {
        setLobbyTeamCounts(state.teamCounts)
        if (state.teamRosters) setCreatedGame((game) => game ? { ...game, teamARoster: state.teamRosters!.A, teamBRoster: state.teamRosters!.B } : game)
      })
      socketRef.current.on('team:roster', ({ team, players }: { team: TeamKey; players: Array<{ name: string; avatar: string; connected: boolean }> }) => {
        setCreatedGame((game) => game ? {
          ...game,
          teamARoster: team === 'A' ? players : game.teamARoster,
          teamBRoster: team === 'B' ? players : game.teamBRoster,
        } : game)
      })
      socketRef.current.on('team:chat', ({ team, author, text, at }: { team: TeamKey; author: string; text: string; at: number }) => {
        const message = { id: at, author, text }
        if (team === 'A') setTeamAChat((messages) => [...messages, message])
        else setTeamBChat((messages) => [...messages, message])
      })
      socketRef.current.on('game:started', ({ settings }: { settings: { category: Category; difficulty: Difficulty; questionsCount: number; phase: DuelPhase } }) => {
        startDuelQuiz(settings)
      })
      socketRef.current.on('game:countdown', ({ value }: { value: number }) => setLobbyCountdown(value))
      socketRef.current.on('lobby:notice', ({ message }: { message: string }) => setLobbyNotice(message))
      socketRef.current.on('game:closed', ({ message }: { message: string }) => {
        resumeTokenRef.current = null; sessionStorage.removeItem('quiz-arena-resume-token')
        setCreatedGame(null); setJoinedTeam(null); setIsLobbyHost(false); setJoinError(message); setScreen('home')
      })
      socketRef.current.on('connect', () => {
        if (resumeTokenRef.current) socketRef.current?.emit('game:resume', { resumeToken: resumeTokenRef.current })
      })
      socketRef.current.on('game:resumed', ({ team, state, teamRoster, code, isHost }: { team: TeamKey; state: { teamNames: Record<TeamKey, string>; teamCounts: Record<TeamKey, number>; settings: { category: Category; difficulty: Difficulty; questionsCount: number; phase: DuelPhase } }; teamRoster: Array<{ name: string; avatar: string; connected: boolean }>; code: string; isHost: boolean }) => {
        setCreatedGame({ codeA: team === 'A' ? code : '', codeB: team === 'B' ? code : '', teamAName: state.teamNames.A, teamBName: state.teamNames.B, teamARoster: team === 'A' ? teamRoster : [], teamBRoster: team === 'B' ? teamRoster : [], phase: state.settings.phase })
        setDuelConfig((config) => ({ ...config, ...state.settings, teamAName: state.teamNames.A, teamBName: state.teamNames.B }))
        setLobbyTeamCounts(state.teamCounts); setJoinedTeam(team); setIsLobbyHost(isHost); setGameMode('duel'); setScreen('waiting')
      })
    }
    return socketRef.current
  }

  useEffect(() => {
    if (screen !== 'quiz' || answerLocked || showResultOverlay || reboundDecisionPending) {
      return
    }

    const interval = window.setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => window.clearInterval(interval)
  }, [screen, answerLocked, showResultOverlay, reboundDecisionPending])

  useEffect(() => {
    if (screen !== 'quiz' || answerLocked || showResultOverlay || reboundDecisionPending) {
      return
    }

    if (timeLeft <= 0) {
      if (gameMode === 'solo') {
        handleSoloAnswer(null)
      } else {
        handleDuelAnswer(null)
      }
    }
  }, [screen, answerLocked, showResultOverlay, reboundDecisionPending, timeLeft, gameMode])

  useEffect(() => {
    if (!reboundDecisionPending) return
    if (reboundDecisionTime <= 0) {
      refuseRebound(true)
      return
    }
    const timeout = window.setTimeout(() => setReboundDecisionTime((time) => time - 1), 1000)
    return () => window.clearTimeout(timeout)
  }, [reboundDecisionPending, reboundDecisionTime])

  function resetQuizState() {
    setQuestions([])
    setQuestionIndex(0)
    setSelectedAnswer(null)
    setTimeLeft(30)
    setAnswerLocked(false)
    setAnswers([])
    setSoloScore(0)
    setTeamAScore(0)
    setTeamBScore(0)
    setFeedbackMessage('')
    setActiveTeam('A')
    setAnsweringTeam('A')
    setReboundMode(false)
    setShowResultOverlay(false)
    setDuelRoundSummary(null)
    setTeamAChat([])
    setTeamBChat([])
    setTeamAInput('')
    setTeamBInput('')
    setTeamDraftAnswers({ A: null, B: null })
    setCaptainName(null)
    setDuelPhase('Qualification')
    setReboundDecisionPending(false)
    setReboundDecisionTime(10)
    setLobbyCountdown(null)
    setLobbyNotice('🟢 En attente des joueurs')
  }

  function startSoloQuiz() {
    resetQuizState()
    const generatedQuestions = buildQuestions(soloConfig.category, soloConfig.difficulty, soloConfig.questionsCount)
    setQuestions(generatedQuestions)
    setGameMode('solo')
    setScreen('quiz')
  }

  function createDuel() {
    setJoinError('')
    const newSessionId = `SESSION-${crypto.randomUUID()}`
    setSessionId(newSessionId)
    const socket = getSocket()
    socket.once('game:error', ({ message }: { message: string }) => setJoinError(message))
    socket.once('game:created', ({ codes, resumeToken, state }: { codes: Record<TeamKey, string>; resumeToken: string; state: { teamRosters: Record<TeamKey, Array<{ name: string; avatar: string; connected: boolean }>> } }) => {
      resumeTokenRef.current = resumeToken; sessionStorage.setItem('quiz-arena-resume-token', resumeToken)
      setCreatedGame({ codeA: codes.A, codeB: codes.B, teamAName: duelConfig.teamAName, teamBName: duelConfig.teamBName, teamARoster: state.teamRosters.A, teamBRoster: state.teamRosters.B, phase: duelConfig.phase })
      setLobbyTeamCounts({ A: 1, B: 0 })
      setDuelPhase(duelConfig.phase); setJoinedTeam('A'); setIsLobbyHost(true); setInviteCodesVisible(true); setGameMode('duel'); setScreen('waiting')
    })
    socket.once('connect_error', () => setJoinError('Impossible de joindre le serveur de salons. Lancez « npm run server », puis réessayez.'))
    const createRoom = () => socket.emit('game:create', {
      gameId: newSessionId,
      player: { name: playerName.trim() || 'Joueur 1', avatar },
      maxPlayers: duelConfig.maxPlayers,
      teamNames: { A: duelConfig.teamAName.trim() || 'Équipe A', B: duelConfig.teamBName.trim() || 'Équipe B' },
      settings: { category: duelConfig.category, difficulty: duelConfig.difficulty, questionsCount: duelConfig.questionsCount, phase: duelConfig.phase },
    })
    if (socket.connected) createRoom()
    else socket.once('connect', createRoom)
  }

  function joinDuel() {
    const socket = getSocket()
    setJoinError('')
    socket.once('game:error', ({ message }: { message: string }) => setJoinError(message))
    socket.once('connect_error', () => setJoinError('Impossible de joindre le serveur de salons.'))
    socket.once('game:joined', ({ team, state, teamRoster, resumeToken }: { team: TeamKey; state: { teamNames: Record<TeamKey, string>; teamCounts: Record<TeamKey, number>; settings: { category: Category; difficulty: Difficulty; questionsCount: number; phase: DuelPhase }; teamRosters?: Record<TeamKey, Array<{ name: string; avatar: string; connected: boolean }>> }; teamRoster: Array<{ name: string; avatar: string; connected: boolean }>; resumeToken: string }) => {
      resumeTokenRef.current = resumeToken; sessionStorage.setItem('quiz-arena-resume-token', resumeToken)
      setCreatedGame({ codeA: team === 'A' ? joinCode : '', codeB: team === 'B' ? joinCode : '', teamAName: state.teamNames.A, teamBName: state.teamNames.B, teamARoster: state.teamRosters?.A ?? (team === 'A' ? teamRoster : []), teamBRoster: state.teamRosters?.B ?? (team === 'B' ? teamRoster : []), phase: 'Qualification' })
      setDuelConfig((config) => ({ ...config, ...state.settings, teamAName: state.teamNames.A, teamBName: state.teamNames.B }))
      setDuelPhase(state.settings.phase); setLobbyTeamCounts(state.teamCounts); setJoinedTeam(team); setIsLobbyHost(false); setInviteCodesVisible(false); setGameMode('duel'); setScreen('waiting')
    })
    socket.emit('game:join', { code: joinCode.trim().toUpperCase(), player: { name: playerName, avatar } })
  }

  function startDuelQuiz(config: Pick<typeof duelConfig, 'category' | 'difficulty' | 'questionsCount' | 'phase'> = duelConfig) {
    resetQuizState()
    const generatedQuestions = buildQuestions(config.category, config.difficulty, config.questionsCount)
    setQuestions(generatedQuestions)
    setGameMode('duel')
    setDuelPhase(config.phase)
    setScreen('quiz')
  }

  function requestDuelStart() {
    if (!createdGame || !isLobbyHost || lobbyTeamCounts.A === 0 || lobbyTeamCounts.B === 0) {
      return
    }
    getSocket().emit('game:start')
  }

  function nextQuestion() {
    if (questionIndex + 1 >= questions.length) {
      setScreen('results')
      return
    }

    setQuestionIndex((prev) => prev + 1)
    setSelectedAnswer(null)
    setTimeLeft(30)
    setAnswerLocked(false)
    setFeedbackMessage('')
    setShowResultOverlay(false)
    setDuelRoundSummary(null)
    setCaptainName(null)
    setActiveTeam((prev) => (prev === 'A' ? 'B' : 'A'))
    setAnsweringTeam((prev) => (prev === 'A' ? 'B' : 'A'))
    setReboundMode(false)
    setReboundDecisionPending(false)
    setReboundDecisionTime(10)
  }

  function handleSoloAnswer(choice: AnswerKey | null) {
    if (!currentQuestion || answerLocked) {
      return
    }

    const isCorrect = choice === currentQuestion.correctAnswer
    const points = isCorrect ? 10 : -10
    setSoloScore((prev) => prev + points)
    setSelectedAnswer(choice)
    setAnswerLocked(true)
    setAnswers((prev) => [
      ...prev,
      {
        questionId: currentQuestion.id,
        selectedAnswer: choice,
        isCorrect,
        points,
        roundLabel: 'Solo',
      },
    ])
    setFeedbackMessage(isCorrect
      ? '✅ Bonne réponse !'
      : `❌ Réponse incorrecte. La bonne réponse est ${currentQuestion.correctAnswer} : ${currentQuestion.options[currentQuestion.correctAnswer]}.`)

    window.setTimeout(() => {
      if (questionIndex + 1 >= questions.length) {
        setScreen('results')
        return
      }

      setQuestionIndex((prev) => prev + 1)
      setSelectedAnswer(null)
      setTimeLeft(30)
      setAnswerLocked(false)
      setFeedbackMessage('')
    }, 2500)
  }

  function submitOfficialAnswer(team: TeamKey, choice: AnswerKey | null) {
    if (!currentQuestion || answerLocked || reboundDecisionPending || team !== answeringTeam || (choice !== null && team !== joinedTeam)) {
      return
    }

    setSelectedAnswer(choice)
    const isCorrect = choice === currentQuestion.correctAnswer
    const directPoints = duelPhase === 'Qualification' ? 10 : duelPhase === 'Demi-finale' ? 20 : 15
    const reboundPoints = duelPhase === 'Qualification' ? 5 : duelPhase === 'Demi-finale' ? 10 : 20
    const captainLabel = playerName || 'Capitaine'
    setCaptainName(captainLabel)

    if (!reboundMode) {
      const opponent: TeamKey = team === 'A' ? 'B' : 'A'
      if (isCorrect) {
        if (team === 'A') setTeamAScore((score) => score + directPoints)
        else setTeamBScore((score) => score + directPoints)
        setDuelRoundSummary({
          teamAResponse: team === 'A' ? choice : null,
          teamBResponse: team === 'B' ? choice : null,
          teamAResult: team === 'A' ? 'correct' : 'pending',
          teamBResult: team === 'B' ? 'correct' : 'pending',
          teamAPoints: team === 'A' ? directPoints : 0,
          teamBPoints: team === 'B' ? directPoints : 0,
          explanation: currentQuestion.explanation,
        })
        setAnswerLocked(true)
        setShowResultOverlay(true)
        const teamName = team === 'A' ? createdGame?.teamAName ?? 'Équipe A' : createdGame?.teamBName ?? 'Équipe B'
        setFeedbackMessage(`✅ Bonne réponse ${teamName} !`)
        window.setTimeout(nextQuestion, 2600)
        return
      }

      if (team === 'A') setTeamAScore((score) => score - 10)
      else setTeamBScore((score) => score - 10)
      setDuelRoundSummary({
        teamAResponse: team === 'A' ? choice : null,
        teamBResponse: team === 'B' ? choice : null,
        teamAResult: team === 'A' ? 'incorrect' : 'pending',
        teamBResult: team === 'B' ? 'incorrect' : 'pending',
        teamAPoints: team === 'A' ? -10 : 0,
        teamBPoints: team === 'B' ? -10 : 0,
        explanation: currentQuestion.explanation,
      })
      const opponentName = opponent === 'A' ? createdGame?.teamAName ?? 'Équipe A' : createdGame?.teamBName ?? 'Équipe B'
      setFeedbackMessage(`❌ Mauvaise réponse. ${opponentName} peut tenter une réplique.`)
      setReboundMode(true)
      setReboundDecisionPending(true)
      setReboundDecisionTime(10)
      setAnsweringTeam(opponent)
      return
    }

    if (team === 'A') setTeamAScore((score) => score + (isCorrect ? reboundPoints : -5))
    else setTeamBScore((score) => score + (isCorrect ? reboundPoints : -5))
    setDuelRoundSummary((previous) => previous ? {
      ...previous,
      teamAResponse: team === 'A' ? choice : previous.teamAResponse,
      teamBResponse: team === 'B' ? choice : previous.teamBResponse,
      teamAResult: team === 'A' ? (isCorrect ? 'correct' : 'incorrect') : previous.teamAResult,
      teamBResult: team === 'B' ? (isCorrect ? 'correct' : 'incorrect') : previous.teamBResult,
      teamAPoints: team === 'A' ? (isCorrect ? reboundPoints : -5) : previous.teamAPoints,
      teamBPoints: team === 'B' ? (isCorrect ? reboundPoints : -5) : previous.teamBPoints,
    } : previous)
    setAnswerLocked(true)
    setShowResultOverlay(true)
    setFeedbackMessage(isCorrect ? '✅ Réplique réussie !' : '❌ Réplique échouée.')
    window.setTimeout(nextQuestion, 2600)
  }

  function handleDuelAnswer(choice: AnswerKey | null) {
    submitOfficialAnswer(answeringTeam, choice)
  }

  function acceptRebound() {
    if (joinedTeam !== answeringTeam) return
    setReboundDecisionPending(false)
    setReboundDecisionTime(10)
    setTimeLeft(15)
    const teamName = answeringTeam === 'A' ? createdGame?.teamAName ?? 'Équipe A' : createdGame?.teamBName ?? 'Équipe B'
    setFeedbackMessage(`⚡ Réplique acceptée. ${teamName} dispose de 15 secondes pour se concerter.`)
  }

  function refuseRebound(isTimeout = false) {
    if (!currentQuestion) return
    if (!isTimeout && joinedTeam !== answeringTeam) return
    const teamName = answeringTeam === 'A' ? createdGame?.teamAName ?? 'Équipe A' : createdGame?.teamBName ?? 'Équipe B'
    setReboundDecisionPending(false)
    setReboundDecisionTime(10)
    setDuelRoundSummary((previous) => previous ? {
      ...previous,
      teamAResult: answeringTeam === 'A' ? 'refused' : previous.teamAResult,
      teamBResult: answeringTeam === 'B' ? 'refused' : previous.teamBResult,
      teamAPoints: answeringTeam === 'A' ? 0 : previous.teamAPoints,
      teamBPoints: answeringTeam === 'B' ? 0 : previous.teamBPoints,
    } : {
      teamAResponse: null,
      teamBResponse: null,
      teamAResult: answeringTeam === 'A' ? 'refused' : 'pending',
      teamBResult: answeringTeam === 'B' ? 'refused' : 'pending',
      teamAPoints: 0,
      teamBPoints: 0,
      explanation: currentQuestion.explanation,
    })
    setAnswerLocked(true)
    setShowResultOverlay(true)
    setFeedbackMessage(isTimeout ? `${teamName} n’a pas répondu : réplique refusée automatiquement.` : `${teamName} a refusé la réplique.`)
    window.setTimeout(nextQuestion, 2600)
  }

  function sendTeamChat(team: TeamKey) {
    const input = team === 'A' ? teamAInput : teamBInput
    if (!input.trim()) {
      return
    }
    if (team !== joinedTeam) return
    getSocket().emit('team:chat', { text: input.trim() })
    if (team === 'A') setTeamAInput('')
    else setTeamBInput('')
  }

  function goHome() {
    resetQuizState()
    setScreen('home')
  }

  function leaveLobby() {
    if (screen === 'waiting') getSocket().emit('game:leave')
    resumeTokenRef.current = null; sessionStorage.removeItem('quiz-arena-resume-token')
    setCreatedGame(null)
    setJoinedTeam(null)
    setIsLobbyHost(false)
    goHome()
  }

  const correctCount = answers.filter((answer) => answer.isCorrect).length
  const wrongCount = answers.filter((answer) => !answer.isCorrect).length
  const successRate = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0
  const activeTeamName = gameMode === 'duel' ? (activeTeam === 'A' ? createdGame?.teamAName ?? 'Équipe A' : createdGame?.teamBName ?? 'Équipe B') : 'Solo'
  const answeringTeamName = gameMode === 'duel' ? (answeringTeam === 'A' ? createdGame?.teamAName ?? 'Équipe A' : createdGame?.teamBName ?? 'Équipe B') : 'Solo'
  const teamMembersA = createdGame?.teamARoster ?? []
  const teamMembersB = createdGame?.teamBRoster ?? []
  const isDuelChatActive = screen === 'quiz' && gameMode === 'duel'
  const heroStats = [
    { label: 'Classement instantané', icon: <Trophy className="h-4 w-4" /> },
    { label: 'Tours et rebonds', icon: <Zap className="h-4 w-4" /> },
    { label: 'Interface immersive', icon: <ShieldCheck className="h-4 w-4" /> },
  ]

  return (
    <div className="app-shell">
      <motion.header
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45 }}
        className="hero-panel"
      >
        <div className="hero-content">
          <div className="mb-4 flex items-center gap-3 self-start rounded-full border border-cyan-400/20 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-200">
            <Crown className="h-4 w-4" />
            <span>Quiz Arena • Culture Générale</span>
          </div>
          <h1 className="text-3xl font-semibold sm:text-4xl lg:text-5xl">Teste tes connaissances. Affronte tes amis. Deviens le champion.</h1>
          <p className="hero-copy">
            Une expérience de quiz premium pensée comme un show compétitif, avec duels en direct, scores instantanés et un chat privé par équipe.
          </p>
          <div className="hero-badges">
            <span className="flex items-center gap-2"><Sparkles className="h-4 w-4" /> Match télévisé</span>
            <span className="flex items-center gap-2"><Clock3 className="h-4 w-4" /> 30 secondes</span>
            <span className="flex items-center gap-2"><Zap className="h-4 w-4" /> Tour + rebond</span>
            <span className="flex items-center gap-2"><MessageCircle className="h-4 w-4" /> Chat privé</span>
          </div>
        </div>
        <div className="hero-visual">
          <div className="hero-orb">
            <span className="eyebrow">LIVE</span>
            <strong>Mode duel prêt</strong>
            <p className="mt-2 text-sm text-slate-300">L’arène s’illumine à chaque question.</p>
          </div>
          <div className="hero-stats">
            {heroStats.map((stat) => (
              <div key={stat.label} className="hero-stat flex items-center gap-2">
                {stat.icon}
                <span>{stat.label}</span>
              </div>
            ))}
          </div>
        </div>
      </motion.header>

      {screen === 'home' && (
        <motion.section initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="home-stage">
          <div className="panel home-grid">
            <motion.div whileHover={{ y: -6, scale: 1.01 }} className="card card-feature solo-card">
            <div className="flex items-center gap-2 text-cyan-300"><Sparkles className="h-5 w-5" /> <span>Mode Solo</span></div>
            <h2>Mode Solo</h2>
            <p>Affutez votre culture générale avec un système de timer, des stats instantanées et un résumé clair à la fin.</p>
            <button type="button" className="btn btn-primary" onClick={() => { setGameMode('solo'); setScreen('solo-config') }}>
              Jouer en Solo
            </button>
          </motion.div>
            <motion.div whileHover={{ y: -6, scale: 1.01 }} className="card card-feature duel-card">
            <div className="flex items-center gap-2 text-fuchsia-300"><Trophy className="h-5 w-5" /> <span>Créer un Duel</span></div>
            <h2>Créer un Duel</h2>
            <p>Générez deux codes privés, formez des équipes et lancez une partie avec tours, rebonds et chat interne.</p>
            <button type="button" className="btn btn-secondary" onClick={() => { setGameMode('duel'); setScreen('duel-config') }}>
              Créer un Duel
            </button>
          </motion.div>
            <motion.div whileHover={{ y: -6, scale: 1.01 }} className="card card-feature join-card">
            <div className="flex items-center gap-2 text-emerald-300"><Users className="h-5 w-5" /> <span>Rejoindre une Partie</span></div>
            <h2>Rejoindre une Partie</h2>
            <p>Entrez votre pseudo et le code de votre équipe pour rejoindre la salle d’attente.</p>
            <button type="button" className="btn btn-tertiary" onClick={() => setScreen('join')}>
              Rejoindre une Partie
            </button>
            </motion.div>
          </div>

          <aside className="command-center" aria-label="Profil joueur">
            <div className="profile-row">
              <div className="profile-avatar">{avatar}</div>
              <div>
                <p className="eyebrow">Player profile</p>
                <h2>{playerName || 'Joueur Arena'}</h2>
                <span className="level-chip"><Crown className="h-3.5 w-3.5" /> Niveau 12 · Challenger</span>
              </div>
            </div>
            <div className="profile-stats">
              <div><strong>128</strong><span>parties</span></div>
              <div><strong>74%</strong><span>réussite</span></div>
              <div><strong>9</strong><span>série max</span></div>
            </div>
            <div className="rank-track"><span>XP saison</span><strong>7 420 / 10 000</strong><div><i /></div></div>
          </aside>
        </motion.section>
      )}

      {screen === 'solo-config' && (
        <section className="panel form-panel">
          <div className="panel-header">
            <button className="text-btn" type="button" onClick={goHome}>← Retour</button>
            <h2>Préparez votre entraînement solo</h2>
          </div>

          <div className="form-grid">
            <label>
              Pseudo temporaire
              <input value={playerName} onChange={(event) => setPlayerName(event.target.value)} />
            </label>
            <label>
              Avatar
              <div className="avatars">
                {avatars.map((item) => (
                  <button key={item} type="button" className={`avatar-chip ${avatar === item ? 'selected' : ''}`} onClick={() => setAvatar(item)}>
                    {item}
                  </button>
                ))}
              </div>
            </label>
            <label>
              Catégorie
              <select value={soloConfig.category} onChange={(event) => setSoloConfig((prev) => ({ ...prev, category: event.target.value as Category }))}>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label>
              Niveau
              <select value={soloConfig.difficulty} onChange={(event) => setSoloConfig((prev) => ({ ...prev, difficulty: event.target.value as Difficulty }))}>
                {difficulties.map((difficulty) => <option key={difficulty} value={difficulty}>{difficulty}</option>)}
              </select>
            </label>
            <label>
              Nombre de questions
              <input type="number" min="3" max="20" value={soloConfig.questionsCount} onChange={(event) => setSoloConfig((prev) => ({ ...prev, questionsCount: Number(event.target.value) }))} />
            </label>
          </div>

          <button type="button" className="btn btn-primary" onClick={startSoloQuiz}>Lancer le quiz</button>
        </section>
      )}

      {screen === 'duel-config' && (
        <section className="panel form-panel">
          <div className="panel-header">
            <button className="text-btn" type="button" onClick={goHome}>← Retour</button>
            <h2>Créer une partie privée</h2>
          </div>

          <div className="form-grid">
            <label>
              Pseudo temporaire
              <input value={playerName} onChange={(event) => setPlayerName(event.target.value)} />
            </label>
            <label>
              Avatar
              <div className="avatars">
                {avatars.map((item) => (
                  <button key={item} type="button" className={`avatar-chip ${avatar === item ? 'selected' : ''}`} onClick={() => setAvatar(item)}>
                    {item}
                  </button>
                ))}
              </div>
            </label>
            <label>
              Nom équipe A
              <input value={duelConfig.teamAName} onChange={(event) => setDuelConfig((prev) => ({ ...prev, teamAName: event.target.value }))} />
            </label>
            <label>
              Nom équipe B
              <input value={duelConfig.teamBName} onChange={(event) => setDuelConfig((prev) => ({ ...prev, teamBName: event.target.value }))} />
            </label>
            <label>
              Catégorie
              <select value={duelConfig.category} onChange={(event) => setDuelConfig((prev) => ({ ...prev, category: event.target.value as Category }))}>
                {categories.map((category) => <option key={category} value={category}>{category}</option>)}
              </select>
            </label>
            <label>
              Niveau
              <select value={duelConfig.difficulty} onChange={(event) => setDuelConfig((prev) => ({ ...prev, difficulty: event.target.value as Difficulty }))}>
                {difficulties.map((difficulty) => <option key={difficulty} value={difficulty}>{difficulty}</option>)}
              </select>
            </label>
            <label>
              Phase du tournoi
              <select value={duelConfig.phase} onChange={(event) => setDuelConfig((prev) => ({ ...prev, phase: event.target.value as DuelPhase }))}>
                {phases.map((phase) => <option key={phase} value={phase}>{phase}</option>)}
              </select>
            </label>
            <label>
              Nombre de questions
              <input type="number" min="3" max="20" value={duelConfig.questionsCount} onChange={(event) => setDuelConfig((prev) => ({ ...prev, questionsCount: Number(event.target.value) }))} />
            </label>
            <label>
              Joueurs max par équipe
              <input type="number" min="2" max="5" value={duelConfig.maxPlayers} onChange={(event) => setDuelConfig((prev) => ({ ...prev, maxPlayers: Number(event.target.value) }))} />
            </label>
          </div>

          {joinError && <p className="form-error">{joinError}</p>}
          <button type="button" className="btn btn-primary" onClick={createDuel}>Créer le salon duo</button>
        </section>
      )}

      {screen === 'join' && (
        <section className="panel form-panel">
          <div className="panel-header">
            <button className="text-btn" type="button" onClick={goHome}>← Retour</button>
            <div><p className="eyebrow">🔑 Accès privé par invitation</p><h2>Rejoindre une Arena</h2></div>
          </div>

          <div className="form-grid">
            <label>
              Pseudo temporaire
              <input value={playerName} onChange={(event) => setPlayerName(event.target.value)} />
            </label>
            <label>
              Avatar
              <div className="avatars">
                {avatars.map((item) => (
                  <button key={item} type="button" className={`avatar-chip ${avatar === item ? 'selected' : ''}`} onClick={() => setAvatar(item)}>
                    {item}
                  </button>
                ))}
              </div>
            </label>
            <label>
              Code d’équipe
              <input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="TEAM-A-482951" autoComplete="off" />
            </label>
          </div>

          {joinError && <p className="form-error">{joinError}</p>}
          <button type="button" className="btn btn-primary" onClick={joinDuel}>Rejoindre</button>
        </section>
      )}

      {screen === 'waiting' && createdGame && (
        <section className="lobby-shell">
          <div className="panel-header">
            <button className="text-btn" type="button" onClick={leaveLobby}>← Quitter le salon</button>
            <div><p className="eyebrow">Lobby sécurisé · {sessionId}</p><h2>Salle d’attente de l’Arena</h2></div>
            <span className="lobby-live">● Temps réel connecté</span>
          </div>

          <div className="lobby-grid">
            <aside className="lobby-private-card">
              <div className="lobby-team-title"><span className={joinedTeam === 'A' ? 'team-dot blue' : 'team-dot red'} /> <div><p>Canal privé</p><h3>{joinedTeam === 'A' ? createdGame.teamAName : createdGame.teamBName}</h3></div></div>
              <p className="lobby-member-count">{joinedTeam === 'A' ? teamMembersA.length : teamMembersB.length} joueur(s) connecté(s)</p>
              <div className="lobby-roster">
                {(joinedTeam === 'A' ? teamMembersA : teamMembersB).map((player, index) => <div className="lobby-player" key={`${player.name}-${index}`}><span className="lobby-avatar">{player.avatar}</span><div><strong>{player.name}</strong><small>{player.connected === false ? '🟡 En attente de reconnexion' : `🟢 Connecté · ${isLobbyHost && index === 0 ? 'Organisateur' : 'Membre'}`}</small></div><span className="ready-badge">{player.connected === false ? 'Absent' : 'Prêt'}</span></div>)}
                {(joinedTeam === 'A' ? teamMembersA : teamMembersB).length === 0 && <p className="empty-roster">En attente de joueurs…</p>}
              </div>
              <div className="lobby-invite"><span>Code d’invitation privé</span><strong>{joinedTeam === 'A' ? createdGame.codeA : createdGame.codeB}</strong><button className="text-btn" type="button" onClick={() => navigator.clipboard.writeText(joinedTeam === 'A' ? createdGame.codeA : createdGame.codeB)}>Copier le code</button></div>
              <div className="chat-box lobby-chat"><strong>Chat de votre équipe</strong><div className="chat-log">{(joinedTeam === 'A' ? teamAChat : teamBChat).length === 0 ? <p className="chat-empty">Canal chiffré prêt. Préparez votre stratégie.</p> : (joinedTeam === 'A' ? teamAChat : teamBChat).map((chat) => <p key={chat.id} className="chat-message"><strong>{chat.author}</strong> : {chat.text}</p>)}</div><div className="chat-input-row"><input value={joinedTeam === 'A' ? teamAInput : teamBInput} onChange={(event) => joinedTeam === 'A' ? setTeamAInput(event.target.value) : setTeamBInput(event.target.value)} placeholder="Message privé" /><button className="btn btn-secondary" type="button" onClick={() => joinedTeam && sendTeamChat(joinedTeam)}>Envoyer</button></div></div>
            </aside>

            <div className="lobby-public-card">
              <p className="eyebrow">Match à venir</p><h3>{createdGame.teamAName} <span>VS</span> {createdGame.teamBName}</h3>
              <div className="lobby-versus"><div className="team-emblem team-a">A</div><div className="vs-pulse">VS</div><div className="team-emblem team-b">B</div></div>
              <p className="lobby-total">{lobbyTeamCounts.A + lobbyTeamCounts.B} joueurs connectés au total · {lobbyNotice}</p>
              <div className="match-settings"><span>📚 {duelConfig.category}</span><span>◈ {duelConfig.difficulty}</span><span>◉ {duelConfig.questionsCount} questions</span><span>◷ 30 secondes</span></div>
              {isLobbyHost ? <div className="host-start"><p>{lobbyTeamCounts.A > 0 && lobbyTeamCounts.B > 0 ? 'Les deux équipes sont prêtes.' : 'Une présence est requise dans chaque équipe.'}</p><button type="button" className="text-btn lobby-codes-trigger" onClick={() => setInviteCodesVisible(true)}>Voir les codes d’invitation</button><button type="button" className="btn btn-primary" disabled={lobbyCountdown !== null || lobbyTeamCounts.A === 0 || lobbyTeamCounts.B === 0} onClick={requestDuelStart}>Commencer la partie</button></div> : <div className="host-start"><p>Seul le créateur peut lancer le match.</p><span className="ready-badge">En attente de l’organisateur</span></div>}
            </div>
            <aside className="lobby-opponent-card"><span>👥</span><strong>{joinedTeam === 'A' ? createdGame.teamBName : createdGame.teamAName}</strong><p>Joueurs de l’équipe adverse — discussions privées masquées.</p><div className="lobby-roster">{(joinedTeam === 'A' ? teamMembersB : teamMembersA).map((player, index) => <div className="lobby-player" key={`${player.name}-${index}`}><span className="lobby-avatar">{player.avatar}</span><div><strong>{player.name}</strong><small>{player.connected === false ? '🟡 En attente de reconnexion' : '🟢 Connecté'}</small></div></div>)}{(joinedTeam === 'A' ? teamMembersB : teamMembersA).length === 0 && <p className="empty-roster">En attente de joueurs…</p>}</div><div className="opponent-online">● {joinedTeam === 'A' ? lobbyTeamCounts.B : lobbyTeamCounts.A} joueur(s) connecté(s)</div></aside>
          </div>
          {lobbyCountdown !== null && <motion.div className="lobby-countdown" initial={{ opacity: 0 }} animate={{ opacity: 1 }}><p>La partie commence</p><strong key={lobbyCountdown}>{lobbyCountdown || 'GO!'}</strong></motion.div>}
          {inviteCodesVisible && isLobbyHost && <motion.div className="invite-codes-backdrop" initial={{ opacity: 0 }} animate={{ opacity: 1 }} role="dialog" aria-modal="true" aria-label="Codes privés de la partie"><motion.div className="invite-codes-modal" initial={{ scale: .95, y: 12 }} animate={{ scale: 1, y: 0 }}><div className="invite-modal-head"><div><p className="eyebrow">Organisateur uniquement</p><h3>Partie créée avec succès</h3></div><button type="button" className="text-btn" onClick={() => setInviteCodesVisible(false)}>Fermer</button></div><p className="invite-modal-copy">Transmettez chaque code uniquement aux joueurs de l’équipe concernée.</p><div className="invite-code-card team-a-code"><span>Salle {createdGame.teamAName}</span><strong>{createdGame.codeA}</strong><button className="btn btn-secondary" type="button" onClick={() => navigator.clipboard.writeText(createdGame.codeA)}>Copier le code A</button></div><div className="invite-code-card team-b-code"><span>Salle {createdGame.teamBName}</span><strong>{createdGame.codeB}</strong><button className="btn btn-secondary" type="button" onClick={() => navigator.clipboard.writeText(createdGame.codeB)}>Copier le code B</button></div></motion.div></motion.div>}
        </section>
      )}

      {screen === 'quiz' && currentQuestion && (
        <section className="panel quiz-panel">
          <div className="quiz-header">
            <div>
              <p className="eyebrow">Question {questionIndex + 1}/{questions.length}</p>
              <h2>{currentQuestion.question}</h2>
            </div>
            <div className="timer-card">⏱ {timeLeft}s</div>
          </div>

          <div className="progress-bar">
            <div style={{ width: `${progress}%` }} />
          </div>

          <div className="scoreboard">
            <div className="score-card">
              <span>{gameMode === 'duel' ? createdGame?.teamAName ?? 'Équipe A' : 'Score solo'}</span>
              <strong>{gameMode === 'duel' ? teamAScore : soloScore}</strong>
            </div>
            <div className="score-card">
              <span>{gameMode === 'duel' ? createdGame?.teamBName ?? 'Équipe B' : 'Temps restant'}</span>
              <strong>{gameMode === 'duel' ? teamBScore : `${timeLeft}s`}</strong>
            </div>
          </div>

          {gameMode === 'duel' ? (
            <div className="duel-layout">
              <div className="duel-side">
                <div className="card">
                  <h3>{createdGame?.teamAName ?? 'Équipe A'}</h3>
                  <p className="stat-pill">Score : {teamAScore}</p>
                  <p className="stat-pill">Canal privé • réservé à l’équipe</p>
                  <p className="stat-pill">Membres connectés : {teamMembersA.length}</p>
                  <p className="stat-pill">Représentant : {joinedTeam === 'A' ? (captainName ?? playerName) : 'En attente'}</p>
                  <ul className="member-list">
                    {teamMembersA.map((player, index) => <li key={`${player.name}-${index}`}>{player.avatar} {player.name}</li>)}
                  </ul>
                  {joinedTeam === 'A' ? <>
                  <div className="team-action-panel">
                    <strong>Préparation privée</strong>
                    <div className="draft-options">
                      {(Object.keys(currentQuestion.options) as AnswerKey[]).map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={`draft-option ${teamDraftAnswers.A === option ? 'selected' : ''}`}
                          onClick={() => setTeamDraftAnswers((prev) => ({ ...prev, A: option }))}
                        disabled={answerLocked || reboundDecisionPending || !isDuelChatActive}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    <div className="team-action-row">
                      <span>{teamDraftAnswers.A ? `Choix préparé : ${teamDraftAnswers.A}` : 'Sélectionnez une réponse'}</span>
                      <button
                        className="btn btn-tertiary"
                        type="button"
                        onClick={() => {
                          const draft = teamDraftAnswers.A
                          if (!draft) {
                            return
                          }
                          submitOfficialAnswer('A', draft)
                        }}
                        disabled={answerLocked || reboundDecisionPending || answeringTeam !== 'A' || !teamDraftAnswers.A}
                      >
                        Valider
                      </button>
                    </div>
                  </div>
                  <div className="chat-box">
                    <strong>Chat équipe A</strong>
                    <p className="chat-hint">Visible uniquement par {createdGame?.teamAName ?? 'Équipe A'}.</p>
                    <div className="chat-log">
                      {teamAChat.length === 0 ? <p className="chat-empty">Aucun message privé pour l’instant.</p> : teamAChat.map((chat) => <p key={chat.id} className="chat-message"><strong>{chat.author}</strong> : {chat.text}</p>)}
                    </div>
                    <div className="chat-input-row">
                      <input value={teamAInput} onChange={(event) => setTeamAInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); sendTeamChat('A') } }} placeholder="Plan de réponse" disabled={answerLocked || !isDuelChatActive} />
                      <button className="btn btn-secondary" type="button" onClick={() => sendTeamChat('A')} disabled={answerLocked || !isDuelChatActive}>Envoyer</button>
                    </div>
                  </div>
                  </> : <div className="private-placeholder"><span>🔒</span><strong>Équipe A réfléchit…</strong><p>Les échanges et réponses préparées restent privés.</p></div>}
                </div>
              </div>

              <div className="duel-center">
                <div className="card">
                  <p className="eyebrow">{reboundMode ? `Rebond • ${answeringTeamName}` : `Tour de l'${activeTeamName}`}</p>
                  <h3>{currentQuestion.question}</h3>
                  <p className="phase-pill">Phase : {duelPhase}</p>
                  <p className="phase-pill">{reboundMode ? 'L’autre équipe doit tenter un rebond' : `Équipe active : ${answeringTeamName}`}</p>
                  <div className="options-grid">
                    {(Object.keys(currentQuestion.options) as AnswerKey[]).map((option) => (
                      <button
                        key={option}
                        type="button"
                        className={`option-card ${selectedAnswer === option ? 'selected' : ''}`}
                        disabled
                      >
                        <span>{option}</span>
                        <strong>{currentQuestion.options[option]}</strong>
                      </button>
                    ))}
                  </div>
                  <div className="feedback-box">{feedbackMessage || 'Le premier joueur à valider devient le représentant de l’équipe pour cette question.'}</div>
                </div>
              </div>

              <div className="duel-side">
                <div className="card">
                  <h3>{createdGame?.teamBName ?? 'Équipe B'}</h3>
                  <p className="stat-pill">Score : {teamBScore}</p>
                  <p className="stat-pill">Canal privé • réservé à l’équipe</p>
                  <p className="stat-pill">Membres connectés : {teamMembersB.length}</p>
                  <p className="stat-pill">Représentant : {joinedTeam === 'B' ? (captainName ?? playerName) : 'En attente'}</p>
                  <ul className="member-list">
                    {teamMembersB.map((player, index) => <li key={`${player.name}-${index}`}>{player.avatar} {player.name}</li>)}
                  </ul>
                  {joinedTeam === 'B' ? <>
                  <div className="team-action-panel">
                    <strong>Préparation privée</strong>
                    <div className="draft-options">
                      {(Object.keys(currentQuestion.options) as AnswerKey[]).map((option) => (
                        <button
                          key={option}
                          type="button"
                          className={`draft-option ${teamDraftAnswers.B === option ? 'selected' : ''}`}
                          onClick={() => setTeamDraftAnswers((prev) => ({ ...prev, B: option }))}
                        disabled={answerLocked || reboundDecisionPending || !isDuelChatActive}
                        >
                          {option}
                        </button>
                      ))}
                    </div>
                    <div className="team-action-row">
                      <span>{teamDraftAnswers.B ? `Choix préparé : ${teamDraftAnswers.B}` : 'Sélectionnez une réponse'}</span>
                      <button
                        className="btn btn-tertiary"
                        type="button"
                        onClick={() => {
                          const draft = teamDraftAnswers.B
                          if (!draft) {
                            return
                          }
                          submitOfficialAnswer('B', draft)
                        }}
                        disabled={answerLocked || reboundDecisionPending || answeringTeam !== 'B' || !teamDraftAnswers.B}
                      >
                        Valider
                      </button>
                    </div>
                  </div>
                  <div className="chat-box">
                    <strong>Chat équipe B</strong>
                    <p className="chat-hint">Visible uniquement par {createdGame?.teamBName ?? 'Équipe B'}.</p>
                    <div className="chat-log">
                      {teamBChat.length === 0 ? <p className="chat-empty">Aucun message privé pour l’instant.</p> : teamBChat.map((chat) => <p key={chat.id} className="chat-message"><strong>{chat.author}</strong> : {chat.text}</p>)}
                    </div>
                    <div className="chat-input-row">
                      <input value={teamBInput} onChange={(event) => setTeamBInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); sendTeamChat('B') } }} placeholder="Plan de réponse" disabled={answerLocked || !isDuelChatActive} />
                      <button className="btn btn-secondary" type="button" onClick={() => sendTeamChat('B')} disabled={answerLocked || !isDuelChatActive}>Envoyer</button>
                    </div>
                  </div>
                  </> : <div className="private-placeholder"><span>🔒</span><strong>Équipe B réfléchit…</strong><p>Les échanges et réponses préparées restent privés.</p></div>}
                </div>
              </div>
            </div>
          ) : (
            <div className="quiz-body">
              <div className="representative-card">
                <span>Représentant actuel</span>
                <strong>{captainName ?? 'Solo'}</strong>
                <p>Vous êtes le seul représentant.</p>
              </div>

              <div className="options-grid">
                {(Object.keys(currentQuestion.options) as AnswerKey[]).map((option) => (
                  <button
                    key={option}
                    type="button"
                    className={`option-card ${selectedAnswer === option ? 'selected' : ''} ${answerLocked && option === currentQuestion.correctAnswer ? 'correct-answer' : ''} ${answerLocked && selectedAnswer === option && option !== currentQuestion.correctAnswer ? 'wrong-answer' : ''}`}
                    onClick={() => handleSoloAnswer(option)}
                    disabled={answerLocked}
                  >
                    <span>{option}</span>
                    <strong>{currentQuestion.options[option]}</strong>
                  </button>
                ))}
              </div>
            </div>
          )}

          {gameMode === 'solo' && answerLocked && (
            <div className="feedback-box solo-feedback" role="status">
              <strong>{feedbackMessage}</strong>
              {!selectedAnswer || selectedAnswer !== currentQuestion.correctAnswer ? <p>{currentQuestion.explanation}</p> : null}
              <small>Question suivante dans quelques instants…</small>
            </div>
          )}

          {gameMode === 'duel' && reboundDecisionPending && (
            <motion.div
              className="rebound-backdrop"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              role="dialog"
              aria-modal="true"
              aria-labelledby="rebound-title"
            >
              <motion.div className="rebound-modal" initial={{ opacity: 0, scale: .94, y: 16 }} animate={{ opacity: 1, scale: 1, y: 0 }}>
                <div className="rebound-modal-head">
                  <span className="rebound-signal">⚡</span>
                  <div><p>Décision stratégique</p><h3 id="rebound-title">Réplique disponible</h3></div>
                  <strong className="decision-clock">{reboundDecisionTime}s</strong>
                </div>
                <div className="rebound-team-name">{answeringTeam === 'A' ? createdGame?.teamAName ?? 'Équipe A' : createdGame?.teamBName ?? 'Équipe B'}</div>
                {joinedTeam === answeringTeam ? <>
                  <p className="rebound-copy">L’équipe adverse a perdu son tour. Voulez-vous prendre le risque d’une réplique ?</p>
                  <div className="rebound-risk"><span>Bonne réponse</span><strong>+5 pts</strong><span>Mauvaise réponse</span><strong>−5 pts</strong></div>
                  <div className="rebound-actions"><button type="button" className="btn rebound-accept" onClick={acceptRebound}>✓ Accepter la réplique</button><button type="button" className="btn rebound-refuse" onClick={() => refuseRebound()}>× Refuser</button></div>
                  <p className="rebound-timeout">Sans décision, la réplique sera refusée automatiquement.</p>
                </> : <p className="rebound-copy rebound-wait">L’équipe adverse décide de sa réplique. Vous serez informé uniquement après validation.</p>}
              </motion.div>
            </motion.div>
          )}

          {showResultOverlay && duelRoundSummary && gameMode === 'duel' && (
            <div className="results-overlay">
              <h3>Résultat intermédiaire</h3>
              <p><strong>Question :</strong> {currentQuestion.question}</p>
              <p><strong>Réponse correcte :</strong> {currentQuestion.correctAnswer} • {currentQuestion.options[currentQuestion.correctAnswer]}</p>
              <div className="results-grid">
                <div className="card">
                  <h4>{createdGame?.teamAName ?? 'Équipe A'}</h4>
                  <p>Réponse : {duelRoundSummary.teamAResponse ?? '—'}</p>
                  <p>Résultat : {duelRoundSummary.teamAResult === 'correct' ? '✅ Bonne réponse' : duelRoundSummary.teamAResult === 'incorrect' ? '❌ Incorrect' : duelRoundSummary.teamAResult === 'refused' ? '↪ Réplique refusée' : '⏳ En attente'}</p>
                  <p>Points : {duelRoundSummary.teamAPoints}</p>
                </div>
                <div className="card">
                  <h4>{createdGame?.teamBName ?? 'Équipe B'}</h4>
                  <p>Réponse : {duelRoundSummary.teamBResponse ?? '—'}</p>
                  <p>Résultat : {duelRoundSummary.teamBResult === 'correct' ? '✅ Réplique réussie' : duelRoundSummary.teamBResult === 'incorrect' ? '❌ Réplique échouée' : duelRoundSummary.teamBResult === 'refused' ? '↪ Réplique refusée' : '⏳ En attente'}</p>
                  <p>Points : {duelRoundSummary.teamBPoints}</p>
                </div>
              </div>
              <p>{currentQuestion.explanation}</p>
              <p className="auto-next">Prochaine question dans quelques instants…</p>
            </div>
          )}
        </section>
      )}

      {screen === 'quiz' && !currentQuestion && (
        <section className="panel form-panel">
          <div className="panel-header">
            <div>
              <p className="eyebrow">Quiz indisponible</p>
              <h2>Aucune question n’a été chargée</h2>
            </div>
          </div>
          <p>Retournez à la configuration puis relancez la partie.</p>
          <button type="button" className="btn btn-primary" onClick={goHome}>Retour à l’accueil</button>
        </section>
      )}

      {screen === 'results' && (
        <section className="panel results-panel">
          <div className="panel-header">
            <button className="text-btn" type="button" onClick={goHome}>← Retour</button>
            <h2>Résultats finaux</h2>
          </div>

          {gameMode === 'solo' ? (
            <div className="results-grid">
              <div className="card">
                <h3>Score final</h3>
                <p className="big-score">{soloScore}</p>
                <p>Pourcentage de réussite : {successRate}%</p>
              </div>
              <div className="card">
                <h3>Statistiques</h3>
                <ul>
                  <li>Bonnes réponses : {correctCount}</li>
                  <li>Mauvaises réponses : {wrongCount}</li>
                  <li>Session : {sessionId}</li>
                </ul>
              </div>
            </div>
          ) : (
            <div className="results-grid">
              <div className="card">
                <h3>Équipe gagnante</h3>
                <p className="big-score">{teamAScore === teamBScore ? 'Égalité' : teamAScore > teamBScore ? createdGame?.teamAName ?? 'Équipe A' : createdGame?.teamBName ?? 'Équipe B'}</p>
                <p>{teamAScore} - {teamBScore}</p>
              </div>
              <div className="card">
                <h3>Classement</h3>
                <ul>
                  <li>{createdGame?.teamAName ?? 'Équipe A'} : {teamAScore}</li>
                  <li>{createdGame?.teamBName ?? 'Équipe B'} : {teamBScore}</li>
                </ul>
              </div>
            </div>
          )}

          <div className="history-card">
            <h3>Historique des réponses</h3>
            <ul>
              {answers.map((answer) => (
                <li key={`${answer.questionId}-${answer.roundLabel}`}>
                  {answer.roundLabel} • {answer.isCorrect ? '✅' : '❌'} • {answer.points > 0 ? `+${answer.points}` : answer.points}
                </li>
              ))}
            </ul>
          </div>
        </section>
      )}
    </div>
  )
}

export default App
