import { Routes } from '@angular/router';
import { JoinComponent } from './join/join.component';
import { CallComponent } from './call/call.component';

export const routes: Routes = [
  { path: 'join/:roomId', component: JoinComponent },
  { path: 'call/:roomId', component: CallComponent },
  { path: '**', redirectTo: 'join' }
];
