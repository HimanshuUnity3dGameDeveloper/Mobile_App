import { Component, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { IonContent, NavController } from '@ionic/angular';
import { PreviousRouteServe } from 'src/app/core/previous-route-serve';
import { AuthService } from 'src/app/core/authcontroller/auth-service';
import { ContentAuthor, DirectMessage } from 'src/app/core/authcontroller/authInterface';
import { slideRightToLeftAnimation } from 'src/app/animation/rightToleft.animation';
import { ChatService } from 'src/app/home/features/chatbox/chat-service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-directmessage',
  templateUrl: './directmessage.page.html',
  styleUrls: ['./directmessage.page.scss'],
  standalone: false
})
export class DirectmessagePage implements OnInit, OnDestroy {
  @ViewChild(IonContent, { static: false }) content!: IonContent;
  private messageSub?: Subscription;

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
    }
    
    // 1. Unpack navigation state
    const state = history.state;
    if (state && state.roomId) {
      this.roomId = state.roomId;
      this.activeUser = state.targetUser;
      this.profile = state.user;
      this.activeUserName = state.targetName;
    }
    
    this.prevUrl = this.previousRoute.getPreviousUrl() || '/home/chat';
        
    if (this.roomId && this.profile?.userId) {
      // 2. Ensure room socket connection is active
      this.chatServe.joinRoom(this.roomId, this.profile.userId);

      // 3. Mark unread messages as read
      this.chatServe.markMessagesAsRead(this.roomId, this.profile.userId);

      // 4. Fetch message history
      this.loadHistory(this.roomId);
    }

    // 5. Clean subscription before creating new one
    this.unsubscribe();

    // 6. Listen for live incoming messages for this room
    this.messageSub = this.chatServe.getMessages().subscribe({
      next: (message: DirectMessage) => {
        if (message && message.roomId === this.roomId) {
          this.messages.push(message);
          this.scrollToBottom();
        }
      },
      error: (err) => console.error('Error in direct message stream:', err)
    });
  }

  ionViewWillLeave() {
    this.unsubscribe();
  }

  ngOnDestroy() {
    this.unsubscribe();
  }

  private unsubscribe() {
    if (this.messageSub) {
      this.messageSub.unsubscribe();
      this.messageSub = undefined;
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
    this.newMessageText = '';
    this.scrollToBottom();
  }

  loadHistory(roomId?: string) {
    if (!roomId) return;

    this.chatServe.getRoomHistory(roomId).subscribe({
      next: (res: DirectMessage[]) => {
        // Filter out messages sent by the logged-in user
        this.messages = res;
        this.scrollToBottom();
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

  scrollToBottom() {
    setTimeout(() => {
      if (this.content) {
        this.content.scrollToBottom(300);
      }
    }, 100);
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
