// Ethos logo SVG React component
export default function EthosLogo({ style, className }) {
  return (
    <svg
      width="38"
      height="38"
      viewBox="0 0 720 489"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      style={style}
      className={className}
    >
      {/* Three horizontal bars with white stroke */}
      <rect x="360" y="88" width="210" height="52" fill="#232427" stroke="#eaeaea" strokeWidth="2" />
      <rect x="360" y="186" width="210" height="52" fill="#232427" stroke="#eaeaea" strokeWidth="2" />
      <rect x="360" y="284" width="210" height="52" fill="#232427" stroke="#eaeaea" strokeWidth="2" />
      {/* Left-side curve with white stroke */}
      <path d="M360 88 Q216 244.5 360 401" stroke="#232427" strokeWidth="52" fill="none" />
      <path d="M360 88 Q216 244.5 360 401" stroke="#eaeaea" strokeWidth="2" fill="none" />
    </svg>
  );
}
