import { NgModule } from '@angular/core';
import { Routes, RouterModule } from '@angular/router';

import { LikeModalPage } from './like-modal.page';

const routes: Routes = [
  {
    path: '',
    component: LikeModalPage
  }
];

@NgModule({
  imports: [RouterModule.forChild(routes)],
  exports: [RouterModule],
})
export class LikeModalPageRoutingModule {}
