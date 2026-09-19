import { Component, OnInit, ElementRef, ViewChildren, QueryList, viewChildren} from '@angular/core';
import { register } from 'swiper/element/bundle';
import { ReelService } from './reel-service';
import { ReelItem } from 'src/app/core/authcontroller/authInterface';
import { ProfileService } from 'src/app/home/features/profile/profile-service';
import { AuthService } from 'src/app/core/authcontroller/auth-service';

// Register Swiper Custom Elements
register();

@Component({
  selector: 'app-reels',
  templateUrl: './reels.page.html',
  styleUrls: ['./reels.page.scss'],
  standalone:false
})
export class ReelsPage implements OnInit {
  
  @ViewChildren('videoPlayer') videoPlayers!: QueryList<ElementRef<HTMLVideoElement>>;
  @ViewChildren('audioPlayer') audioPlayers!: QueryList<ElementRef<HTMLAudioElement>>;
  private currentAudio: HTMLAudioElement | null = null;
  private activeIndex: number = 0;
  isReelPlay: boolean = false;
  currentUserId: string | null = null; // Declare property here

  // Using direct MP4 files for true Instagram-like behavior
  // reels: ReelItem[] = [
  //   {
  //     id: '1',
  //     videoUrl: 'https://media.gettyimages.com/id/1882718862/video/determined-muscular-male-athlete-in-sportswear-doing-kettlebell-swing-exercise-at-gym.mp4?s=mp4-640x640-gi&k=20&c=XqWczzUpfxxDlgPilRv0PYhJyJQWZ2_FRXLQPFYIszo=',
  //     username: 'travel_coder',
  //     userAvatar: 'https://i.pravatar.cc/150?img=11',
  //     description: 'Check out this awesome view! 🚀 #ionic #angular #reels',
  //     audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-1.mp3',
  //     audioTrack: 'Original Audio - travel_coder',
  //     likes: '14.2K',
  //     comments: '1,082',
  //     shares: '3.4K',
  //     isPlaying: true
  //   },
  //   {
  //     id: '2',
  //     videoUrl: 'https://www.pexels.com/download/video/15566120/',
  //     username: 'dev_tips',
  //     userAvatar: 'https://i.pravatar.cc/150?img=32',
  //     description: 'Building pure Instagram Reels in Ionic Angular! 🔥',
  //     audioUrl: 'https://www.soundhelix.com/examples/mp3/SoundHelix-Song-2.mp3',
  //     audioTrack: 'Trending Audio - TechVibes',
  //     likes: '28.5K',
  //     comments: '2,410',
  //     shares: '12.1K',
  //     isPlaying: false
  //   }
  // ];

  reels: ReelItem[]=[];
  
  constructor(
    private readonly reelServe: ReelService,
    private readonly profileServe: ProfileService,
    private readonly authService: AuthService
  ){}
  ngOnInit(): void {

    const session = this.authService.getSession();
    if(!session.isAuthenticated) return;

    this.profileServe.loadUserData().subscribe({
      next: ((user: any)=>{
        this.currentUserId = user._id;
      })
    });

    this.reelServe.loadReels().subscribe({
      next: (response: any) => {
        this.reels = [...response];
        setTimeout(() => {
          this.onplaySwitchScreen(this.activeIndex);
        }, 0);
      }
    });
  }

  // Handle slide transition: play current, pause others
  onSlideChange(event: any) {
    const newIndex = event.detail[0]?.activeIndex ?? 0;
    this.onplaySwitchScreen(newIndex);
  }

  onVideoEnded(indexNum: number) {
    // Restart video playback
    this.onplaySwitchScreen(indexNum);
  }

  onplaySwitchScreen(indexNum: number){
    this.activeIndex = indexNum;

    this.videoPlayers.forEach((playerRef, index) => {
      const video = playerRef.nativeElement;

      if (index === indexNum) {
        video.currentTime = 0;
        video.play().catch(err => console.warn('Video play prevented:', err));

        // Update state for active index
        if (this.reels[index]) {
          this.reels[index].isPlaying = true;
        }

      } else {
        video.pause();      
        if (this.reels[index]) {
          this.reels[index].isPlaying = false; // Fixed: indexNum -> index
        }
      }
    });

    this.audioPlayers.forEach((playerRef, index) =>{
      
      const audio = playerRef.nativeElement;
      if (index === indexNum) {
        audio.currentTime = 0;
        audio.play().catch(err => console.warn('Audio play prevented:', err));
        console.log(audio.duration);

      } else {
        audio.pause();      
      }
    });
  }

  // In your component.ts
  formatDuration(seconds: number): string {
    if (!seconds || isNaN(seconds)) return '0:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  }

  // Handler when video metadata loads
  onLoadedMetadata(event: Event, item: any) {
    const video = event.target as HTMLVideoElement;
    if (video && video.duration) {
      // Overwrite the static duration string with actual formatted video duration
      if (item.audio) {
        item.audio.duration = this.formatDuration(video.duration);
      }
    }
  }

  // Tap video to toggle Play / Pause
  togglePlayPause(index: number) {
    const video = this.videoPlayers.toArray()[index]?.nativeElement;
    const reel = this.reels[index];
    
    if(!video) return;

    if (video.paused) {
      video.play();
      reel.isPlaying = true;
    } else {
      video.pause();
      reel.isPlaying = false;
    }
  }

  isLikedByCurrentUser(likedBy?: string[] | null): boolean {
    if (!this.currentUserId || !likedBy) {
      return false;
    }
    return likedBy.includes(this.currentUserId);
  }

  toggleLike(reel: ReelItem) {
    const userId = reel._id;
    if (!userId) {return};
  
    this.reelServe.updateLikes(userId).subscribe({
      next: (updatedPost: any) => {
        reel.likedBy = updatedPost.likedBy;
        reel.likesCount = updatedPost.likesCount;
      },
      error: (err: any) => {
        console.error('DB Update failed:', err);
      }
    });
  }
  
}
