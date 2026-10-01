import { Injectable } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject } from 'rxjs';
import { DirectMessage } from 'src/app/core/authcontroller/authInterface';
import { environment } from 'src/environments/environment';
import { HttpClient, HttpParams } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class ChatService {
  private socket!: Socket;
  private messageSubject = new Subject<DirectMessage>();

  constructor(
    private http: HttpClient
  ){}

  connectSocket(jwtToken: string): void {
    if(!this.socket || !this.socket.connected){
      // Point to your NestJS server address
      this.socket = io(environment.apiUrl,{
        auth:{
          token: jwtToken,
        },
        transports:['websocket']
      });

      this.socket.on('receive_message', (message: DirectMessage) => {
        this.messageSubject.next(message);
      });
    }
  }

  // --- WebSocket Actions ---

  joinRoom(roomId: string, userId: string){
    if (this.socket && roomId) {
      this.socket.emit('joinRoom', { roomId, userId });
    }
  }

  // Emit chat message to NestJS server
  sendMessage(payload: DirectMessage) {
    if (this.socket) {
      this.socket.emit('sendPrivateMessage', payload);
    }
  }

  // Listen for incoming messages from server
  getMessages(): Observable<DirectMessage> {
    return this.messageSubject.asObservable();
  }

  // --- HTTP REST APIs (from Controller) ---

  getRoomHistory(roomId: string): Observable<any> {
    return this.http.get<any>(`${environment.apiUrl}/direct-message/room/${roomId}`);
  }

  markMessagesAsRead(roomId: string, userId: string): Observable<any> {
    return this.http.patch(`${environment.apiUrl}/direct-message/room/${roomId}/read`, { userId });
  }
  
  getAllRooms(){
    return this.http.get<any>(`${environment.apiUrl}/direct-message/rooms`);
  }
  
  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
    }
  }
}