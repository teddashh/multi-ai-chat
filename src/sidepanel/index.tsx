import React from 'react';
import { createRoot } from 'react-dom/client';
import App from './App';
import { applyTheme } from '../shared/theme';
import './styles.css';

// 先套系統主題，避免讀 storage 的空檔閃一下亮底；App 掛載後會換成實際設定
applyTheme('system');

const root = createRoot(document.getElementById('root')!);
root.render(<App />);
