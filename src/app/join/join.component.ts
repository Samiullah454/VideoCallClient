import { Component, OnInit, Inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { isPlatformBrowser, NgFor, NgIf } from '@angular/common';
import { PLATFORM_ID } from '@angular/core';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
@Component({
  selector: 'app-join',
  standalone: true,
  templateUrl: './join.component.html',
   imports: [NgIf,NgFor, MatProgressSpinnerModule 
    
  ],
  styleUrl: './join.component.scss'
})
export class JoinComponent implements OnInit {
  showLoader = true;
  error!: string;
  roomId!: string;

  constructor(
    @Inject(PLATFORM_ID) private platformId: Object,
    private route: ActivatedRoute,
    private http: HttpClient,
    private router: Router
  ) {}

  ngOnInit() {
    if (!isPlatformBrowser(this.platformId)) {
      console.log('[JoinComponent] Not running in browser, skipping execution.');
      return;
    }

    const roomId = this.route.snapshot.paramMap.get('roomId');
    const token = this.route.snapshot.queryParamMap.get('token');

    console.log('[JoinComponent] URL Params -> roomId:', roomId, ', token:', token);

    if (!roomId || !token) {
      this.error = 'Invalid link. Missing room ID or token.';
      this.showLoader = false;
      return;
    }

   this.http.get<any>(`${environment.apiUrl}/api/call/validate-join?roomId=${roomId}&token=${token}`, {
    headers: new HttpHeaders({
      'ngrok-skip-browser-warning': 'true'
    }),
    responseType: 'json' as const
  }).subscribe({
    next: res => {
      this.roomId = res.roomId;
      this.router.navigate(['/call', this.roomId]);
    },
    error: err => {
      console.error('[JoinComponent] Validation error:', err);
      this.error = 'Invalid or expired link.';
      this.showLoader = false;
    }
  });
  }
}
