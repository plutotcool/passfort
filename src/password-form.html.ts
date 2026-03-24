/**
 * Minimal, accessible password form HTML.
 * Inline to avoid external dependencies in Edge.
 */

import type { FormOptions } from './config.js';

const DEFAULTS: Required<FormOptions> = {
  title: 'Protected page',
  description: 'Please enter your password below to continue.',
  placeholder: 'Password',
  buttonText: 'Continue',
  theme: 'dark',
};

const THEMES = {
  dark: {
    body: '#000000',
    bodyColor: 'oklch(0.708 0 0)',
    card: 'oklch(0.205 0 0)',
    heading: 'oklch(0.985 0 0)',
    muted: 'oklch(0.708 0 0)',
    inputBg: 'oklab(1 0 0 / 0.045)',
    inputBorder: 'oklch(1 0 0 / 0.15)',
    inputColor: 'oklch(0.708 0 0)',
    focusBorder: 'oklch(0.922 0 0)',
    button: 'oklch(0.922 0 0)',
    buttonColor: '#000000',
    buttonHover: 'oklab(0.922 0 0 / 0.9)',
    error: '#ef4444',
  },
  light: {
    body: 'lab(100 0 0)',
    bodyColor: 'lab(2.75381 0 0)',
    card: 'lab(100 0 0)',
    heading: 'lab(2.75381 0 0)',
    muted: 'lab(48.495998 0 0)',
    inputBg: 'transparent',
    inputBorder: 'lab(90.952003 0 -0.000012)',
    inputColor: 'lab(2.75381 0 0)',
    focusBorder: 'oklab(0.205 0 0 / 0.9)',
    button: 'oklab(0.205 0 0 / 0.9)',
    buttonColor: 'lab(98.260002 0 0)',
    buttonHover: 'oklab(0.205 0 0)',
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
      border-radius: 14px;
      padding: 2rem;
      width: 100%;
      max-width: 370px;
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
      padding: 0.625rem 0.775rem;
      font-size: 0.875rem;
      border: 1px solid ${colors.inputBorder};
      border-radius: 8px;
      background: ${colors.inputBg};
      color: ${colors.inputColor};
      transition: border-color 0.15s, box-shadow 0.15s;
    }
    input[type="password"]:focus {
      outline: none;
      border-color: ${colors.focusBorder};
    }
    input[type="password"]::placeholder {
      color: ${colors.muted};
    }
    button {
      padding: 0.625rem 0.775rem;
      font-size: 0.875rem;
      font-weight: 500;
      background: ${colors.button};
      color: ${colors.buttonColor};
      border: none;
      border-radius: 8px;
      cursor: pointer;
      transition: background 0.15s;
    }
    button:hover { background: ${colors.buttonHover}; }
    button:focus {
      outline: 1px solid ${colors.focusBorder};
      outline-offset: 2px;
    }
    .error {
      color: ${colors.error};
      font-size: 0.8125rem;
      margin-top: -0.25rem;
    }
    svg {
      width: 52px;
      height: 20px;
      display: block;
      position: fixed;
      left: 50%;
      bottom: 30px;
      transform: translateX(-50%);

      > g {
        fill: ${colors.heading};
      }
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
      ${error ? `<p class="error">Incorrect password.</p>` : ''}
      <button type="submit">${escapeHtml(buttonText)}</button>
    </form>
  </div>
  <svg xmlns="http://www.w3.org/2000/svg" width="65" height="25" viewBox="0 0 65 25"><g transform="translate(0 .682)"><path d="M33.4851,13.264255 C33.452,12.900255 33.4351,12.531555 33.4351,12.158955 C33.4351,8.046655 35.4935,4.411185 38.6441,2.210715 C38.709,2.165385 38.7744,2.120655 38.8402,2.076555 C40.7969,0.765525 43.1556,1.8189894e-12 45.6946,1.8189894e-12 C48.3191,1.8189894e-12 50.7509,0.817905 52.7452,2.210715 C55.8958,4.411185 57.9542,8.046645 57.9542,12.158955 C57.9542,12.578655 57.9327,12.993355 57.8909,13.402155 C57.8181,14.112955 57.6836,14.805755 57.4927,15.474955 C56.0373,20.578455 51.3063,24.317855 45.6946,24.317855 L26.6716,24.317855 C29.8297,22.340055 32.1637,19.185355 33.0474,15.474955 L45.6946,15.474955 C47.5412,15.474955 49.0382,13.990355 49.0382,12.158955 C49.0382,10.327555 47.5412,8.842855 45.6946,8.842855 C43.8481,8.842855 42.3511,10.327555 42.3511,12.158955 C42.3511,12.546555 42.4182,12.918555 42.5414,13.264255 L33.4851,13.264255 Z"/><path d="M30.7446,15.474955 C29.2892,20.578455 24.5582,24.317855 18.9466,24.317855 L0,24.317855 L0,15.474955 L18.9466,15.474955 C20.7931,15.474955 22.2901,13.990355 22.2901,12.158955 C22.2901,10.327555 20.7931,8.842855 18.9466,8.842855 C17.1,8.842855 15.6031,10.327555 15.6031,12.158955 C15.6031,12.546555 15.6701,12.918555 15.7933,13.264255 L6.737,13.264255 C6.70392,12.900255 6.68702,12.531555 6.68702,12.158955 C6.68702,8.046655 8.74539,4.411185 11.896,2.210715 C11.9609,2.165385 12.0263,2.120655 12.0921,2.076555 C14.0488,0.765525 16.4075,1.8189894e-12 18.9466,1.8189894e-12 C21.571,1.8189894e-12 24.0029,0.817905 25.9971,2.210715 C29.1477,4.411185 31.2061,8.046645 31.2061,12.158955 C31.2061,12.531555 31.1892,12.900255 31.1561,13.264255 C31.1519,13.310255 31.1475,13.356255 31.1428,13.402155 C31.07,14.112955 30.9355,14.805755 30.7446,15.474955 Z"/><path d="M4.45801 12.158955C4.45801 12.530855 4.47226 12.899455 4.50024 13.264255L0 13.264255 0 2.210715 8.49156 2.210715C5.99336 4.792595 4.45801 8.297935 4.45801 12.158955ZM32.3206 6.622415C31.6259 4.973535 30.6301 3.480455 29.4016 2.210715L35.2397 2.210715C34.0111 3.480455 33.0154 4.973535 32.3206 6.622415ZM60.1832 12.158955C60.1832 12.530855 60.1689 12.899455 60.141 13.264255L64.6412 13.264255 64.6412 2.210715 56.1496 2.210715C58.6478 4.792595 60.1832 8.297935 60.1832 12.158955ZM59.7955 15.474955C58.9118 19.185355 56.5778 22.340055 53.4197 24.317855L64.6412 24.317855 64.6412 15.474955 59.7955 15.474955Z"/></g></svg>
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
