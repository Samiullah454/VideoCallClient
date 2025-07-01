import { HttpClient } from '@angular/common/http';
import { Component } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { environment } from '../../../environments/environment';
import { NgFor, NgIf } from '@angular/common';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';

@Component({
  selector: 'app-join',
  standalone: true,
  imports: [NgIf,NgFor, MatProgressSpinnerModule 
    
  ],
  templateUrl: './join.component.html',
  styleUrl: './join.component.scss'
})
export class JoinComponent {
showLoader = true;
  error!: string;
  roomId!: string;

  constructor(private route: ActivatedRoute, private http: HttpClient, private router: Router) {}

  ngOnInit() {
    const roomId = this.route.snapshot.paramMap.get('roomId');
    const token = this.route.snapshot.queryParamMap.get('token');
    this.http.get<any>(`${environment.apiUrl}/call/validate-join?roomId=${roomId}&token=${token}`)
      .subscribe({
        next: res => {
          this.roomId = res.roomId;
          this.router.navigate(['/call', this.roomId]);
        },
        error: _ => {
          this.error = 'Invalid or expired link.';
          this.showLoader = false;
        }
      });
  }

}
