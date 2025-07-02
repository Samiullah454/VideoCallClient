import { Injectable } from '@angular/core';
import * as signalR from '@microsoft/signalr';
import { environment } from '../../environments/environment';
import { Subject } from 'rxjs';

@Injectable({ providedIn: 'root' })
export class SignalrService {
  private hubConnection!: signalR.HubConnection;

  public incomingOffer = new Subject<string>();
  public incomingAnswer = new Subject<string>();
  public incomingCandidate = new Subject<string>();
  public incomingMessage = new Subject<string>();
  public connectionEstablished = new Subject<void>();

  /**
   * Initializes the connection with event handlers
   */
buildConnection(): void {
  if (this.hubConnection) return; // Prevent duplicate builds

  this.hubConnection = new signalR.HubConnectionBuilder()
    .withUrl(environment.signalrHubUrl, {
      withCredentials: true, // Required for CORS
      //transport: signalR.HttpTransportType.WebSockets, // Force WebSockets (recommended)
      headers: {
        'ngrok-skip-browser-warning': 'true' // Bypass ngrok browser interstitial
      }
    })
    .withAutomaticReconnect()
    .configureLogging(signalR.LogLevel.Information) // Optional: logs for debugging
    .build();

  this.registerHubEvents();
}

  /**
   * Starts the SignalR connection
   */
  async startConnection(): Promise<void> {
    if (!this.hubConnection) this.buildConnection();

    try {
      await this.hubConnection.start();
      console.log('SignalR connected');
      this.connectionEstablished.next();
    } catch (err) {
      console.error('SignalR connection failed:', err);
      setTimeout(() => this.startConnection(), 5000); // retry after delay
    }
  }

  /**
   * Registers the event listeners for WebRTC
   */
  private registerHubEvents(): void {
    this.hubConnection.on('ReceiveOffer', (offer: string) => {
      this.incomingOffer.next(offer);
    });

    this.hubConnection.on('ReceiveAnswer', (answer: string) => {
      this.incomingAnswer.next(answer);
    });

    this.hubConnection.on('ReceiveCandidate', (candidate: string) => {
      this.incomingCandidate.next(candidate);
    });

    this.hubConnection.on('ReceiveMessage', (message: string) => {
      this.incomingMessage.next(message);
    });
  }

  // Public API to interact with the Hub
  joinRoom(roomId: string): Promise<void> {
    return this.hubConnection.invoke('JoinRoom', roomId);
  }

  sendOffer(roomId: string, offer: string): Promise<void> {
    return this.hubConnection.invoke('SendOffer', roomId, offer);
  }

  sendAnswer(roomId: string, answer: string): Promise<void> {
    return this.hubConnection.invoke('SendAnswer', roomId, answer);
  }

  sendCandidate(roomId: string, candidate: string): Promise<void> {
    return this.hubConnection.invoke('SendCandidate', roomId, candidate);
  }

  sendMessage(roomId: string, message: string): Promise<void> {
    return this.hubConnection.invoke('SendMessage', roomId, message);
  }

  /**
   * Gracefully stop connection
   */
  stopConnection(): Promise<void> {
    if (this.hubConnection) {
      return this.hubConnection.stop();
    }
    return Promise.resolve();
  }
}
