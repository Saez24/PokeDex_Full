import { Component } from '@angular/core';
import { Content } from "./content/content";

@Component({
  selector: 'app-main',
  imports: [Content],
  templateUrl: './main.html',
  styleUrl: './main.scss',
})
export class Main { }
