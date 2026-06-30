import React from 'react';

export const AIAssistantIcon: React.FC<{ size?: number }> = ({ size = 24 }) => (
  <svg
    className="ai-orb-icon"
    width={size}
    height={size}
    viewBox="0 0 64 64"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    aria-hidden="true"
  >
    <defs>
      <radialGradient
        id="ai-orb-halo"
        cx="0"
        cy="0"
        r="1"
        gradientUnits="userSpaceOnUse"
        gradientTransform="translate(32 33) rotate(90) scale(31)"
      >
        <stop offset="0.5" stopColor="#FFFFFF" stopOpacity="0" />
        <stop offset="0.72" stopColor="#E0FFFF" stopOpacity="0.85" />
        <stop offset="0.88" stopColor="#7EE8FF" stopOpacity="0.95" />
        <stop offset="1" stopColor="#4FC3F7" stopOpacity="0.75" />
      </radialGradient>
      <radialGradient
        id="ai-orb-outer-glow"
        cx="0"
        cy="0"
        r="1"
        gradientUnits="userSpaceOnUse"
        gradientTransform="translate(32 32) scale(32)"
      >
        <stop offset="0.7" stopColor="#00E5FF" stopOpacity="0" />
        <stop offset="0.85" stopColor="#00D4FF" stopOpacity="0.3" />
        <stop offset="1" stopColor="#00B0FF" stopOpacity="0.5" />
      </radialGradient>
      <radialGradient
        id="ai-orb-shell"
        cx="0"
        cy="0"
        r="1"
        gradientUnits="userSpaceOnUse"
        gradientTransform="translate(24 18) rotate(48) scale(43 39)"
      >
        <stop offset="0" stopColor="#FFFFFF" />
        <stop offset="0.35" stopColor="#F0FDFF" />
        <stop offset="0.65" stopColor="#D6F7FF" />
        <stop offset="0.85" stopColor="#9EE8F5" />
        <stop offset="1" stopColor="#5BC9E0" />
      </radialGradient>
      <linearGradient
        id="ai-orb-visor"
        x1="17"
        y1="19"
        x2="46"
        y2="48"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#050D1A" />
        <stop offset="0.5" stopColor="#08223D" />
        <stop offset="1" stopColor="#0D4A75" />
      </linearGradient>
      <linearGradient
        id="ai-orb-ear"
        x1="6"
        y1="23"
        x2="13"
        y2="41"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#DDFBFF" />
        <stop offset="0.48" stopColor="#53BFEF" />
        <stop offset="1" stopColor="#254C9C" />
      </linearGradient>
      <linearGradient
        id="ai-orb-ear-right"
        x1="51"
        y1="22"
        x2="60"
        y2="42"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#E5FDFF" />
        <stop offset="0.5" stopColor="#64C9F2" />
        <stop offset="1" stopColor="#284C9B" />
      </linearGradient>
      <linearGradient
        id="ai-eye-glow"
        x1="25"
        y1="25"
        x2="28"
        y2="38"
        gradientUnits="userSpaceOnUse"
      >
        <stop stopColor="#E0FFFF" />
        <stop offset="0.5" stopColor="#4DD0E1" />
        <stop offset="1" stopColor="#00ACC1" />
      </linearGradient>
      <filter
        id="ai-orb-soft-glow"
        x="-50%"
        y="-50%"
        width="200%"
        height="200%"
        colorInterpolationFilters="sRGB"
      >
        <feGaussianBlur stdDeviation="3" result="blur" />
        <feColorMatrix
          in="blur"
          type="matrix"
          values="0 0 0 0 0.2  0 0 0 0 0.75  0 0 0 0 1  0 0 0 0.85 0"
        />
        <feBlend in="SourceGraphic" mode="screen" />
      </filter>
      <filter
        id="ai-orb-strong-glow"
        x="-60%"
        y="-60%"
        width="220%"
        height="220%"
        colorInterpolationFilters="sRGB"
      >
        <feGaussianBlur stdDeviation="4.5" result="blur" />
        <feColorMatrix
          in="blur"
          type="matrix"
          values="0 0 0 0 0.1  0 0 0 0 0.65  0 0 0 0 1  0 0 0 0.9 0"
        />
        <feBlend in="SourceGraphic" mode="screen" />
      </filter>
    </defs>
    <circle cx="32" cy="32" r="31" fill="url(#ai-orb-outer-glow)" className="ai-glow-outer" />
    <circle cx="32" cy="32" r="30" fill="url(#ai-orb-halo)" className="ai-glow-halo" />
    <circle
      cx="32"
      cy="32"
      r="27.5"
      stroke="#E0FFFF"
      strokeWidth="3.4"
      filter="url(#ai-orb-soft-glow)"
      className="ai-glow-ring"
    />
    <circle
      cx="32"
      cy="32"
      r="25"
      fill="none"
      stroke="#80DEEA"
      strokeWidth="1"
      strokeOpacity="0.4"
      className="ai-glow-inner-ring"
    />
    <path
      d="M11.6 26.6C12.3 22.9 14.2 21.3 17.7 21.8L16.4 40.6C12.6 40.8 10.4 38.9 10 35.2C9.7 32.4 10.6 29.8 11.6 26.6Z"
      fill="url(#ai-orb-ear)"
      stroke="#164C86"
      strokeWidth="1.3"
    />
    <path
      d="M52.4 27C53.3 23.5 55.9 22.1 58.4 24.2C60.7 26.2 61.1 31.6 59.2 36.2C57.5 40.5 54.1 43.1 50.9 41.4L52.4 27Z"
      fill="url(#ai-orb-ear-right)"
      stroke="#174B86"
      strokeWidth="1.3"
    />
    <ellipse
      cx="32"
      cy="33"
      rx="22.8"
      ry="24.1"
      fill="url(#ai-orb-shell)"
      stroke="#DDEAE8"
      strokeWidth="1.1"
      filter="url(#ai-orb-soft-glow)"
    />
    <path
      d="M15.6 29.2C16.7 19.4 23.8 14.1 34.8 15.5C46.8 17 52.5 25.2 49.2 37.4C47.3 44.3 41.3 48.5 32.3 48.1C21.4 47.7 14.5 39.7 15.6 29.2Z"
      fill="url(#ai-orb-visor)"
      stroke="#EEF9F9"
      strokeWidth="2.3"
    />
    <path
      d="M19.1 29.8C20 22.1 25.5 18 34 19.1C43.2 20.3 47.6 26.6 45.2 36C43.7 41.4 39 44.7 32 44.4C23.6 44.1 18.2 38.1 19.1 29.8Z"
      stroke="#173B55"
      strokeOpacity="0.7"
      strokeWidth="0.9"
    />
    <ellipse
      cx="25.3"
      cy="31.4"
      rx="3.6"
      ry="7.5"
      transform="rotate(11 25.3 31.4)"
      fill="url(#ai-eye-glow)"
      filter="url(#ai-orb-strong-glow)"
      className="ai-eye-left"
    />
    <ellipse
      cx="41.6"
      cy="34.2"
      rx="3.8"
      ry="7.3"
      transform="rotate(12 41.6 34.2)"
      fill="url(#ai-eye-glow)"
      filter="url(#ai-orb-strong-glow)"
      className="ai-eye-right"
    />
    <circle cx="25.3" cy="30" r="1.8" fill="#FFFFFF" className="ai-eye-highlight-left" />
    <circle cx="41.6" cy="32.8" r="1.8" fill="#FFFFFF" className="ai-eye-highlight-right" />
    <path
      d="M29 39.2C31.2 41.1 34.4 41.5 37 39.9"
      stroke="#B9FFFF"
      strokeWidth="2.2"
      strokeLinecap="round"
      filter="url(#ai-orb-soft-glow)"
    />
    <ellipse
      cx="23.5"
      cy="22.4"
      rx="2.6"
      ry="1.6"
      transform="rotate(-37 23.5 22.4)"
      fill="#FFFFFF"
    />
    <ellipse
      cx="18.8"
      cy="25.4"
      rx="2.3"
      ry="1.3"
      transform="rotate(-45 18.8 25.4)"
      fill="#FFFFFF"
      fillOpacity="0.95"
    />
    <circle cx="18.6" cy="35.2" r="1.3" fill="#FFFFFF" fillOpacity="0.9" />
    <path
      d="M43 15.7C50.9 20.1 54.7 28.7 52.3 38.5"
      stroke="#FFFFFF"
      strokeOpacity="0.6"
      strokeWidth="1.8"
      strokeLinecap="round"
    />
    <path
      d="M43.2 50.2C48.5 47.9 52.6 42.9 54 37"
      stroke="#6BCFEA"
      strokeOpacity="0.45"
      strokeWidth="2.2"
      strokeLinecap="round"
    />
    <circle
      cx="32"
      cy="32"
      r="29"
      fill="none"
      stroke="#4DD0E1"
      strokeWidth="0.8"
      strokeOpacity="0.3"
      strokeDasharray="3 5"
      className="ai-orbit-ring"
    />
  </svg>
);

export default AIAssistantIcon;
