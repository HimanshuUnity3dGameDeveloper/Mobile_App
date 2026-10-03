import { Component, OnInit } from '@angular/core';
import { NavController } from '@ionic/angular';
import { PreviousRouteServe } from 'src/app/core/previous-route-serve';
import { AuthService } from 'src/app/core/authcontroller/auth-service';
import { ContentAuthor, DirectMessage } from 'src/app/core/authcontroller/authInterface';
import { slideRightToLeftAnimation } from 'src/app/animation/rightToleft.animation';
import { ChatService } from 'src/app/home/features/chatbox/chat-service';

@Component({
  selector: 'app-directmessage',
  templateUrl: './directmessage.page.html',
  styleUrls: ['./directmessage.page.scss'],
  standalone: false
})
export class DirectmessagePage implements OnInit {

  roomId = '';
  messages: DirectMessage[] = [];
  newMessageText: string = '';
  
  activeUser: DirectMessage | null = null;
  activeUserName: any | null = null;

  profile: ContentAuthor | null = null;
  private prevUrl: string | null = null;

  constructor(
    private navCtrl: NavController,
    private readonly previousRoute: PreviousRouteServe,
    private readonly authServe: AuthService,
    private readonly chatServe: ChatService
  ) {}

  ngOnInit() {
    
  }

  ionViewWillEnter(){
    const session = this.authServe.getSession();
    if(!session.isAuthenticated)
    { 
      return;
    }else{
      const state = history.state;
      if (state && state.roomId) {
        this.roomId = state.roomId;
        this.activeUser = state.targetUser;
        this.profile = state.user;
        this.activeUserName = state.targetName;
      }
      
      this.prevUrl = this.previousRoute.getPreviousUrl();
      if(this.prevUrl === null){
        this.prevUrl = '/home/chat';
      }
      
      
      this.loadHistory(this.roomId);
    }
  }

  onSend(){
    if(!this.newMessageText.trim() || !this.roomId || !this.profile) return;

    const payload: DirectMessage = {
      roomId: this.roomId,
      senderId: this.profile,
      text: this.newMessageText,
      messageType: 'text'
    }

    this.chatServe.sendMessage(payload);
    this.loadHistory(this.roomId);
    this.newMessageText = '';
  }

  loadHistory(roomId?: string) {
    if (!this.roomId) return;

    this.chatServe.getRoomHistory(this.roomId).subscribe({
      next: (res: DirectMessage[]) => {
        // Filter out messages sent by the logged-in user
        this.messages = res;
        console.log('Loaded chat history for room:', this.roomId, this.messages);
      },
      error: (err) => console.error('Error fetching chat history:', err)
    });
  }

  isMyMessage(senderId: DirectMessage['senderId']): boolean {
    if(!this.profile?.userId || !senderId) return false;
    const id = typeof senderId === 'object' ? senderId.userId : senderId;
    return id === this.profile.userId;
  }

  getSenderName(senderId: DirectMessage['senderId']): string {
    if (typeof senderId === 'object' && senderId !== null && 'authorName' in senderId) 
      {
        return senderId.authorName;
      }
    return 'User';
  }

  goBack(){
    if(this.prevUrl){
      this.navCtrl.navigateBack(this.prevUrl, {
        animation: slideRightToLeftAnimation
      });
    }
    this.activeUser = null;
  }
}
