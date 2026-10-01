import { Component, OnInit, OnDestroy } from '@angular/core';
import { ProfileService } from 'src/app/home/features/profile/profile-service';
import { ChatService } from 'src/app/home/features/chatbox/chat-service';
import { ChatList, DirectMessage, Followers, User } from 'src/app/core/authcontroller/authInterface';
import { forkJoin, Subscription } from 'rxjs';
import { AuthService } from 'src/app/core/authcontroller/auth-service';
import { InfiniteScrollCustomEvent } from '@ionic/angular';

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

export class ChatboxPage implements OnInit, OnDestroy {
  roomId = ''; // Dynamic ID for 1-on-1 or group chat
  isChatModalOpen = false;
  messages: DirectMessage[] = [];
  newMessageText: string = '';
  lastMessageText: string = '';
  lastMessageTime: string | Date = '';
  private msgSub!: Subscription;
  
  activeUser: User | null = null;
  user: User | null = null;
  avatarUrl?: string = '';
  selectedTag: string = 'Primary';
  isSeen: boolean = false;

  tags: string[] = ['Primary', 'Requests', 'General'];

  follows: User[] = []
  followerList: any[] = [];
  followingList: any[] =[];
  chatPersonList: ChatList[] = [];

  onlineFriend = [
    {_id:'1', fullname:'Luna Art', imgUrl:'assets/images/luna_art.jpg', status:'false'},
    {_id:'1', fullname:'Neo Pixel', imgUrl:'assets/images/neo_pixel.jpg', status:'false'},
    {_id:'1', fullname:'Travel Joy', imgUrl:'assets/images/travel_joy.jpg', status:'false'},
  ]
  
  constructor(
    private readonly authServe: AuthService,
    private readonly profileServe: ProfileService,
    private readonly chatServe: ChatService
  ) { }

  ngOnInit() { 
    const session = this.authServe.getSession();
    if(!session.isAuthenticated || !session.token){
      return
    }else{
      this.profileServe.loadUserData().subscribe({
        next: (userData) => {
          this.user = userData;
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
          console.log('All Rooms:', res);
        }
      });

      this.msgSub = this.chatServe.getMessages().subscribe({
        next: ((msg)=>{
          if(msg.roomId === this.roomId){
            this.messages.push(msg);
            console.log(this.messages);
          }
        })
      })

      this.isSeen = false;
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
  openPrivateChat(targetUser: User){
    if(!this.user?._id || !targetUser) return;

    this.activeUser = targetUser;

    this.roomId = [this.user._id, targetUser._id].sort().join('_');

    this.messages = [];
    this.chatServe.joinRoom(this.roomId, this.user._id);
    this.loadHistory(); // Load existing messages
    this.isChatModalOpen = true;
  }

  loadHistory() {
    if (!this.roomId) return;

    this.chatServe.getRoomHistory(this.roomId).subscribe({
      next: (res: DirectMessage[]) => {
        this.messages = res;

        if (!res || res.length === 0) return;

        // 1. Get the most recent message in the chat room
        const lastMsg = res[res.length - 1];
        const lastMessageText = lastMsg.text || '';
        const lastMessageTime = lastMsg.createdAt ? new Date(lastMsg.createdAt) : '';

        // 2. Collect unique sender IDs to avoid duplicate API calls
        const uniqueSenderIds = Array.from(
          new Set(
            res.map((msg: any) =>
              typeof msg.senderId === 'object' ? msg.senderId._id : msg.senderId || msg.senderID
            )
          )
        );

        // 3. Prepare requests for missing user profile data
        const fetchUserID = uniqueSenderIds.filter(id=> id !== this.user?._id);
        const userRequests = fetchUserID.map((id) =>
          this.profileServe.loadUserDataById(id)
        );

        // 4. Execute user requests concurrently
        forkJoin(userRequests).subscribe({
          next: (userDataArray: ChatList[]) => {
            // Create a Map for quick ID -> User Data lookup
            const userMap = new Map<string, ChatList>();
            uniqueSenderIds.forEach((id, index) => {
              userMap.set(id, userDataArray[index]);
            });

            // 5. Update chatPersonList with user info, last message, and time
            this.chatPersonList = userDataArray.map((user) => ({
              ...user,
              lastMessage: lastMessageText,
              lastMessageTime: lastMessageTime
            }));
          },
          error: (err) => console.error('Error fetching user profiles:', err)
        });
      },
      error: (err) => console.error('Error fetching chat history:', err)
    });
  }

  onSend(){
    if(!this.newMessageText.trim() || !this.roomId || !this.user?._id) return;

    const payload: DirectMessage = {
      roomId: this.roomId,
      senderId: this.user?._id,
      text: this.newMessageText,
      messageType: 'text'
    }

    this.chatServe.sendMessage(payload);

    this.newMessageText='';    
  }

  closeChatModal() {
    this.isChatModalOpen = false;
    this.activeUser = null;
  }

  //#endregion
  
  selectTag(tag: string) {
    this.selectedTag = tag;
  }

  isMyMessage(senderId: DirectMessage['senderId']): boolean {
    if (!senderId || !this.user?._id) return false;
    const id = typeof senderId === 'object' ? senderId._id : senderId;
    return id === this.user._id;
  }

  getSenderName(senderId: DirectMessage['senderId']): string {
    if (typeof senderId === 'object' && senderId !== null && 'username' in senderId) {
    return senderId.username;
  }
  return 'User';
  }
  
  ngOnDestroy(){
    if(this.msgSub){
      this.msgSub.unsubscribe();
    }
  }
}
