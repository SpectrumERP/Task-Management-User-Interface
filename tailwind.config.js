/** @type {import('tailwindcss').Config} */
module.exports = {
	darkMode: ["class"],
	content: [
		'./pages/**/*.{ts,tsx}',
		'./components/**/*.{ts,tsx}',
		'./app/**/*.{ts,tsx}',
		'./src/**/*.{ts,tsx}',
	],
	theme: {
		container: {
			center: true,
			padding: '2rem',
			screens: {
				'2xl': '1400px'
			}
		},
		extend: {
			colors: {
				border: 'hsl(var(--border))',
				input: 'hsl(var(--input))',
				ring: 'hsl(var(--ring))',
				background: 'hsl(var(--background))',
				foreground: 'hsl(var(--foreground))',
				primary: {
					DEFAULT: 'hsl(var(--primary))',
					foreground: 'hsl(var(--primary-foreground))'
				},
				secondary: {
					DEFAULT: 'hsl(var(--secondary))',
					foreground: 'hsl(var(--secondary-foreground))'
				},
				destructive: {
					DEFAULT: 'hsl(var(--destructive))',
					foreground: 'hsl(var(--destructive-foreground))'
				},
				warning: {
					DEFAULT: 'hsl(var(--warning))',
					foreground: 'hsl(var(--warning-foreground))'
				},
				success: {
					DEFAULT: 'hsl(var(--success))',
					foreground: 'hsl(var(--success-foreground))'
				},
				info: {
					DEFAULT: 'hsl(var(--info))',
					foreground: 'hsl(var(--info-foreground))'
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
				/** App chrome — single source via CSS --tm-* */
				tm: {
					page: 'var(--tm-page)',
					surface: 'var(--tm-surface)',
					elevated: 'var(--tm-elevated)',
					muted: 'var(--tm-muted)',
					border: 'var(--tm-border)',
					tint: 'var(--tm-tint)',
					input: 'var(--tm-input)',
					'input-fg': 'var(--tm-input-fg)',
					chrome: 'var(--tm-chrome)',
					sidebar: 'var(--tm-sidebar)',
					placeholder: 'var(--tm-placeholder)',
					overlay: 'var(--tm-overlay)',
					'row-odd': 'var(--tm-row-odd)',
					'row-even': 'var(--tm-row-even)',
					'row-hover': 'var(--tm-row-hover)',
				},
				/** Brand driven by brandConfig → CSS vars */
				brand: {
					DEFAULT: 'var(--brand)',
					hover: 'var(--brand-hover)',
					foreground: 'var(--brand-foreground)',
					soft: 'var(--brand-soft)',
					muted: 'var(--brand-muted)',
				},
				'accent-warm': {
					DEFAULT: 'var(--accent-warm)',
					foreground: 'var(--accent-warm-foreground)',
				},
				/** Focus ring color (alias of brand; use ring-focus / ring-brand) */
				focus: 'var(--focus-ring)',
			},
			borderRadius: {
				sm: 'var(--radius-sm)',
				md: 'var(--radius-md)',
				lg: 'var(--radius-lg)',
				xl: 'var(--radius-xl)',
				'2xl': 'var(--radius-2xl)',
				card: 'var(--card-radius)',
			},
			boxShadow: {
				'tm-sm': 'var(--tm-shadow-sm)',
				tm: 'var(--tm-shadow)',
				'tm-lg': 'var(--tm-shadow-lg)',
				'tm-control': 'var(--tm-control-shadow)',
			},
			height: {
				'control-sm': 'var(--control-h-sm)',
				'control-md': 'var(--control-h-md)',
			},
			minHeight: {
				'control-sm': 'var(--control-h-sm)',
				'control-md': 'var(--control-h-md)',
			},
			width: {
				'icon-sm': 'var(--icon-sm)',
				'icon-md': 'var(--icon-md)',
				'icon-lg': 'var(--icon-lg)',
			},
			size: {
				'icon-sm': 'var(--icon-sm)',
				'icon-md': 'var(--icon-md)',
				'icon-lg': 'var(--icon-lg)',
			},
			fontSize: {
				caption: ['0.6875rem', { lineHeight: '1rem', fontWeight: '500' }], /* 11px */
				label: ['0.75rem', { lineHeight: '1rem', fontWeight: '500' }], /* 12px */
				body: ['0.8125rem', { lineHeight: '1.25rem' }], /* 13px */
				'body-large': ['0.875rem', { lineHeight: '1.375rem' }], /* 14px */
				title: ['1rem', { lineHeight: '1.5rem', fontWeight: '700' }], /* 16px */
				'modal-title': ['1.125rem', { lineHeight: '1.5rem', fontWeight: '600' }], /* 18px */
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
}
