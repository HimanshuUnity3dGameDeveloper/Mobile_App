import { Component, OnInit } from '@angular/core';
import { ProfileService } from 'src/app/home/features/profile/profile-service';
import { ChatService } from 'src/app/home/features/chatbox/chat-service';
import { Followers, User } from 'src/app/core/authcontroller/authInterface';
import { forkJoin } from 'rxjs';
import { AuthService } from 'src/app/core/authcontroller/auth-service';

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
    private readonly chatServe: ChatService
  ) { }

  ngOnInit() { 
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
    this.callAllUsers();

    this.isSeen = false;
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
        this.callAllUsers();
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

        // 1. Separate the follower and following ids..
        this.followerList = list.filter(item => item.followerId === this.user?._id);       //Followers means i follow the preson..
        this.followingList = list.filter(item => item.followingId === this.user?._id);     //Following means who follow me..

        this.callFollowerModel();
        this.callFollowingModel();
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

  callFollowerModel(){
    
    // 1. Map all items into an array of Observables (do NOT subscribe inside map)
    const userRequests$ = this.followingList.map(item => 
      this.profileServe.loadUserDataById(item.followerId)
    );

    // 2. Pass the entire array into forkJoin so all requests run in parallel
    if (userRequests$.length > 0) {
      forkJoin(userRequests$).subscribe({
        next: (usersData: any[]) => {
          // usersData contains user objects in the exact order of userRequests$
          this.followingList = this.followingList.map((list, index) => ({
            ...list,
            followerId: usersData[index] // Match each resolved user by index
          }));

          console.log('Updated list:', this.followingList);
        },
        error: (err) => {
          console.error('Error fetching user data:', err);
        }
      });
    }
    
  }

  callFollowingModel(){
    
    // 1. Map all items into an array of Observables (do NOT subscribe inside map)
    const userRequests$ = this.followerList.map(item => 
      this.profileServe.loadUserDataById(item.followingId)
    );

    // 2. Pass the entire array into forkJoin so all requests run in parallel
    if (userRequests$.length > 0) {
      forkJoin(userRequests$).subscribe({
        next: (usersData: any[]) => {
          // usersData contains user objects in the exact order of userRequests$
          this.followerList = this.followerList.map((list, index) => ({
            ...list,
            followingId: usersData[index] // Match each resolved user by index
          }));

          console.log('Updated list:', this.followerList);
        },
        error: (err) => {
          console.error('Error fetching user data:', err);
        }
      });
    }

  }

  callAllUsers(){
    this.authServe.allUsers().subscribe({
      next:(data: User[])=>{
        const list = data;
        const request = new Set(this.followerList.map(item=> item.followingId));

        this.follows = list.filter(item=>item._id !== this.user?._id && !request.has(item._id));
      }
    })
  }

  isFollower(item: any): boolean{
    const id = item._id;
    return this.followingList.some((follow) =>
      follow.followerId === id || follow.followerId?._id === id
    );
  }
  //#endregion

  selectTag(tag: string) {
    this.selectedTag = tag;
  }
}
