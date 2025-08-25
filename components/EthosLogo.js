// Ethos logo SVG React component
export default function EthosLogo({ style, className }) {
  return (
    <svg
      width="32"
      height="32"
      viewBox="0 0 720 489"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
      className={className}
    >
      <rect x="360" y="88" width="210" height="52" fill="none" stroke="#c9d1d9" strokeWidth="12" />
      <rect x="360" y="186" width="210" height="52" fill="none" stroke="#c9d1d9" strokeWidth="12" />
      <rect x="360" y="284" width="210" height="52" fill="none" stroke="#c9d1d9" strokeWidth="12" />
      <path d="M360 88 Q216 244.5 360 401" stroke="#c9d1d9" strokeWidth="12" fill="none" />
    </svg>
  );
}
