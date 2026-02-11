import { Routes } from '@angular/router';
import { LoginComponent } from './login/login.component';
import { StartGameComponent } from './start-game/start-game.component';
import { authGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: '', redirectTo: 'login', pathMatch: 'full' },
  { path: 'login', component: LoginComponent },
  { path: 'setup', component: StartGameComponent, canActivate: [authGuard] },
  { path: 'game', component: StartGameComponent, canActivate: [authGuard] }
];
