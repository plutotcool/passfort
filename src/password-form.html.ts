/**
 * Minimal, accessible password form HTML.
 * Inline to avoid external dependencies in Edge.
 */

import type { FormOptions } from './config.js';

const DEFAULTS: Required<FormOptions> = {
  title: 'Password Required',
  description: 'This page is protected. Enter the password to continue.',
  placeholder: 'Password',
  buttonText: 'Continue',
  theme: 'dark',
};

const THEMES = {
  dark: {
    body: '#18181b',
    bodyColor: '#e4e4e7',
    card: '#27272a',
    heading: '#ffffff',
    muted: '#a1a1aa',
    inputBg: '#18181b',
    inputBorder: '#52525b',
    inputColor: '#e4e4e7',
    focusBorder: '#ea580c',
    focusRing: 'rgba(234,88,12,0.25)',
    button: '#ea580c',
    buttonHover: '#c2410c',
    error: '#ef4444',
  },
  light: {
    body: '#fafafa',
    bodyColor: '#18181b',
    card: '#ffffff',
    heading: '#18181b',
    muted: '#71717a',
    inputBg: '#ffffff',
    inputBorder: '#e4e4e7',
    inputColor: '#18181b',
    focusBorder: '#ea580c',
    focusRing: 'rgba(234,88,12,0.2)',
    button: '#ea580c',
    buttonHover: '#c2410c',
    error: '#dc2626',
  },
};

export function getPasswordFormHtml(
  options: {
    error?: boolean;
    returnUrl?: string;
  } & Partial<FormOptions> = {}
): string {
  const {
    error = false,
    returnUrl = '/',
    title = DEFAULTS.title,
    description = DEFAULTS.description,
    placeholder = DEFAULTS.placeholder,
    buttonText = DEFAULTS.buttonText,
    theme = DEFAULTS.theme,
  } = options;

  const colors = THEMES[theme];

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${escapeHtml(title)}</title>
  <style>
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      background: ${colors.body};
      color: ${colors.bodyColor};
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      padding: 1.5rem;
      -webkit-font-smoothing: antialiased;
      line-height: 1.5;
    }
    .card {
      background: ${colors.card};
      border-radius: 8px;
      padding: 2rem;
      width: 100%;
      max-width: 360px;
      border: 1px solid ${colors.inputBorder};
      box-shadow: 0 1px 2px rgba(0,0,0,0.05);
    }
    h1 {
      font-size: 1.25rem;
      font-weight: 500;
      margin-bottom: 0.5rem;
      color: ${colors.heading};
      letter-spacing: -0.02em;
    }
    p { color: ${colors.muted}; font-size: 0.875rem; margin-bottom: 1.25rem; line-height: 1.5; }
    form { display: flex; flex-direction: column; gap: 1rem; }
    input[type="password"] {
      width: 100%;
      padding: 0.625rem 1rem;
      font-size: 0.9375rem;
      border: 1px solid ${colors.inputBorder};
      border-radius: 6px;
      background: ${colors.inputBg};
      color: ${colors.inputColor};
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    input[type="password"]:focus {
      outline: none;
      border-color: ${colors.focusBorder};
      box-shadow: 0 0 0 2px ${colors.focusRing};
    }
    input[type="password"]::placeholder {
      color: ${colors.muted};
    }
    button {
      padding: 0.625rem 1.25rem;
      font-size: 0.875rem;
      font-weight: 500;
      background: ${colors.button};
      color: white;
      border: none;
      border-radius: 6px;
      cursor: pointer;
      transition: background 0.15s;
    }
    button:hover { background: ${colors.buttonHover}; }
    button:focus {
      outline: none;
      box-shadow: 0 0 0 2px ${colors.focusRing};
    }
    .error {
      color: ${colors.error};
      font-size: 0.8125rem;
      margin-top: -0.25rem;
    }
    .back {
      margin-top: 1.25rem;
      padding-top: 1rem;
      border-top: 1px solid ${colors.inputBorder};
    }
    .back a {
      color: ${colors.muted};
      font-size: 0.875rem;
      text-decoration: none;
      display: inline-block;
      min-height: 2.75rem;
      line-height: 2.75rem;
      padding: 0 0.25rem;
      -webkit-tap-highlight-color: transparent;
    }
    .back a:hover { color: ${colors.bodyColor}; }
    .back a:focus {
      outline: none;
      color: ${colors.focusBorder};
    }
  </style>
</head>
<body>
  <div class="card">
    <h1>${escapeHtml(title)}</h1>
    <p>${escapeHtml(description)}</p>
    <form method="POST" action="">
      <input type="hidden" name="return_url" value="${escapeHtml(returnUrl)}">
      <input type="password" name="password" placeholder="${escapeHtml(placeholder)}" required autocomplete="current-password" autofocus>
      ${error ? `<p class="error">Incorrect password. Try again.</p>` : ''}
      <button type="submit">${escapeHtml(buttonText)}</button>
    </form>
    <p class="back"><a href="/">← Back to home</a></p>
  </div>
</body>
</html>`;
}

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
