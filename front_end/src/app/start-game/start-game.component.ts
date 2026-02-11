import { Component, OnDestroy, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { AuthService } from '../auth/auth.service';

type ProblemType = 'multiply' | 'divide' | 'add' | 'subtract' | 'both' | 'all';

interface MathProblem {
  text: string;
  answer: number;
  type: 'multiply' | 'divide' | 'add' | 'subtract';
}

@Component({
  selector: 'app-start-game',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './start-game.component.html',
  styleUrl: './start-game.component.css'
})
export class StartGameComponent implements OnDestroy {
  readonly ROPE_STEP = 10;
  readonly MIN_POSITION = 0;
  readonly MAX_POSITION = 100;
  readonly OPPONENT_MIN_DELAY_MS = 2500;
  readonly OPPONENT_MAX_DELAY_MS = 5500;

  gameStarted = signal(false);
  gameOver = signal(false);
  youWon = signal(false);
  ropePosition = signal(50);
  selectedNumbers = signal<number[]>([2, 3, 4, 5]);
  problemType = signal<ProblemType>('multiply');
  /** 'computer' = you vs CPU; 'friend' = play with friends online (host or join) */
  playMode = signal<'computer' | 'friend'>('computer');
  /** When playMode is 'friend': 'none' | 'host' | 'join' */
  friendRole = signal<'none' | 'host' | 'join'>('none');
  /** Room code when hosting (for sharing; ready for Socket.io) */
  roomCode = signal<string>('');
  /** Join code input when joining (ready for Socket.io) */
  joinCodeInput = '';
  /** Copy feedback */
  copySuccess = signal(false);
  /** Placeholder: when we have Socket.io, host waits for players; join connects with code */
  onlineStatus = signal<'idle' | 'waiting' | 'joined'>('idle');

  currentProblem = signal<MathProblem | null>(null);
  playerAnswer = '';
  showWrong = signal(false);
  opponentProblem = signal<MathProblem | null>(null);
  opponentThinking = signal(false);
  friendAnswer = '';
  showFriendWrong = signal(false);
  /** briefly true when rope position changes for pull animation */
  ropeJustMoved = signal(false);
  /** Elapsed seconds since game start */
  elapsedSeconds = signal(0);
  /** Team 1 (left) score – correct answers */
  team1Score = signal(0);
  /** Team 2 (right) score – correct answers */
  team2Score = signal(0);

  private opponentTimer: ReturnType<typeof setTimeout> | null = null;
  private gameTimer: ReturnType<typeof setInterval> | null = null;
  private gameStartTime = 0;
  readonly numberOptions = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12];

  constructor(
    public auth: AuthService,
    private router: Router
  ) {}

  ropePositionPercent = computed(() => `${this.ropePosition()}%`);
  /** Background image translate: 0 = center, -50 = fully left (left wins), +50 = fully right (right wins). Vertical line stays fixed. */
  tugImageTranslatePercent = computed(() => this.ropePosition() - 50);
  /** Formatted timer string MM:SS */
  timerDisplay = computed(() => {
    const s = this.elapsedSeconds();
    const m = Math.floor(s / 60);
    const sec = s % 60;
    return `${m.toString().padStart(2, '0')}:${sec.toString().padStart(2, '0')}`;
  });

  toggleNumber(n: number): void {
    const current = this.selectedNumbers();
    const next = current.includes(n)
      ? current.filter((x) => x !== n)
      : [...current, n].sort((a, b) => a - b);
    if (next.length > 0) this.selectedNumbers.set(next);
  }

  setProblemType(type: ProblemType): void {
    this.problemType.set(type);
  }

  setPlayMode(mode: 'computer' | 'friend'): void {
    this.playMode.set(mode);
    if (mode === 'computer') {
      this.friendRole.set('none');
      this.roomCode.set('');
      this.onlineStatus.set('idle');
    } else {
      this.friendRole.set('none');
      this.roomCode.set('');
      this.joinCodeInput = '';
      this.onlineStatus.set('idle');
    }
  }

  setFriendRole(role: 'host' | 'join'): void {
    this.friendRole.set(role);
    this.copySuccess.set(false);
    if (role === 'host') {
      this.roomCode.set(this.generateRoomCode());
      this.onlineStatus.set('waiting');
    } else {
      this.roomCode.set('');
      this.joinCodeInput = '';
      this.onlineStatus.set('idle');
    }
  }

  /** Generate a 6-character alphanumeric room code (Socket.io-ready) */
  generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  async copyRoomCodeToClipboard(): Promise<void> {
    const code = this.roomCode();
    if (!code) return;
    try {
      await navigator.clipboard.writeText(code);
      this.copySuccess.set(true);
      setTimeout(() => this.copySuccess.set(false), 2500);
    } catch {
      this.copySuccess.set(false);
    }
  }

  joinWithCode(): void {
    const code = this.joinCodeInput.trim().toUpperCase();
    if (!code) return;
    // Placeholder: Socket.io will connect and join room with this code
    this.onlineStatus.set('joined');
  }

  backFromFriendRole(): void {
    this.friendRole.set('none');
    this.roomCode.set('');
    this.joinCodeInput = '';
    this.onlineStatus.set('idle');
  }

  logout(): void {
    this.auth.logout();
    this.router.navigate(['/login']);
  }

  startGame(): void {
    this.gameStarted.set(true);
    this.gameOver.set(false);
    this.youWon.set(false);
    this.ropePosition.set(50);
    this.team1Score.set(0);
    this.team2Score.set(0);
    this.playerAnswer = '';
    this.friendAnswer = '';
    this.showWrong.set(false);
    this.showFriendWrong.set(false);
    this.elapsedSeconds.set(0);
    this.gameStartTime = Date.now();
    this.startGameTimer();
    this.nextPlayerProblem();
    if (this.playMode() === 'computer') {
      this.scheduleOpponentTurn();
    } else {
      this.opponentThinking.set(false);
      this.opponentProblem.set(this.generateProblem());
    }
  }

  private startGameTimer(): void {
    this.stopGameTimer();
    this.gameTimer = setInterval(() => {
      if (this.gameOver()) return;
      const elapsed = Math.floor((Date.now() - this.gameStartTime) / 1000);
      this.elapsedSeconds.set(elapsed);
    }, 1000);
  }

  private stopGameTimer(): void {
    if (this.gameTimer) {
      clearInterval(this.gameTimer);
      this.gameTimer = null;
    }
  }

  private nextPlayerProblem(): void {
    const problem = this.generateProblem();
    this.currentProblem.set(problem);
    this.playerAnswer = '';
    this.showWrong.set(false);
  }

  private generateProblem(): MathProblem {
    const numbers = this.selectedNumbers();
    const type = this.pickOperation();
    const a = numbers[Math.floor(Math.random() * numbers.length)];
    const b = numbers[Math.floor(Math.random() * numbers.length)];
    switch (type) {
      case 'multiply':
        return { text: `${a} × ${b} = ?`, answer: a * b, type: 'multiply' };
      case 'divide': {
        const product = a * b;
        return { text: `${product} ÷ ${a} = ?`, answer: b, type: 'divide' };
      }
      case 'add':
        return { text: `${a} + ${b} = ?`, answer: a + b, type: 'add' };
      case 'subtract': {
        const big = Math.max(a, b);
        const small = Math.min(a, b);
        return { text: `${big} − ${small} = ?`, answer: big - small, type: 'subtract' };
      }
      default:
        return { text: `${a} × ${b} = ?`, answer: a * b, type: 'multiply' };
    }
  }

  private pickOperation(): MathProblem['type'] {
    const problemType = this.problemType();
    if (problemType === 'multiply') return 'multiply';
    if (problemType === 'divide') return 'divide';
    if (problemType === 'add') return 'add';
    if (problemType === 'subtract') return 'subtract';
    if (problemType === 'both') return Math.random() > 0.5 ? 'multiply' : 'divide';
    const r = Math.random();
    if (r < 0.25) return 'multiply';
    if (r < 0.5) return 'divide';
    if (r < 0.75) return 'add';
    return 'subtract';
  }

  submitAnswer(): void {
    if (this.gameOver()) return;
    const problem = this.currentProblem();
    if (!problem) return;
    const num = parseInt(this.playerAnswer, 10);
    if (Number.isNaN(num)) {
      this.showWrong.set(true);
      return;
    }
    if (num !== problem.answer) {
      this.showWrong.set(true);
      return;
    }
    this.showWrong.set(false);
    this.team1Score.update((s) => s + 1);
    this.triggerRopeAnimation();
    const next = Math.max(this.MIN_POSITION, this.ropePosition() - this.ROPE_STEP);
    this.ropePosition.set(next);
    if (next <= this.MIN_POSITION) {
      this.endGame(true);
      return;
    }
    this.nextPlayerProblem();
  }

  submitFriendAnswer(): void {
    if (this.gameOver() || this.playMode() !== 'friend') return;
    const problem = this.opponentProblem();
    if (!problem) return;
    const num = parseInt(this.friendAnswer, 10);
    if (Number.isNaN(num)) {
      this.showFriendWrong.set(true);
      return;
    }
    if (num !== problem.answer) {
      this.showFriendWrong.set(true);
      return;
    }
    this.showFriendWrong.set(false);
    this.team2Score.update((s) => s + 1);
    this.triggerRopeAnimation();
    const next = Math.min(this.MAX_POSITION, this.ropePosition() + this.ROPE_STEP);
    this.ropePosition.set(next);
    if (next >= this.MAX_POSITION) {
      this.endGame(false);
      return;
    }
    this.nextOpponentProblem();
  }

  private nextOpponentProblem(): void {
    this.opponentProblem.set(this.generateProblem());
    this.friendAnswer = '';
    this.showFriendWrong.set(false);
  }

  /** Virtual keypad: append digit for left (you) or right (friend) */
  keypadDigit(side: 'left' | 'right', digit: number): void {
    if (this.gameOver()) return;
    const maxLen = 4;
    if (side === 'left') {
      if (this.playerAnswer.length < maxLen) this.playerAnswer += String(digit);
    } else {
      if (this.friendAnswer.length < maxLen) this.friendAnswer += String(digit);
    }
  }

  keypadBackspace(side: 'left' | 'right'): void {
    if (side === 'left') {
      this.playerAnswer = this.playerAnswer.slice(0, -1);
    } else {
      this.friendAnswer = this.friendAnswer.slice(0, -1);
    }
  }

  keypadClear(side: 'left' | 'right'): void {
    if (side === 'left') this.playerAnswer = '';
    else this.friendAnswer = '';
  }

  private scheduleOpponentTurn(): void {
    if (this.gameOver()) return;
    this.opponentThinking.set(true);
    const delay =
      this.OPPONENT_MIN_DELAY_MS +
      Math.random() * (this.OPPONENT_MAX_DELAY_MS - this.OPPONENT_MIN_DELAY_MS);
    this.opponentProblem.set(this.generateProblem());
    this.opponentTimer = setTimeout(() => this.opponentSolves(), delay);
  }

  private opponentSolves(): void {
    if (this.gameOver()) return;
    this.opponentThinking.set(false);
    this.team2Score.update((s) => s + 1);
    this.triggerRopeAnimation();
    const next = Math.min(this.MAX_POSITION, this.ropePosition() + this.ROPE_STEP);
    this.ropePosition.set(next);
    if (next >= this.MAX_POSITION) {
      this.endGame(false);
      return;
    }
    this.scheduleOpponentTurn();
  }

  private triggerRopeAnimation(): void {
    this.ropeJustMoved.set(true);
    setTimeout(() => this.ropeJustMoved.set(false), 500);
  }

  private endGame(youWon: boolean): void {
    this.stopGameTimer();
    if (this.opponentTimer) {
      clearTimeout(this.opponentTimer);
      this.opponentTimer = null;
    }
    this.gameOver.set(true);
    this.youWon.set(youWon);
  }

  ngOnDestroy(): void {
    this.stopGameTimer();
    if (this.opponentTimer) {
      clearTimeout(this.opponentTimer);
    }
  }
}
