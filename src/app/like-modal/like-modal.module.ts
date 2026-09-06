import { NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

import { IonicModule } from '@ionic/angular';

import { LikeModalPageRoutingModule } from './like-modal-routing.module';

import { LikeModalPage } from './like-modal.page';

@NgModule({
  imports: [
    CommonModule,
    FormsModule,
    IonicModule,
    LikeModalPageRoutingModule
  ],
  declarations: [LikeModalPage]
})
export class LikeModalPageModule {}
