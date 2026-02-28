import { Component } from '@angular/core';
import { Content } from "./content/content";
import { Footer } from '../shared/components/footer/footer';
import { Header } from '../shared/components/header/header';

@Component({
  selector: 'app-main',
  imports: [Content, Footer, Header],
  templateUrl: './main.html',
  styleUrl: './main.scss',
})
export class Main {}
