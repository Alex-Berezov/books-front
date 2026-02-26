import type { SupportedLang } from './lang';
import styles from './FlagIcon.module.scss';

interface FlagIconProps {
  /** Width/height in pixels */
  size?: number;
}

/**
 * Inline SVG flag icons — cross-platform (works on Windows, Linux, macOS).
 * Emoji flags (🇬🇧) do not render on Windows, so we use lightweight SVGs instead.
 */

const GB = ({ size = 16 }: FlagIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 60 36"
    width={size}
    height={size * (36 / 60)}
    className={styles.flagIcon}
    aria-label="English"
  >
    <clipPath id="gb-clip">
      <rect width="60" height="36" />
    </clipPath>
    <g clipPath="url(#gb-clip)">
      <rect width="60" height="36" fill="#012169" />
      <path d="M0,0 L60,36 M60,0 L0,36" stroke="#fff" strokeWidth="7" />
      <path
        d="M0,0 L60,36 M60,0 L0,36"
        stroke="#C8102E"
        strokeWidth="4.5"
        clipPath="url(#gb-clip)"
      />
      <path d="M30,0 V36 M0,18 H60" stroke="#fff" strokeWidth="12" />
      <path d="M30,0 V36 M0,18 H60" stroke="#C8102E" strokeWidth="7" />
    </g>
  </svg>
);

const ES = ({ size = 16 }: FlagIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 750 500"
    width={size}
    height={size * (500 / 750)}
    className={styles.flagIcon}
    aria-label="Español"
  >
    <rect width="750" height="500" fill="#c60b1e" />
    <rect width="750" height="250" y="125" fill="#ffc400" />
  </svg>
);

const FR = ({ size = 16 }: FlagIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 3 2"
    width={size}
    height={size * (2 / 3)}
    className={styles.flagIcon}
    aria-label="Français"
  >
    <rect width="1" height="2" fill="#002395" />
    <rect width="1" height="2" x="1" fill="#fff" />
    <rect width="1" height="2" x="2" fill="#ED2939" />
  </svg>
);

const PT = ({ size = 16 }: FlagIconProps) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 600 400"
    width={size}
    height={size * (400 / 600)}
    className={styles.flagIcon}
    aria-label="Português"
  >
    <rect width="600" height="400" fill="#006600" />
    <rect width="360" height="400" x="240" fill="#FF0000" />
    <circle cx="240" cy="200" r="60" fill="#FFCC00" />
  </svg>
);

export const FLAG_COMPONENTS: Record<SupportedLang, React.ReactNode> = {
  en: <GB />,
  es: <ES />,
  fr: <FR />,
  pt: <PT />,
};
