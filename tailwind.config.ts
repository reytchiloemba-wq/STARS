import type { Config } from 'tailwindcss';

// STARS design tokens — derived from the brand mark description:
// deep black ground, aerodynamic "S" with an ascending motion, a central star,
// cyan → electric blue → violet → magenta gradient, a sparing warm-orange accent.
const config: Config = {
  darkMode: ['class'],
  content: ['./src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        background: 'hsl(var(--background))',
        surface: 'hsl(var(--surface))',
        'surface-raised': 'hsl(var(--surface-raised))',
        border: 'hsl(var(--border))',
        foreground: 'hsl(var(--foreground))',
        muted: 'hsl(var(--muted))',
        'muted-foreground': 'hsl(var(--muted-foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        accent: {
          cyan: '#22D3EE',
          blue: '#3B82F6',
          violet: '#8B5CF6',
          magenta: '#D946EF',
          orange: '#FB923C',
        },
        success: '#34D399',
        warning: '#FBBF24',
        danger: '#F87171',
      },
      backgroundImage: {
        'start-gradient': 'linear-gradient(90deg, #22D3EE 0%, #3B82F6 35%, #8B5CF6 70%, #D946EF 100%)',
        'start-glow': 'radial-gradient(circle at 50% 0%, rgba(139,92,246,0.25), transparent 60%)',
      },
      borderRadius: {
        xl: '1rem',
        '2xl': '1.25rem',
      },
      fontFamily: {
        sans: ['var(--font-inter)', 'Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        display: ['var(--font-display)', 'Plus Jakarta Sans', 'ui-sans-serif', 'system-ui', 'sans-serif'],
      },
      boxShadow: {
        'glow-cyan': '0 0 25px -5px rgba(34, 211, 238, 0.3)',
        'glow-violet': '0 0 25px -5px rgba(139, 92, 246, 0.3)',
        'glow-magenta': '0 0 25px -5px rgba(217, 70, 239, 0.3)',
      },
      animation: {
        'pulse-subtle': 'pulseSubtle 3s ease-in-out infinite',
        float: 'float 6s ease-in-out infinite',
        shimmer: 'shimmer 2.5s linear infinite',
      },
      keyframes: {
        pulseSubtle: {
          '0%, 100%': { opacity: '1' },
          '50%': { opacity: '0.75' },
        },
        float: {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%': { transform: 'translateY(-6px)' },
        },
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
      },
    },
  },
  plugins: [],
};

export default config;
