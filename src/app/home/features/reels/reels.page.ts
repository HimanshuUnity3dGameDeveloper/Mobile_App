import { Component, OnInit, ElementRef, ViewChildren, QueryList} from '@angular/core';
import { ViewWillLeave } from '@ionic/angular';
import { register } from 'swiper/element/bundle';
import { ReelService } from './reel-service';
import { ReelItem } from 'src/app/core/authcontroller/authInterface';

// Register Swiper Custom Elements
register();

@Component({
  selector: 'app-reels',
  templateUrl: './reels.page.html',
  styleUrls: ['./reels.page.scss'],
  standalone:false
})
export class ReelsPage implements OnInit, ViewWillLeave {
  
  @ViewChildren('videoPlayer') videoPlayers!: QueryList<ElementRef<HTMLVideoElement>>;
  private currentAudio: HTMLAudioElement | null = null;
  private activeIndex: number = 0;
  isReelPlay: boolean = false;

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
    private readonly reelServe: ReelService
  ){}
  ngOnInit(): void {

    this.reelServe.loadReels().subscribe({
      next: (response: any) => {
        this.reels = [...response];
        setTimeout(() => {
          this.onplaySwitchScreen(this.activeIndex);
        }, 0);
      }
    })
  }

  // Triggered when navigating away from Reels page
  ionViewWillLeave(): void {
    this.stopCurrentAudio();
  }

  // Handle slide transition: play current, pause others
  onSlideChange(event: any) {
    const newIndex = event.detail[0]?.activeIndex ?? 0;
    this.onplaySwitchScreen(newIndex);
  }

  onplaySwitchScreen(indexNum: number){
    this.activeIndex = indexNum;

    // 1. Pause and clean up current audio
    this.stopCurrentAudio();

    this.videoPlayers.forEach((playerRef, index) => {
      const video = playerRef.nativeElement;

      if (index === indexNum) {
        video.currentTime = 0;
        video.play();

        // Update state for active index
        if (this.reels[index]) {
          this.reels[index].isPlaying = true;
        }

        // Start new audio track for active slide
        this.playAudioForReel(this.reels[indexNum]);
      } else {
        video.pause();      
        this.reels[indexNum].isPlaying = false;
      }
    });
  }

  // Tap video to toggle Play / Pause
  togglePlayPause(index: number) {
    const video = this.videoPlayers.toArray()[index]?.nativeElement;
    const reel = this.reels[index];
    
    if(!video) return;

    if (video.paused) {
      video.play();
      this.currentAudio?.play();
      reel.isPlaying = true;
    } else {
      video.pause();
      this.currentAudio?.pause();
      reel.isPlaying = false;
    }
  }

  private playAudioForReel(reel: ReelItem): void {
    if (!reel.audio?.audioUrl) return;

    this.currentAudio = new Audio(reel.audio?.audioUrl);
    console.log(this.currentAudio);
    this.currentAudio.loop = true; // Auto-loop audio alongside the reel video

    this.currentAudio
      .play()
      .catch((err) => console.warn('Audio playback prevented by browser:', err));
  }

  private stopCurrentAudio(): void {
    if (this.currentAudio) {
      this.currentAudio.pause();
      this.currentAudio.currentTime = 0;
      this.currentAudio = null;
    }
  }

  toggleLike(reel: ReelItem) {
    reel.isLiked = !reel.isLiked;
  }
}
