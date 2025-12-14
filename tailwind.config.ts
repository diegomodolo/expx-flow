import type { Config } from "tailwindcss";

export default {
	darkMode: ["class"],
	content: [
		"./pages/**/*.{ts,tsx}",
		"./components/**/*.{ts,tsx}",
		"./app/**/*.{ts,tsx}",
		"./src/**/*.{ts,tsx}",
	],
	prefix: "",
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			fontFamily: {
				sans: ['Google Sans', 'Inter', 'Roboto', 'system-ui', 'sans-serif'],
				display: ['Google Sans', 'Inter', 'sans-serif'],
			},
			fontSize: {
				// Google-style typography system
				'headline-lg': ['1.75rem', { lineHeight: '2.25rem', fontWeight: '500', letterSpacing: '-0.02em' }],
				'headline-md': ['1.5rem', { lineHeight: '2rem', fontWeight: '500', letterSpacing: '-0.02em' }],
				'headline-sm': ['1.25rem', { lineHeight: '1.75rem', fontWeight: '500', letterSpacing: '-0.01em' }],
				'title-lg': ['1.125rem', { lineHeight: '1.75rem', fontWeight: '500' }],
				'title-md': ['1rem', { lineHeight: '1.5rem', fontWeight: '500' }],
				'title-sm': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '500' }],
				'body-lg': ['1rem', { lineHeight: '1.5rem', fontWeight: '400' }],
				'body-md': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '400' }],
				'body-sm': ['0.75rem', { lineHeight: '1rem', fontWeight: '400' }],
				'label-lg': ['0.875rem', { lineHeight: '1.25rem', fontWeight: '500' }],
				'label-md': ['0.75rem', { lineHeight: '1rem', fontWeight: '500' }],
				'label-sm': ['0.6875rem', { lineHeight: '1rem', fontWeight: '500' }],
				// Legacy sizes for compatibility
				'report-title': ['2rem', { lineHeight: '1.2', fontWeight: '500' }],
				'report-subtitle': ['1rem', { lineHeight: '1.5', fontWeight: '500' }],
				'report-description': ['0.875rem', { lineHeight: '1.4', fontWeight: '400' }],
				'report-label': ['0.75rem', { lineHeight: '1.3', fontWeight: '500' }],
				'report-caption': ['0.75rem', { lineHeight: '1.3', fontWeight: '400' }],
				'dashboard-title': ['1.5rem', { lineHeight: '1.2', fontWeight: '500' }],
				'card-title': ['1.125rem', { lineHeight: '1.3', fontWeight: '500' }],
				'card-content': ['0.875rem', { lineHeight: '1.4', fontWeight: '400' }],
			},
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))',
					glow: 'hsl(var(--primary-glow))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				muted: {
					DEFAULT: 'hsl(var(--muted))',
					foreground: 'hsl(var(--muted-foreground))'
				},
				accent: {
					DEFAULT: 'hsl(var(--accent))',
					foreground: 'hsl(var(--accent-foreground))'
				},
				popover: {
					DEFAULT: 'hsl(var(--popover))',
					foreground: 'hsl(var(--popover-foreground))'
				},
				card: {
					DEFAULT: 'hsl(var(--card))',
					foreground: 'hsl(var(--card-foreground))'
				},
				sidebar: {
					DEFAULT: 'hsl(var(--sidebar-background))',
					foreground: 'hsl(var(--sidebar-foreground))',
					primary: 'hsl(var(--sidebar-primary))',
					'primary-foreground': 'hsl(var(--sidebar-primary-foreground))',
					accent: 'hsl(var(--sidebar-accent))',
					'accent-foreground': 'hsl(var(--sidebar-accent-foreground))',
					border: 'hsl(var(--sidebar-border))',
					ring: 'hsl(var(--sidebar-ring))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				danger: {
					DEFAULT: 'hsl(var(--danger))',
					foreground: 'hsl(var(--danger-foreground))'
				},
				'metric-positive': 'hsl(var(--metric-positive))',
				'metric-negative': 'hsl(var(--metric-negative))',
				'metric-neutral': 'hsl(var(--metric-neutral))',
				'gradient-primary': 'var(--gradient-primary)',
				'gradient-hero': 'var(--gradient-hero)',
				'gradient-accent': 'var(--gradient-accent)',
				// Status colors
				'status-excellent': {
					DEFAULT: 'hsl(var(--status-excellent))',
					foreground: 'hsl(var(--status-excellent-foreground))'
				},
				'status-attention': {
					DEFAULT: 'hsl(var(--status-attention))',
					foreground: 'hsl(var(--status-attention-foreground))'
				},
				'status-emergency': {
					DEFAULT: 'hsl(var(--status-emergency))',
					foreground: 'hsl(var(--status-emergency-foreground))'
				},
				'status-inactive': {
					DEFAULT: 'hsl(var(--status-inactive))',
					foreground: 'hsl(var(--status-inactive-foreground))'
				},
				// Google-specific semantic colors
				'google-blue': {
					50: 'hsl(217 91% 97%)',
					100: 'hsl(217 91% 93%)',
					200: 'hsl(217 91% 85%)',
					300: 'hsl(217 91% 75%)',
					400: 'hsl(217 91% 65%)',
					500: 'hsl(217 91% 60%)',
					600: 'hsl(217 91% 50%)',
					700: 'hsl(217 91% 40%)',
				},
				'google-green': {
					50: 'hsl(142 71% 97%)',
					100: 'hsl(142 71% 90%)',
					500: 'hsl(142 71% 45%)',
					600: 'hsl(142 71% 35%)',
				},
				'google-red': {
					50: 'hsl(4 90% 97%)',
					100: 'hsl(4 90% 90%)',
					500: 'hsl(4 90% 58%)',
					600: 'hsl(4 90% 48%)',
				},
				'google-yellow': {
					50: 'hsl(36 100% 97%)',
					100: 'hsl(36 100% 90%)',
					500: 'hsl(36 100% 50%)',
					600: 'hsl(36 100% 40%)',
				},
			},
			borderRadius: {
				lg: 'var(--radius)',
				md: 'calc(var(--radius) - 2px)',
				sm: 'calc(var(--radius) - 4px)',
				'xl': '1rem',
				'2xl': '1.25rem',
			},
			boxShadow: {
				'google-sm': '0 1px 2px 0 rgb(60 64 67 / 0.3), 0 1px 3px 1px rgb(60 64 67 / 0.15)',
				'google-md': '0 1px 2px 0 rgb(60 64 67 / 0.3), 0 2px 6px 2px rgb(60 64 67 / 0.15)',
				'google-lg': '0 1px 3px 0 rgb(60 64 67 / 0.3), 0 4px 8px 3px rgb(60 64 67 / 0.15)',
				'google-hover': '0 1px 3px 0 rgb(60 64 67 / 0.3), 0 4px 8px 3px rgb(60 64 67 / 0.15)',
			},
			keyframes: {
				'accordion-down': {
					from: {
						height: '0'
					},
					to: {
						height: 'var(--radix-accordion-content-height)'
					}
				},
				'accordion-up': {
					from: {
						height: 'var(--radix-accordion-content-height)'
					},
					to: {
						height: '0'
					}
				}
			},
			animation: {
				'accordion-down': 'accordion-down 0.2s ease-out',
				'accordion-up': 'accordion-up 0.2s ease-out'
			}
		}
	},
	plugins: [require("tailwindcss-animate")],
} satisfies Config;