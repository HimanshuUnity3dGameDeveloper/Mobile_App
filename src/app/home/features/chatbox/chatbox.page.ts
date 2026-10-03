import { Component, OnInit, OnDestroy } from '@angular/core';
import { ProfileService } from 'src/app/home/features/profile/profile-service';
import { ChatService } from 'src/app/home/features/chatbox/chat-service';
import { ChatList, ContentAuthor, DirectMessage, Followers, User } from 'src/app/core/authcontroller/authInterface';
import { forkJoin, Subscription } from 'rxjs';
import { AuthService } from 'src/app/core/authcontroller/auth-service';
import { NavController } from '@ionic/angular';
import { slideLeftToRightAnimation } from 'src/app/animation/leftToright.animation';

interface FollowList{
  _id: string;
  username: string;
  fullname: string;
  imgUrl: string;
  status: string;
}

@Component({
  selector: 'app-chatbox',
  templateUrl: './chatbox.page.html',
  styleUrls: ['./chatbox.page.scss'],
  standalone: false
})

export class ChatboxPage implements OnInit {
  
  roomId = ''; 
  messages: DirectMessage[] = [];
  newMessageText: string = '';
  lastMessageText: string = '';
  lastMessageTime: string | Date = '';
  
  activeUser: DirectMessage | null = null;
  profile: ContentAuthor | null = null;
  user: User | null = null;
  avatarUrl?: string = '';
  selectedTag: string = 'Primary';
  isSeen: boolean = false;

  tags: string[] = ['Primary', 'Requests', 'General'];

  follows: User[] = []
  followerList: any[] = [];
  followingList: any[] =[];

  onlineFriend = [
    {_id:'1', fullname:'Luna Art', imgUrl:'assets/images/luna_art.jpg', status:'false'},
    {_id:'1', fullname:'Neo Pixel', imgUrl:'assets/images/neo_pixel.jpg', status:'false'},
    {_id:'1', fullname:'Travel Joy', imgUrl:'assets/images/travel_joy.jpg', status:'false'},
  ]
  
  constructor(
    private readonly authServe: AuthService,
    private readonly profileServe: ProfileService,
    private readonly chatServe: ChatService,
    private readonly navCtrl: NavController,
  ) { }

  ngOnInit() { 
    
  }

  ionViewWillEnter(){

    const session = this.authServe.getSession();
    if(!session.isAuthenticated || !session.token){
      return
    }else{
      this.profileServe.loadUserData().subscribe({
        next: (userData) => {
          this.user = userData;
          this.profile = {
            ...this.profile,
            userId: userData?._id ? String(userData._id).trim() : '',
            authorName: userData?.fullname || '',
            avatarUrl: userData?.avatarUrl || '',
          };
          this.avatarUrl = userData.avatarUrl?.trim();       
        },
        error: (err) => {
          console.error('Failed to load user profile:', err);
        },
      });

      this.updateFollowList();

      this.chatServe.connectSocket(session?.token);
      
      this.chatServe.getAllRooms().subscribe({
        next: (res)=>{
          const ids = res.map((room:any)=> room._id);
          if(ids.length > 0){
            ids.forEach((id:any)=>{
              this.roomId = id;
              this.loadHistory([this.roomId]);
            });
          }
        }
      });
    }
  }

  //#region Following/Follower Content....
  onClickFollow(item: any){
    const otherUserID = item?._id;

    const payLoad: Followers = {
      followerId: this.user?._id??'',
      followingId: otherUserID
    }

    this.profileServe.createNewFollower(payLoad).subscribe({
      next:()=>{
        this.updateFollowList();
      },
      error(er){
        console.log(er);
      }
    })
  }

