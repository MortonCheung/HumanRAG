import React from 'react';
import ReactDOM from 'react-dom/client';
import { MotionConfig } from 'motion/react';
import { AppRouter } from './app/AppRouter';
import './design/tokens.css';
import './styles.css';
import './design/app.css';
import './features/library/knowledge-architecture.css';

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode><MotionConfig reducedMotion="user"><AppRouter /></MotionConfig></React.StrictMode>,
);
