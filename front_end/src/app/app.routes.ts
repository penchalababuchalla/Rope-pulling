import { Routes } from '@angular/router';
import { StartGameComponent } from './start-game/start-game.component';

export const routes: Routes = [
  { path: '', component: StartGameComponent },
  { path: 'game', component: StartGameComponent }
];
