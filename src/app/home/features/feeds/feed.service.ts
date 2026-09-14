import { Injectable } from "@angular/core";
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { environment } from 'src/environments/environment';
import { StoryItem } from "src/app/core/authcontroller/authInterface";
import { map } from "rxjs";

@Injectable({
  providedIn: 'root',
})
export class FeedService {

    constructor(
        private http: HttpClient,
        private router: Router
    ){}

    loadStory(){
        return this.http.get<StoryItem>(`${environment.apiUrl}/story`).pipe(
            
        );
    }
}