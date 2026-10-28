import './style.css';
import { App } from './app';

const app = new App(document.getElementById('game') as HTMLCanvasElement);
if (new URLSearchParams(location.search).has('debug')) (window as unknown as { app: App }).app = app;
