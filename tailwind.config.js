import { setupInspiraUI } from '@inspira-ui/plugins'
import tailwindcssAnimate from 'tailwindcss-animate'

/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{vue,js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      // 自定义颜色系统
      colors: {
        // 主色调
        primary: {
          50: 'rgb(var(--color-primary-50) / <alpha-value>)',
          100: 'rgb(var(--color-primary-100) / <alpha-value>)',
          200: 'rgb(var(--color-primary-200) / <alpha-value>)',
          300: 'rgb(var(--color-primary-300) / <alpha-value>)',
          400: 'rgb(var(--color-primary-400) / <alpha-value>)',
          500: 'rgb(var(--color-primary-500) / <alpha-value>)',
          600: 'rgb(var(--color-primary-600) / <alpha-value>)',
          700: 'rgb(var(--color-primary-700) / <alpha-value>)',
          800: 'rgb(var(--color-primary-800) / <alpha-value>)',
          900: 'rgb(var(--color-primary-900) / <alpha-value>)',
          950: 'rgb(var(--color-primary-950) / <alpha-value>)',
        },
        // 背景色
        bg: {
          primary: 'rgb(var(--bg-primary) / <alpha-value>)',
          secondary: 'rgb(var(--bg-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--bg-tertiary) / <alpha-value>)',
          accent: 'rgb(var(--bg-accent) / <alpha-value>)',
        },
        // 文本色
        text: {
          primary: 'rgb(var(--text-primary) / <alpha-value>)',
          secondary: 'rgb(var(--text-secondary) / <alpha-value>)',
          tertiary: 'rgb(var(--text-tertiary) / <alpha-value>)',
          accent: 'rgb(var(--text-accent) / <alpha-value>)',
        },
        // 边框色
        border: {
          DEFAULT: 'rgb(var(--border-color) / <alpha-value>)',
          light: 'rgb(var(--border-light) / <alpha-value>)',
          dark: 'rgb(var(--border-dark) / <alpha-value>)',
        },
      },
      // 字体系统
      fontFamily: {
        sans: [
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Oxygen',
          'Ubuntu',
          'Cantarell',
          'sans-serif',
        ],
        mono: [
          'JetBrains Mono',
          'Fira Code',
          'Monaco',
          'Consolas',
          'Liberation Mono',
          'Courier New',
          'monospace',
        ],
        serif: [
          'Crimson Text',
          'Georgia',
          'Times New Roman',
          'serif',
        ],
      },
      // 间距系统
      spacing: {
        '18': '4.5rem',
        '88': '22rem',
        '128': '32rem',
      },
      // 动画系统
      animation: {
        'fade-in': 'fadeIn 0.5s ease-in-out',
        'fade-out': 'fadeOut 0.5s ease-in-out',
        'slide-up': 'slideUp 0.3s ease-out',
        'slide-down': 'slideDown 0.3s ease-out',
        'scale-in': 'scaleIn 0.2s ease-out',
        'bounce-gentle': 'bounceGentle 0.6s ease-out',
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
      // 关键帧
      keyframes: {
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        fadeOut: {
          '0%': { opacity: '1' },
          '100%': { opacity: '0' },
        },
        slideUp: {
          '0%': { transform: 'translateY(10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        slideDown: {
          '0%': { transform: 'translateY(-10px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
        scaleIn: {
          '0%': { transform: 'scale(0.95)', opacity: '0' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        bounceGentle: {
          '0%, 20%, 53%, 80%, 100%': { transform: 'translate3d(0,0,0)' },
          '40%, 43%': { transform: 'translate3d(0, -8px, 0)' },
          '70%': { transform: 'translate3d(0, -4px, 0)' },
          '90%': { transform: 'translate3d(0, -2px, 0)' },
        },
      },
      // 阴影系统
      boxShadow: {
        'soft': '0 2px 8px 0 rgba(0, 0, 0, 0.08)',
        'medium': '0 4px 16px 0 rgba(0, 0, 0, 0.12)',
        'strong': '0 8px 32px 0 rgba(0, 0, 0, 0.16)',
        'glow': '0 0 20px rgba(var(--color-primary-500), 0.3)',
      },
      // 边框圆角
      borderRadius: {
        'xl': '0.75rem',
        '2xl': '1rem',
        '3xl': '1.5rem',
      },
      // 断点系统
      screens: {
        'xs': '475px',
        '3xl': '1680px',
      },
      // 排版系统
      typography: {
        DEFAULT: {
          css: {
            maxWidth: 'none',
            color: 'rgb(var(--text-primary))',
            lineHeight: '1.7',
            h1: {
              color: 'rgb(var(--text-primary))',
              fontWeight: '700',
              fontSize: '2.25rem',
              lineHeight: '2.5rem',
              marginTop: '0',
              marginBottom: '1rem',
            },
            h2: {
              color: 'rgb(var(--text-primary))',
              fontWeight: '600',
              fontSize: '1.875rem',
              lineHeight: '2.25rem',
              marginTop: '2rem',
              marginBottom: '1rem',
            },
            h3: {
              color: 'rgb(var(--text-primary))',
              fontWeight: '600',
              fontSize: '1.5rem',
              lineHeight: '2rem',
              marginTop: '1.5rem',
              marginBottom: '0.5rem',
            },
            p: {
              marginTop: '1rem',
              marginBottom: '1rem',
            },
            a: {
              color: 'rgb(var(--color-primary-600))',
              textDecoration: 'none',
              fontWeight: '500',
              '&:hover': {
                color: 'rgb(var(--color-primary-700))',
                textDecoration: 'underline',
              },
            },
            code: {
              color: 'rgb(var(--text-primary))',
              backgroundColor: 'rgb(var(--bg-secondary))',
              padding: '0.125rem 0.25rem',
              borderRadius: '0.25rem',
              fontSize: '0.875em',
              fontWeight: '500',
            },
            pre: {
              backgroundColor: 'rgb(var(--bg-secondary))',
              color: 'rgb(var(--text-primary))',
              borderRadius: '0.5rem',
              padding: '1rem',
              overflow: 'auto',
            },
            blockquote: {
              borderLeftColor: 'rgb(var(--color-primary-500))',
              borderLeftWidth: '4px',
              paddingLeft: '1rem',
              fontStyle: 'italic',
              color: 'rgb(var(--text-secondary))',
            },
          },
        },
      },
    },
  },
  plugins: [
    setupInspiraUI,
    tailwindcssAnimate,
  ],
}