  updateFollowList(event?: any){
    this.profileServe.callAllFollowers().subscribe({
      next: ((response)=>{
        const list = Array.isArray(response) ? response : [];

        // Step-1. Get the list of user whom i followed
        const following = list.filter(item => item.followerId === this.user?._id);

        // Step-2. Get the list of user the follow my account..
        const follower = list.filter(item => item.followingId === this.user?._id);

        this.authServe.allUsers().subscribe({
          next:(data: User[])=>{
            const list = data;

            // Step-3. Fetch the user whom i followed..
            const request1 = new Set(following.map(item => item.followingId));
            this.followingList = list.filter(item => request1.has(item._id));

            // Step-4. Fetch the user that following my account..
            const request2 = new Set(follower.map(item => item.followerId));
            this.followerList = list.filter(item => request2.has(item._id));
        
            // Step-5. Filter only those user who didn't in my following list..
            this.follows = list.filter(item=>item._id !== this.user?._id && !request1.has(item._id));

          }
        });

        if (event) {
          event.target.complete();
        }
      }),
      error(er){
        console.log(er);
        if (event) {
          event.target.complete();
        }
      }
    });
  }

  isFollower(item: any): boolean{
    const id = item._id;
    return this.followerList.some((follow) => follow._id === id
    );
  }
  //#endregion

  //#region Chat Model..
  openPrivateChat(targetUser: any){
    if(!this.user?._id || !targetUser) return;

    const targetName = targetUser?.fullname;
    // 1. Set up active target user & composite room ID
    this.activeUser = targetUser;
    if(this.roomId) this.roomId = ''; // Reset roomId before creating a new one]
    this.roomId = [this.user._id, targetUser._id].sort().join('_');

    // 2. Join socket room on backend
    this.chatServe.joinRoom(this.roomId, this.user._id);

    // 3. Navigate forward passing room context
    this.navCtrl.navigateForward('/home/directmessage', {
      animation: slideLeftToRightAnimation,
      state:{
        user: this.profile,
        roomId: this.roomId,
        targetUser: this.activeUser,
        targetName: targetName
      }
    });
  }

  openGroupChat(item: any){

    this.roomId = item.roomId;
    const recName = item?.senderId?.authorName;
    this.navCtrl.navigateForward('/home/directmessage', {
      animation: slideLeftToRightAnimation,
      state:{
        user: this.profile,
        roomId: this.roomId,
        targetUser: this.activeUser,
        targetName: recName
      }
    });
  }

  loadHistory(roomId?: string[]) {
    
    roomId?.forEach(id=>{this.chatServe.getRoomHistory(id).subscribe({
      next: (res: DirectMessage[]) => {
        const list = Array.isArray(res) ? res : [];
        
        if(list.length === 0){
          this.messages = [];
          return;
        }

        // 1. Get the most recent message in this specific room
        const lastMsg = list[list.length - 1];
        
        // 2. Find the message sent by the other participant
        const filteredMessages = list.find(item => {
          const senderId = typeof item.senderId === 'object' ? item.senderId.userId : item.senderId;
          return senderId !== this.profile?.userId;
        });
        
        // 3. Construct the room summary item
        const roomSummary = filteredMessages 
          ? { ...filteredMessages, text: lastMsg.text, createdAt: lastMsg.createdAt }
          : { ...lastMsg, text: lastMsg.text, createdAt: lastMsg.createdAt };

        // 4. Append to the existing messages array (Avoid duplicates)
        const exists = this.messages.some(m => m.roomId === roomSummary.roomId);
        if (!exists) {
          this.messages = [...this.messages, roomSummary];
        }

        console.log('Accumulated room summaries:', this.messages);
      },
      error: (err) => console.error('Error fetching chat history:', err)
    });})
  }

  //#endregion
  
  selectTag(tag: string) {
    this.selectedTag = tag;
  }

  isMessageRead(message: DirectMessage | any): boolean {
    if (!message || !message.readBy || !this.user?._id) return false;
    return message.readBy.some((id: any) => id === this.user?._id);
  }

  getSenderName(senderId: ContentAuthor | string | null | undefined): string {
    if(!senderId) return 'User';
    if (typeof senderId === 'object' && senderId !== null && 'authorName' in senderId) {
      return senderId.authorName || 'User';
    }
    return 'User';
  }
  
  getSenderAvatar(senderId: ContentAuthor | string | null | undefined): string {
    const defaultAvatar = 'assets/images/default-avatar.png';
    if(!senderId) return defaultAvatar;

    if (typeof senderId === 'object' && senderId !== null && 'avatarUrl' in senderId) {
      return senderId.avatarUrl || defaultAvatar;
    }
    return defaultAvatar;
  }

  doRefresh(event: any) {
    this.updateFollowList(event);
  }

}
