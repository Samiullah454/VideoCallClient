import { Component, ElementRef, ViewChild } from '@angular/core';
import { ActivatedRoute } from '@angular/router';

import { NgIf, NgFor, CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { SignalrService } from '../../services/signalr.service';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatToolbarModule } from '@angular/material/toolbar';

@Component({
  selector: 'app-call',
  standalone: true,
  templateUrl: './call.component.html',
  styleUrls: ['./call.component.scss'],
  imports: [NgIf, NgFor,CommonModule, FormsModule,
     MatFormFieldModule,
    MatInputModule,
    MatIconModule,
    MatButtonModule,
    MatCardModule,
    MatToolbarModule,
  
  ],
})
export class CallComponent {
  @ViewChild('localVideo') localVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('remoteVideo') remoteVideo!: ElementRef<HTMLVideoElement>;
  @ViewChild('chatArea') chatArea!: ElementRef;

  localStream!: MediaStream;
  peerConnection!: RTCPeerConnection;
  config = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };

  roomId!: string;
  username: string = '';
  chatMessage: string = '';
  joined = false;

  chatHistory: { sender: string, message: string }[] = [];

  constructor(
    private signalService: SignalrService,
    private route: ActivatedRoute
  ) {}

  joinCall() {
    if (!this.username.trim()) return;
    this.joined = true;
    this.initializeConnection();
  }

  async initializeConnection() {
    this.roomId = this.route.snapshot.paramMap.get('roomId')!;
    this.signalService.buildConnection();

    this.signalService.incomingOffer.subscribe((o: string) => this.handleOffer(o));
    this.signalService.incomingAnswer.subscribe((a: string) => this.handleAnswer(a));
    this.signalService.incomingCandidate.subscribe((c: string) => this.handleCandidate(c));

    this.signalService.incomingMessage.subscribe((raw: string) => {
      try {
        const parsed = JSON.parse(raw);
        this.chatHistory.push(parsed);
      } catch {
        this.chatHistory.push({ sender: 'Unknown', message: raw });
      }
      setTimeout(() => {
        this.chatArea.nativeElement.scrollTop = this.chatArea.nativeElement.scrollHeight;
      }, 0);
    });

    await this.signalService.startConnection();
    await this.signalService.joinRoom(this.roomId);

    this.localStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
    this.localVideo.nativeElement.srcObject = this.localStream;

    this.peerConnection = new RTCPeerConnection(this.config);
    this.localStream.getTracks().forEach(t => this.peerConnection.addTrack(t, this.localStream));

    this.peerConnection.onicecandidate = e => {
      if (e.candidate) {
        this.signalService.sendCandidate(this.roomId, JSON.stringify(e.candidate));
      }
    };

    this.peerConnection.ontrack = (event) => {
  const remoteStream = event.streams[0];

  // Only set if it's not already set
  if (this.remoteVideo.nativeElement.srcObject !== remoteStream) {
    this.remoteVideo.nativeElement.srcObject = remoteStream;
  }
};


    await this.makeOffer();
  }

  async makeOffer() {
    const offer = await this.peerConnection.createOffer();
    await this.peerConnection.setLocalDescription(offer);
    this.signalService.sendOffer(this.roomId, JSON.stringify(offer));
  }

  async handleOffer(offer: string) {
    await this.setupConnection();
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(offer)));
    const answer = await this.peerConnection.createAnswer();
    await this.peerConnection.setLocalDescription(answer);
    this.signalService.sendAnswer(this.roomId, JSON.stringify(answer));
  }

  async handleAnswer(answer: string) {
    await this.peerConnection.setRemoteDescription(new RTCSessionDescription(JSON.parse(answer)));
  }

  async handleCandidate(candidate: string) {
    await this.peerConnection.addIceCandidate(new RTCIceCandidate(JSON.parse(candidate)));
  }

  async setupConnection() {
    if (this.peerConnection) return;
    this.peerConnection = new RTCPeerConnection(this.config);
    this.localStream.getTracks().forEach(t => this.peerConnection.addTrack(t, this.localStream));

    this.peerConnection.onicecandidate = e => {
      if (e.candidate) {
        this.signalService.sendCandidate(this.roomId, JSON.stringify(e.candidate));
      }
    };

    this.peerConnection.ontrack = e => {
      this.remoteVideo.nativeElement.srcObject = e.streams[0];
    };
  }

sendChat() {
  const msg = this.chatMessage.trim();
  if (msg) {
    this.signalService.sendMessage(this.roomId, JSON.stringify({ sender: this.username, message: msg }));
    this.chatMessage = '';
    setTimeout(() => {
      this.chatArea.nativeElement.scrollTop = this.chatArea.nativeElement.scrollHeight;
    }, 0);
  }
}


  toggleAudio() {
    this.localStream.getAudioTracks().forEach(track => track.enabled = !track.enabled);
  }

  toggleVideo() {
    this.localStream.getVideoTracks().forEach(track => track.enabled = !track.enabled);
  }

  leaveCall() {
    this.peerConnection.close();
    this.localStream.getTracks().forEach(track => track.stop());
    this.signalService.stopConnection();
    this.joined = false;
    this.chatHistory = [];
  }
}
