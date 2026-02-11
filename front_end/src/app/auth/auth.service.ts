import { Injectable, signal, computed } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly STORAGE_KEY = 'tug-game-user';
  private usernameSignal = signal<string | null>(this.loadStored());

  readonly isLoggedIn = computed(() => this.usernameSignal() !== null);
  readonly username = computed(() => this.usernameSignal());

  private loadStored(): string | null {
    if (typeof localStorage === 'undefined') return null;
    const stored = localStorage.getItem(this.STORAGE_KEY);
    return stored || null;
  }

  login(username: string): void {
    const trimmed = username?.trim() || '';
    if (trimmed) {
      this.usernameSignal.set(trimmed);
      try {
        localStorage.setItem(this.STORAGE_KEY, trimmed);
      } catch {
        // ignore
      }
    }
  }

  logout(): void {
    this.usernameSignal.set(null);
    try {
      localStorage.removeItem(this.STORAGE_KEY);
    } catch {
      // ignore
    }
  }
}
