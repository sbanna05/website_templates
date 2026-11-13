import { Routes } from '@angular/router';

/** Every page is lazy-loaded, so the first visit downloads only the home page. */
export const routes: Routes = [
  {
    path: '',
    title: 'Booknook: read, rate and shelve your books',
    loadComponent: () => import('./pages/home').then((m) => m.Home),
  },
  {
    path: 'browse',
    title: 'Browse books | Booknook',
    loadComponent: () => import('./pages/browse').then((m) => m.Browse),
  },
  {
    path: 'shelves',
    title: 'My shelves | Booknook',
    loadComponent: () => import('./pages/shelves').then((m) => m.Shelves),
  },
  {
    path: 'book/:id',
    title: 'Book | Booknook',
    loadComponent: () => import('./pages/book-detail').then((m) => m.BookDetail),
  },
  {
    path: 'read/:id',
    title: 'Reading | Booknook',
    loadComponent: () => import('./pages/reader').then((m) => m.Reader),
  },
  {
    path: 'login',
    title: 'Sign in | Booknook',
    loadComponent: () => import('./pages/login').then((m) => m.Login),
  },
  {
    path: 'register',
    title: 'Create account | Booknook',
    loadComponent: () => import('./pages/register').then((m) => m.Register),
  },
  {
    path: '**',
    title: 'Page not found | Booknook',
    loadComponent: () => import('./pages/not-found').then((m) => m.NotFound),
  },
];
