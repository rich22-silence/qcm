import { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import {
  ArrowLeft,
  Clock3,
  Copy,
  Crown,
  MessageCircle,
  MonitorPlay,
  ShieldCheck,
  Sparkles,
  Trophy,
  Users,
  Zap,
} from 'lucide-react'
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
  teamAResult: 'pending' | 'correct' | 'incorrect'
  teamBResult: 'pending' | 'correct' | 'incorrect'
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
const avatars = ['🧑‍🚀', '🎮', '🦊', '⚡', '👾', '🦁']

const questionBank: Question[] = [
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

function buildQuestions(category: Category, difficulty: Difficulty, count: number) {
  const filtered = questionBank.filter((question) => question.category === category && question.difficulty === difficulty)
  if (filtered.length >= count) {
    return filtered.slice(0, count)
  }

  return filtered.length > 0 ? filtered.slice(0, Math.min(count, filtered.length)) : questionBank.slice(0, count)
}

function QuizArenaApp() {
  const [screen, setScreen] = useState<Screen>('home')
  const [gameMode, setGameMode] = useState<GameMode>('solo')
  const [playerName, setPlayerName] = useState('Koffi')
  const [avatar, setAvatar] = useState(avatars[0])
  const [sessionId] = useState(() => `SESSION-${Math.floor(Math.random() * 9000 + 1000)}`)
  const [soloConfig, setSoloConfig] = useState({ category: 'Culture générale' as Category, difficulty: 'Moyen' as Difficulty, questionsCount: 6 })
  const [duelConfig, setDuelConfig] = useState({
    teamAName: 'Equipe A',
    teamBName: 'Equipe B',
    category: 'Culture générale' as Category,
    difficulty: 'Moyen' as Difficulty,
    questionsCount: 6,
    maxPlayers: 3,
    phase: 'Qualification' as DuelPhase,
  })
  const [joinCode, setJoinCode] = useState('')
  const [joinedTeam, setJoinedTeam] = useState<TeamKey | null>(null)
  const [createdGame, setCreatedGame] = useState<{
    codeA: string
    codeB: string
    teamAName: string
    teamBName: string
    teamARoster: Array<{ name: string; avatar: string }>
    teamBRoster: Array<{ name: string; avatar: string }>
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

  const currentQuestion = questions[questionIndex]
  const progress = questions.length > 0 ? ((questionIndex + 1) / questions.length) * 100 : 0

  useEffect(() => {
    if (screen !== 'quiz' || answerLocked || showResultOverlay) {
      return
    }

    const interval = window.setInterval(() => {
      setTimeLeft((prev) => prev - 1)
    }, 1000)

    return () => window.clearInterval(interval)
  }, [screen, answerLocked, showResultOverlay])

  useEffect(() => {
    if (screen !== 'quiz' || answerLocked || showResultOverlay) {
      return
    }

    if (timeLeft <= 0) {
      if (gameMode === 'solo') {
        handleSoloAnswer(null)
      } else {
        handleDuelAnswer(null)
      }
    }
  }, [screen, answerLocked, showResultOverlay, timeLeft, gameMode])

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
  }

  function startSoloQuiz() {
    resetQuizState()
    const generatedQuestions = buildQuestions(soloConfig.category, soloConfig.difficulty, soloConfig.questionsCount)
    setQuestions(generatedQuestions)
    setGameMode('solo')
    setScreen('quiz')
  }

  function createDuel() {
    const codeA = `TEAM-A-${Math.floor(Math.random() * 9000 + 1000)}`
    const codeB = `TEAM-B-${Math.floor(Math.random() * 9000 + 1000)}`
    setCreatedGame({
      codeA,
      codeB,
      teamAName: duelConfig.teamAName,
      teamBName: duelConfig.teamBName,
      teamARoster: [{ name: playerName, avatar }],
      teamBRoster: [{ name: 'Mina', avatar: '📡' }],
      phase: duelConfig.phase,
    })
    setDuelPhase(duelConfig.phase)
    setJoinedTeam('A')
    setGameMode('duel')
    setScreen('waiting')
  }

  function joinDuel() {
    if (!createdGame) {
      return
    }

    const team = joinCode === createdGame.codeA ? 'A' : 'B'
    const nextRoster = team === 'A'
      ? [...createdGame.teamARoster, { name: playerName, avatar }]
      : [...createdGame.teamBRoster, { name: playerName, avatar }]

    if (team === 'A') {
      setCreatedGame((prev) => prev ? { ...prev, teamARoster: nextRoster } : prev)
    } else {
      setCreatedGame((prev) => prev ? { ...prev, teamBRoster: nextRoster } : prev)
    }
    setJoinedTeam(team)
    setScreen('waiting')
  }

  function startDuelQuiz() {
    resetQuizState()
    const generatedQuestions = buildQuestions(duelConfig.category, duelConfig.difficulty, duelConfig.questionsCount)
    setQuestions(generatedQuestions)
    setGameMode('duel')
    setDuelPhase(duelConfig.phase)
    setScreen('quiz')
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
    setAnsweringTeam((prev) => (prev === 'A' ? 'B' : 'A'))
    setReboundMode(false)
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
    setFeedbackMessage(isCorrect ? 'Bonne réponse !' : 'Réponse incorrecte. La bonne réponse a été révélée.')

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
    }, 1400)
  }

  function submitOfficialAnswer(team: TeamKey, choice: AnswerKey | null) {
    if (!currentQuestion || answerLocked || team !== answeringTeam) {
      return
    }

    setSelectedAnswer(choice)
    const isCorrect = choice === currentQuestion.correctAnswer
    const directPoints = duelPhase === 'Qualification' ? 10 : duelPhase === 'Demi-finale' ? 20 : 15
    const reboundPoints = duelPhase === 'Qualification' ? 5 : duelPhase === 'Demi-finale' ? 10 : 20
    const captainLabel = playerName || 'Capitaine'
    setCaptainName(captainLabel)

    if (team === 'A') {
      if (isCorrect) {
        setTeamAScore((prev) => prev + directPoints)
        setDuelRoundSummary({
          teamAResponse: choice,
          teamBResponse: null,
          teamAResult: 'correct',
          teamBResult: 'pending',
          teamAPoints: directPoints,
          teamBPoints: 0,
          explanation: currentQuestion.explanation,
        })
        setAnswerLocked(true)
        setShowResultOverlay(true)
        setFeedbackMessage('✅ Bonne réponse !')
        return
      }

      setTeamAScore((prev) => prev - 10)
      setDuelRoundSummary({
        teamAResponse: choice,
        teamBResponse: null,
        teamAResult: 'incorrect',
        teamBResult: 'pending',
        teamAPoints: -10,
        teamBPoints: 0,
        explanation: currentQuestion.explanation,
      })
      setAnswerLocked(false)
      setFeedbackMessage(`❌ Mauvaise réponse. ${createdGame?.teamBName ?? 'Équipe B'} peut tenter un rebond.`)
      setReboundMode(true)
      setAnsweringTeam('B')
      setTimeLeft(15)
      return
    }

    if (isCorrect) {
      setTeamBScore((prev) => prev + reboundPoints)
      setDuelRoundSummary((prev) => prev ? {
        ...prev,
        teamBResponse: choice,
        teamBResult: 'correct',
        teamBPoints: reboundPoints,
      } : {
        teamAResponse: null,
        teamBResponse: choice,
        teamAResult: 'pending',
        teamBResult: 'correct',
        teamAPoints: 0,
        teamBPoints: reboundPoints,
        explanation: currentQuestion.explanation,
      })
      setAnswerLocked(true)
      setShowResultOverlay(true)
      setFeedbackMessage('✅ Bonne récupération !')
      return
    }

    setTeamBScore((prev) => prev - 5)
    setDuelRoundSummary((prev) => prev ? {
      ...prev,
      teamBResponse: choice,
      teamBResult: 'incorrect',
      teamBPoints: -5,
    } : {
      teamAResponse: null,
      teamBResponse: choice,
      teamAResult: 'pending',
      teamBResult: 'incorrect',
      teamAPoints: 0,
      teamBPoints: -5,
      explanation: currentQuestion.explanation,
    })
    setAnswerLocked(true)
    setShowResultOverlay(true)
    setFeedbackMessage('❌ Mauvaise récupération.')
  }

  function handleDuelAnswer(choice: AnswerKey | null) {
    submitOfficialAnswer(answeringTeam, choice)
  }

  function sendTeamChat(team: TeamKey) {
    const input = team === 'A' ? teamAInput : teamBInput
    if (!input.trim()) {
      return
    }

    if (team === 'A') {
      setTeamAChat((prev) => [...prev, { id: Date.now(), author: playerName, text: input.trim() }])
      setTeamAInput('')
    } else {
      setTeamBChat((prev) => [...prev, { id: Date.now(), author: playerName, text: input.trim() }])
      setTeamBInput('')
    }
  }

  function goHome() {
    resetQuizState()
    setScreen('home')
  }

  const correctCount = answers.filter((answer) => answer.isCorrect).length
  const wrongCount = answers.filter((answer) => !answer.isCorrect).length
  const successRate = questions.length > 0 ? Math.round((correctCount / questions.length) * 100) : 0
  const answeringTeamName = gameMode === 'duel' ? (answeringTeam === 'A' ? createdGame?.teamAName ?? 'Équipe A' : createdGame?.teamBName ?? 'Équipe B') : 'Solo'
  const teamMembersA = createdGame?.teamARoster ?? []
  const teamMembersB = createdGame?.teamBRoster ?? []

  const timerClass = timeLeft <= 10 ? 'text-amber-300' : timeLeft <= 3 ? 'text-red-400' : 'text-cyan-300'
  const timerRing = timeLeft <= 10 ? 'from-amber-400/80 to-orange-500/80' : timeLeft <= 3 ? 'from-red-500/80 to-orange-400/80' : 'from-cyan-400/80 via-blue-500/80 to-violet-500/80'

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.14),_transparent_28%),radial-gradient(circle_at_top_right,_rgba(248,113,113,0.16),_transparent_28%),linear-gradient(135deg,_#040816_0%,_#0b1120_45%,_#111827_100%)] text-slate-100">
      <div className="mx-auto flex max-w-7xl flex-col gap-6 px-4 py-5 sm:px-6 lg:px-8">
        <motion.header
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="rounded-[28px] border border-white/10 bg-slate-900/70 p-5 shadow-[0_0_80px_rgba(59,130,246,0.16)] backdrop-blur-xl sm:p-7"
        >
          <div className="flex flex-col gap-5 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="rounded-2xl border border-cyan-400/30 bg-cyan-400/10 p-3 shadow-[0_0_20px_rgba(34,211,238,0.2)]">
                <Sparkles className="h-6 w-6 text-cyan-300" />
              </div>
              <div>
                <p className="text-[11px] uppercase tracking-[0.35em] text-cyan-300">Quiz Arena</p>
                <h1 className="text-2xl font-semibold sm:text-3xl">Le show de quiz premium</h1>
              </div>
            </div>
            <nav className="flex flex-wrap items-center gap-2 text-sm text-slate-300">
              {['Accueil', 'Solo', 'Duel', 'Classement'].map((item) => (
                <a key={item} href="#" className="rounded-full border border-white/10 bg-white/5 px-3 py-2 transition hover:border-cyan-400/40 hover:text-white">
                  {item}
                </a>
              ))}
              <button type="button" className="rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 font-semibold text-white shadow-lg shadow-cyan-500/20" onClick={() => setScreen('solo-config')}>
                Commencer à jouer
              </button>
            </nav>
          </div>
        </motion.header>

        {screen === 'home' && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <div className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-[0_0_90px_rgba(2,6,23,0.35)] backdrop-blur-xl sm:p-8 lg:p-10">
              <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-3 py-1 text-sm text-cyan-200">
                <Zap className="h-4 w-4" />
                Mode live • duel télévisé • expérience premium
              </div>
              <h2 className="mt-6 text-4xl font-semibold leading-tight sm:text-5xl">
                Teste tes connaissances.<br />
                Affronte tes amis.<br />
                Deviens le champion.
              </h2>
              <p className="mt-4 max-w-2xl text-lg text-slate-300">
                Une interface immersive, fluide et moderne pour des matchs de culture générale à l’énergie d’un show compétitif.
              </p>
              <div className="mt-8 flex flex-wrap gap-3">
                <button type="button" className="rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 px-5 py-3 font-semibold text-white shadow-lg shadow-cyan-500/20" onClick={() => { setGameMode('solo'); setScreen('solo-config') }}>
                  <span className="mr-2 inline-flex">🎯</span> Mode Solo
                </button>
                <button type="button" className="rounded-full border border-rose-400/30 bg-rose-500/10 px-5 py-3 font-semibold text-rose-200" onClick={() => { setGameMode('duel'); setScreen('duel-config') }}>
                  <span className="mr-2 inline-flex">⚔️</span> Créer un Duel
                </button>
                <button type="button" className="rounded-full border border-white/10 bg-white/5 px-5 py-3 font-semibold text-slate-100" onClick={() => setScreen('join')}>
                  <span className="mr-2 inline-flex">🔑</span> Rejoindre une Partie
                </button>
              </div>
            </div>

            <div className="rounded-[32px] border border-white/10 bg-slate-900/70 p-5 shadow-[0_0_90px_rgba(37,99,235,0.14)] backdrop-blur-xl">
              <div className="floating-card relative overflow-hidden rounded-[28px] border border-cyan-400/20 bg-gradient-to-br from-slate-900 via-slate-800 to-slate-950 p-5">
                <div className="absolute inset-0 bg-[radial-gradient(circle,_rgba(34,211,238,0.16),_transparent_60%)]" />
                <div className="relative space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Question live</p>
                      <h3 className="mt-1 text-xl font-semibold">Quelle est la capitale du Japon ?</h3>
                    </div>
                    <div className="rounded-xl border border-cyan-400/30 bg-cyan-400/10 px-3 py-2 text-sm text-cyan-200">⏱ 25s</div>
                  </div>
                  <div className="grid gap-3 sm:grid-cols-2">
                    {['Osaka', 'Kyoto', 'Tokyo', 'Sapporo'].map((label, index) => (
                      <div key={label} className={`rounded-2xl border border-white/10 bg-white/5 p-3 text-sm ${index === 2 ? 'border-cyan-400/30 bg-cyan-400/10' : ''}`}>
                        <span className="mb-2 block text-xs uppercase tracking-[0.25em] text-slate-400">Option {String.fromCharCode(65 + index)}</span>
                        <strong>{label}</strong>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </motion.section>
        )}

        {screen === 'solo-config' && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-[0_0_90px_rgba(2,6,23,0.35)] backdrop-blur-xl sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <button className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200" type="button" onClick={goHome}><ArrowLeft className="mr-2 inline h-4 w-4" />Retour</button>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Mode Solo</p>
                <h2 className="text-2xl font-semibold">Prépare ton entraînement</h2>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-sm text-slate-400">Pseudo temporaire</span>
                <input value={playerName} onChange={(event) => setPlayerName(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none ring-0" />
              </label>
              <label className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-sm text-slate-400">Avatar</span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {avatars.map((item) => (
                    <button key={item} type="button" className={`rounded-full border px-3 py-2 text-lg ${avatar === item ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200' : 'border-white/10 bg-slate-950/70 text-slate-200'}`} onClick={() => setAvatar(item)}>{item}</button>
                  ))}
                </div>
              </label>
              <label className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-sm text-slate-400">Catégorie</span>
                <select value={soloConfig.category} onChange={(event) => setSoloConfig((prev) => ({ ...prev, category: event.target.value as Category }))} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none">
                  {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              <label className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-sm text-slate-400">Niveau</span>
                <select value={soloConfig.difficulty} onChange={(event) => setSoloConfig((prev) => ({ ...prev, difficulty: event.target.value as Difficulty }))} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none">
                  {difficulties.map((difficulty) => <option key={difficulty} value={difficulty}>{difficulty}</option>)}
                </select>
              </label>
              <label className="rounded-2xl border border-white/10 bg-white/5 p-4 md:col-span-2">
                <span className="text-sm text-slate-400">Nombre de questions</span>
                <input type="number" min="3" max="10" value={soloConfig.questionsCount} onChange={(event) => setSoloConfig((prev) => ({ ...prev, questionsCount: Number(event.target.value) }))} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none" />
              </label>
            </div>
            <button type="button" className="mt-6 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 px-5 py-3 font-semibold text-white shadow-lg shadow-cyan-500/20" onClick={startSoloQuiz}>Lancer le quiz</button>
          </motion.section>
        )}

        {screen === 'duel-config' && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-[0_0_90px_rgba(2,6,23,0.35)] backdrop-blur-xl sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <button className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200" type="button" onClick={goHome}><ArrowLeft className="mr-2 inline h-4 w-4" />Retour</button>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-rose-300">Créer une Arena</p>
                <h2 className="text-2xl font-semibold">Prépare l’affrontement</h2>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-sm text-slate-400">Pseudo temporaire</span>
                <input value={playerName} onChange={(event) => setPlayerName(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none" />
              </label>
              <label className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-sm text-slate-400">Avatar</span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {avatars.map((item) => (
                    <button key={item} type="button" className={`rounded-full border px-3 py-2 text-lg ${avatar === item ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200' : 'border-white/10 bg-slate-950/70 text-slate-200'}`} onClick={() => setAvatar(item)}>{item}</button>
                  ))}
                </div>
              </label>
              <label className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-sm text-slate-400">Nom équipe A</span>
                <input value={duelConfig.teamAName} onChange={(event) => setDuelConfig((prev) => ({ ...prev, teamAName: event.target.value }))} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none" />
              </label>
              <label className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-sm text-slate-400">Nom équipe B</span>
                <input value={duelConfig.teamBName} onChange={(event) => setDuelConfig((prev) => ({ ...prev, teamBName: event.target.value }))} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none" />
              </label>
              <label className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-sm text-slate-400">Catégorie</span>
                <select value={duelConfig.category} onChange={(event) => setDuelConfig((prev) => ({ ...prev, category: event.target.value as Category }))} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none">
                  {categories.map((category) => <option key={category} value={category}>{category}</option>)}
                </select>
              </label>
              <label className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-sm text-slate-400">Niveau</span>
                <select value={duelConfig.difficulty} onChange={(event) => setDuelConfig((prev) => ({ ...prev, difficulty: event.target.value as Difficulty }))} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none">
                  {difficulties.map((difficulty) => <option key={difficulty} value={difficulty}>{difficulty}</option>)}
                </select>
              </label>
              <label className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-sm text-slate-400">Phase du tournoi</span>
                <select value={duelConfig.phase} onChange={(event) => setDuelConfig((prev) => ({ ...prev, phase: event.target.value as DuelPhase }))} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none">
                  {phases.map((phase) => <option key={phase} value={phase}>{phase}</option>)}
                </select>
              </label>
              <label className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-sm text-slate-400">Nombre de questions</span>
                <input type="number" min="3" max="10" value={duelConfig.questionsCount} onChange={(event) => setDuelConfig((prev) => ({ ...prev, questionsCount: Number(event.target.value) }))} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none" />
              </label>
            </div>
            <button type="button" className="mt-6 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 px-5 py-3 font-semibold text-white" onClick={createDuel}>Créer la partie</button>
          </motion.section>
        )}

        {screen === 'join' && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-[0_0_90px_rgba(2,6,23,0.35)] backdrop-blur-xl sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <button className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200" type="button" onClick={goHome}><ArrowLeft className="mr-2 inline h-4 w-4" />Retour</button>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-amber-300">Rejoindre une partie</p>
                <h2 className="text-2xl font-semibold">Accède à ton équipe</h2>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <label className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-sm text-slate-400">Pseudo</span>
                <input value={playerName} onChange={(event) => setPlayerName(event.target.value)} className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none" />
              </label>
              <label className="rounded-2xl border border-white/10 bg-white/5 p-4">
                <span className="text-sm text-slate-400">Avatar</span>
                <div className="mt-3 flex flex-wrap gap-2">
                  {avatars.map((item) => (
                    <button key={item} type="button" className={`rounded-full border px-3 py-2 text-lg ${avatar === item ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200' : 'border-white/10 bg-slate-950/70 text-slate-200'}`} onClick={() => setAvatar(item)}>{item}</button>
                  ))}
                </div>
              </label>
              <label className="rounded-2xl border border-white/10 bg-white/5 p-4 md:col-span-2">
                <span className="text-sm text-slate-400">Code d’équipe</span>
                <input value={joinCode} onChange={(event) => setJoinCode(event.target.value.toUpperCase())} placeholder="TEAM-A-4582" className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-white outline-none" />
              </label>
            </div>
            <button type="button" className="mt-6 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 px-5 py-3 font-semibold text-white" onClick={joinDuel}>Entrer dans l’arène</button>
          </motion.section>
        )}

        {screen === 'waiting' && createdGame && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-[0_0_90px_rgba(2,6,23,0.35)] backdrop-blur-xl sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <button className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200" type="button" onClick={goHome}><ArrowLeft className="mr-2 inline h-4 w-4" />Retour</button>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Salle d’attente</p>
                <h2 className="text-2xl font-semibold">{createdGame.teamAName} vs {createdGame.teamBName}</h2>
              </div>
            </div>
            <div className="mt-8 grid gap-4 lg:grid-cols-[1fr_180px_1fr] lg:items-center">
              <div className="rounded-[28px] border border-cyan-400/20 bg-cyan-400/10 p-5">
                <div className="flex items-center gap-2 text-cyan-200"><Users className="h-4 w-4" />{createdGame.teamAName}</div>
                <div className="mt-4 flex flex-col gap-2">
                  {createdGame.teamARoster.map((player, index) => <div key={`${player.name}-${index}`} className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm">🟢 {player.avatar} {player.name}</div>)}
                </div>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-gradient-to-br from-cyan-500/20 to-rose-500/20 p-5 text-center">
                <div className="text-4xl font-semibold text-white">VS</div>
                <p className="mt-2 text-sm text-slate-300">Lobby prêt • {createdGame.phase}</p>
                <button type="button" className="mt-4 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 font-semibold text-white" onClick={startDuelQuiz}>Lancer la partie</button>
              </div>
              <div className="rounded-[28px] border border-rose-400/20 bg-rose-400/10 p-5">
                <div className="flex items-center gap-2 text-rose-200"><Users className="h-4 w-4" />{createdGame.teamBName}</div>
                <div className="mt-4 flex flex-col gap-2">
                  {createdGame.teamBRoster.map((player, index) => <div key={`${player.name}-${index}`} className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm">🟢 {player.avatar} {player.name}</div>)}
                </div>
              </div>
            </div>
            <div className="mt-6 grid gap-4 md:grid-cols-2">
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Code équipe A</p>
                <div className="mt-2 flex items-center justify-between rounded-2xl border border-cyan-400/20 bg-cyan-400/10 px-4 py-3 text-lg font-semibold text-cyan-100">{createdGame.codeA}<button type="button" onClick={() => navigator.clipboard.writeText(createdGame.codeA)} className="rounded-full border border-cyan-400/20 bg-slate-950/70 p-2"><Copy className="h-4 w-4" /></button></div>
              </div>
              <div className="rounded-[24px] border border-white/10 bg-white/5 p-4">
                <p className="text-sm text-slate-400">Code équipe B</p>
                <div className="mt-2 flex items-center justify-between rounded-2xl border border-rose-400/20 bg-rose-400/10 px-4 py-3 text-lg font-semibold text-rose-100">{createdGame.codeB}<button type="button" onClick={() => navigator.clipboard.writeText(createdGame.codeB)} className="rounded-full border border-rose-400/20 bg-slate-950/70 p-2"><Copy className="h-4 w-4" /></button></div>
              </div>
            </div>
          </motion.section>
        )}

        {screen === 'quiz' && currentQuestion && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[32px] border border-white/10 bg-slate-900/70 p-5 shadow-[0_0_90px_rgba(2,6,23,0.35)] backdrop-blur-xl sm:p-8">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-cyan-300">Question {questionIndex + 1}/{questions.length}</p>
                <h2 className="mt-2 text-2xl font-semibold sm:text-3xl">{currentQuestion.question}</h2>
              </div>
              <div className={`rounded-[24px] border border-white/10 bg-slate-950/70 p-4 ${timerClass}`}>
                <div className={`mx-auto flex h-20 w-20 items-center justify-center rounded-full bg-gradient-to-br ${timerRing}`}>
                  <div className="rounded-full bg-slate-950/90 px-4 py-3 text-center">
                    <Clock3 className="mx-auto h-5 w-5" />
                    <div className="text-2xl font-semibold">{timeLeft}s</div>
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-6 h-2 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-gradient-to-r from-cyan-500 via-blue-500 to-violet-500 transition-all" style={{ width: `${progress}%` }} />
            </div>

            {gameMode === 'duel' ? (
              <div className="mt-6 grid gap-4 xl:grid-cols-[1fr_1.15fr_1fr]">
                <div className="rounded-[24px] border border-cyan-400/20 bg-cyan-400/10 p-4">
                  <div className="flex items-center gap-2 text-cyan-200"><ShieldCheck className="h-4 w-4" />{createdGame?.teamAName ?? 'Équipe A'}</div>
                  <div className="mt-3 text-sm text-slate-300">Score : {teamAScore}</div>
                  <div className="mt-2 text-sm text-slate-300">Représentant : {joinedTeam === 'A' ? (captainName ?? playerName) : 'En attente'}</div>
                  <div className="mt-4 flex flex-col gap-2">
                    {teamMembersA.map((player, index) => <div key={`${player.name}-${index}`} className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm">🟢 {player.avatar} {player.name}</div>)}
                  </div>
                  <div className="mt-4 rounded-[20px] border border-white/10 bg-slate-950/70 p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-cyan-200"><MessageCircle className="h-4 w-4" />Chat équipe A</div>
                    <div className="mt-2 min-h-[90px] space-y-2 rounded-2xl border border-white/10 bg-white/5 p-2 text-sm">
                      {teamAChat.length === 0 ? <p className="text-slate-400">Canal privé réservé à l’équipe.</p> : teamAChat.map((chat) => <p key={chat.id} className="text-slate-200"><span className="font-semibold text-cyan-200">{chat.author}</span> : {chat.text}</p>)}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <input value={teamAInput} onChange={(event) => setTeamAInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); sendTeamChat('A') } }} placeholder="Plan de réponse" className="flex-1 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none" />
                      <button type="button" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" onClick={() => sendTeamChat('A')}>Envoyer</button>
                    </div>
                  </div>
                </div>

                <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4">
                  <div className="flex items-center justify-between text-sm text-slate-300">
                    <span className="rounded-full border border-cyan-400/20 bg-cyan-500/10 px-3 py-1 text-cyan-200">{reboundMode ? `Rebond • ${answeringTeamName}` : `Tour • ${answeringTeamName}`}</span>
                    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1">Phase : {duelPhase}</span>
                  </div>
                  <div className="mt-4 grid gap-3 sm:grid-cols-2">
                    {(Object.keys(currentQuestion.options) as AnswerKey[]).map((option) => (
                      <motion.button
                        whileHover={{ scale: 1.02 }}
                        whileTap={{ scale: 0.98 }}
                        key={option}
                        type="button"
                        className={`rounded-[22px] border p-4 text-left transition ${selectedAnswer === option ? 'border-cyan-400 bg-cyan-500/15 shadow-[0_0_30px_rgba(34,211,238,0.18)]' : 'border-white/10 bg-slate-900/70'}`}
                        onClick={() => handleDuelAnswer(option)}
                        disabled={answerLocked}
                      >
                        <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Option {option}</div>
                        <div className="mt-2 text-lg font-semibold">{currentQuestion.options[option]}</div>
                      </motion.button>
                    ))}
                  </div>
                  <div className="mt-4 rounded-[20px] border border-white/10 bg-white/5 p-3 text-sm text-slate-300">
                    {feedbackMessage || 'Le premier joueur à valider devient le représentant de l’équipe pour cette question.'}
                  </div>
                  <div className="mt-4 flex flex-wrap gap-2">
                    {(Object.keys(currentQuestion.options) as AnswerKey[]).map((option) => (
                      <button key={option} type="button" className={`rounded-full border px-3 py-2 text-sm ${teamDraftAnswers.A === option ? 'border-cyan-400 bg-cyan-500/15 text-cyan-200' : 'border-white/10 bg-white/5'}`} onClick={() => setTeamDraftAnswers((prev) => ({ ...prev, A: option }))}>Préparer A: {option}</button>
                    ))}
                  </div>
                </div>

                <div className="rounded-[24px] border border-rose-400/20 bg-rose-400/10 p-4">
                  <div className="flex items-center gap-2 text-rose-200"><ShieldCheck className="h-4 w-4" />{createdGame?.teamBName ?? 'Équipe B'}</div>
                  <div className="mt-3 text-sm text-slate-300">Score : {teamBScore}</div>
                  <div className="mt-2 text-sm text-slate-300">Représentant : {joinedTeam === 'B' ? (captainName ?? playerName) : 'En attente'}</div>
                  <div className="mt-4 flex flex-col gap-2">
                    {teamMembersB.map((player, index) => <div key={`${player.name}-${index}`} className="rounded-2xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm">🟢 {player.avatar} {player.name}</div>)}
                  </div>
                  <div className="mt-4 rounded-[20px] border border-white/10 bg-slate-950/70 p-3">
                    <div className="flex items-center gap-2 text-sm font-semibold text-rose-200"><MessageCircle className="h-4 w-4" />Chat équipe B</div>
                    <div className="mt-2 min-h-[90px] space-y-2 rounded-2xl border border-white/10 bg-white/5 p-2 text-sm">
                      {teamBChat.length === 0 ? <p className="text-slate-400">Canal privé réservé à l’équipe.</p> : teamBChat.map((chat) => <p key={chat.id} className="text-slate-200"><span className="font-semibold text-rose-200">{chat.author}</span> : {chat.text}</p>)}
                    </div>
                    <div className="mt-3 flex gap-2">
                      <input value={teamBInput} onChange={(event) => setTeamBInput(event.target.value)} onKeyDown={(event) => { if (event.key === 'Enter') { event.preventDefault(); sendTeamChat('B') } }} placeholder="Plan de réponse" className="flex-1 rounded-xl border border-white/10 bg-slate-950/70 px-3 py-2 text-sm text-white outline-none" />
                      <button type="button" className="rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-sm" onClick={() => sendTeamChat('B')}>Envoyer</button>
                    </div>
                  </div>
                </div>
              </div>
            ) : (
              <div className="mt-6 grid gap-4 lg:grid-cols-[220px_1fr]">
                <div className="rounded-[24px] border border-white/10 bg-slate-950/70 p-4">
                  <div className="flex items-center gap-2 text-cyan-200"><Crown className="h-4 w-4" />Représentant actuel</div>
                  <div className="mt-3 text-2xl font-semibold">{captainName ?? 'Solo'}</div>
                  <p className="mt-2 text-sm text-slate-400">Vous êtes le seul représentant.</p>
                </div>
                <div className="grid gap-3 sm:grid-cols-2">
                  {(Object.keys(currentQuestion.options) as AnswerKey[]).map((option) => (
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.98 }}
                      key={option}
                      type="button"
                      className={`rounded-[22px] border p-4 text-left transition ${selectedAnswer === option ? 'border-cyan-400 bg-cyan-500/15 shadow-[0_0_30px_rgba(34,211,238,0.18)]' : 'border-white/10 bg-slate-900/70'}`}
                      onClick={() => handleSoloAnswer(option)}
                      disabled={answerLocked}
                    >
                      <div className="text-xs uppercase tracking-[0.3em] text-slate-400">Option {option}</div>
                      <div className="mt-2 text-lg font-semibold">{currentQuestion.options[option]}</div>
                    </motion.button>
                  ))}
                </div>
              </div>
            )}

            {showResultOverlay && duelRoundSummary && gameMode === 'duel' && (
              <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} className="mt-6 rounded-[28px] border border-white/10 bg-slate-950/70 p-5">
                <div className="flex items-center gap-2 text-cyan-300"><Trophy className="h-5 w-5" /> Résultat intermédiaire</div>
                <div className="mt-4 grid gap-4 md:grid-cols-2">
                  <div className="rounded-[20px] border border-cyan-400/20 bg-cyan-400/10 p-4">
                    <h3 className="font-semibold">{createdGame?.teamAName ?? 'Équipe A'}</h3>
                    <p className="mt-1 text-sm text-slate-300">Réponse : {duelRoundSummary.teamAResponse ?? '—'}</p>
                    <p className="mt-1 text-sm text-slate-300">Résultat : {duelRoundSummary.teamAResult === 'correct' ? '✅ Bonne réponse' : duelRoundSummary.teamAResult === 'incorrect' ? '❌ Incorrect' : '⏳ En attente'}</p>
                    <p className="mt-1 text-sm text-slate-300">Points : {duelRoundSummary.teamAPoints}</p>
                  </div>
                  <div className="rounded-[20px] border border-rose-400/20 bg-rose-400/10 p-4">
                    <h3 className="font-semibold">{createdGame?.teamBName ?? 'Équipe B'}</h3>
                    <p className="mt-1 text-sm text-slate-300">Réponse : {duelRoundSummary.teamBResponse ?? '—'}</p>
                    <p className="mt-1 text-sm text-slate-300">Résultat : {duelRoundSummary.teamBResult === 'correct' ? '✅ Bonne récupération' : duelRoundSummary.teamBResult === 'incorrect' ? '❌ Incorrect' : '⏳ En attente'}</p>
                    <p className="mt-1 text-sm text-slate-300">Points : {duelRoundSummary.teamBPoints}</p>
                  </div>
                </div>
                <p className="mt-4 text-sm text-slate-300">{currentQuestion.explanation}</p>
                <button className="mt-4 rounded-full bg-gradient-to-r from-cyan-500 to-violet-500 px-4 py-2 font-semibold text-white" type="button" onClick={nextQuestion}>Question suivante</button>
              </motion.div>
            )}
          </motion.section>
        )}

        {screen === 'results' && (
          <motion.section initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="rounded-[32px] border border-white/10 bg-slate-900/70 p-6 shadow-[0_0_90px_rgba(2,6,23,0.35)] backdrop-blur-xl sm:p-8">
            <div className="flex items-center justify-between gap-3">
              <button className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-sm text-slate-200" type="button" onClick={goHome}><ArrowLeft className="mr-2 inline h-4 w-4" />Retour</button>
              <div>
                <p className="text-xs uppercase tracking-[0.3em] text-amber-300">Résultats</p>
                <h2 className="text-2xl font-semibold">Fin de la manche</h2>
              </div>
            </div>
            <div className="mt-8 grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
              <div className="rounded-[28px] border border-emerald-400/20 bg-emerald-400/10 p-6">
                <div className="flex items-center gap-2 text-emerald-200"><Trophy className="h-5 w-5" /> Équipe gagnante</div>
                <div className="mt-4 text-4xl font-semibold text-white">{gameMode === 'solo' ? 'Bravo !' : teamAScore === teamBScore ? 'Égalité' : teamAScore > teamBScore ? createdGame?.teamAName ?? 'Équipe A' : createdGame?.teamBName ?? 'Équipe B'}</div>
                <div className="mt-4 text-lg text-slate-200">{gameMode === 'solo' ? `Score final : ${soloScore}` : `${teamAScore} - ${teamBScore}`}</div>
                <div className="mt-6 flex flex-wrap gap-3">
                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm">Questions : {questions.length}</div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm">Réussite : {successRate}%</div>
                  <div className="rounded-2xl border border-white/10 bg-slate-950/70 px-4 py-3 text-sm">Meilleure série : {correctCount}</div>
                </div>
              </div>
              <div className="rounded-[28px] border border-white/10 bg-slate-950/70 p-6">
                <div className="text-sm uppercase tracking-[0.3em] text-slate-400">Statistiques</div>
                <ul className="mt-4 space-y-2 text-slate-300">
                  <li className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2"><span>Bonnes réponses</span><strong>{correctCount}</strong></li>
                  <li className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2"><span>Mauvaises réponses</span><strong>{wrongCount}</strong></li>
                  <li className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-3 py-2"><span>Session</span><strong>{sessionId}</strong></li>
                </ul>
              </div>
            </div>
            <div className="mt-6 rounded-[28px] border border-white/10 bg-slate-950/70 p-6">
              <div className="flex items-center gap-2 text-cyan-300"><MonitorPlay className="h-5 w-5" /> Historique</div>
              <div className="mt-4 grid gap-3 md:grid-cols-2">
                {answers.map((answer) => (
                  <div key={`${answer.questionId}-${answer.roundLabel}`} className="rounded-2xl border border-white/10 bg-white/5 p-3 text-sm text-slate-200">
                    {answer.roundLabel} • {answer.isCorrect ? '✅' : '❌'} • {answer.points > 0 ? `+${answer.points}` : answer.points}
                  </div>
                ))}
              </div>
            </div>
          </motion.section>
        )}
      </div>
    </div>
  )
}

export default QuizArenaApp
