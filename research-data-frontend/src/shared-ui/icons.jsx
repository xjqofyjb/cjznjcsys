const base = {
  fill: "none",
  stroke: "currentColor",
  strokeWidth: 1.8,
  strokeLinecap: "round",
  strokeLinejoin: "round",
};

function wrap(children, size, style) {
  return (
    <svg viewBox="0 0 24 24" width={size} height={size} style={style} {...base}>
      {children}
    </svg>
  );
}

export function Icon({ type, size = 20, style, color = "currentColor" }) {
  const icons = {
    home: wrap(
      <>
        <path d="M3 10.5 12 3l9 7.5" />
        <path d="M5 9.8V21h14V9.8" />
        <path d="M10 21v-6h4v6" />
      </>,
      size,
      style,
    ),
    data: wrap(
      <>
        <path d="M4 5h16v14H4z" />
        <path d="M8 15V9" />
        <path d="M12 15V7" />
        <path d="M16 15v-4" />
      </>,
      size,
      style,
    ),
    folder: wrap(
      <>
        <path d="M3 7a2 2 0 0 1 2-2h4l2 2h8a2 2 0 0 1 2 2v8a3 3 0 0 1-3 3H6a3 3 0 0 1-3-3Z" />
      </>,
      size,
      style,
    ),
    chevronDown: wrap(<path d="m6 9 6 6 6-6" />, size, style),
    chevronRight: wrap(<path d="m9 6 6 6-6 6" />, size, style),
    arrowRight: wrap(
      <>
        <path d="M5 12h14" />
        <path d="m13 6 6 6-6 6" />
      </>,
      size,
      style,
    ),
    users: wrap(
      <>
        <circle cx="9" cy="8" r="3" />
        <path d="M3.5 19a5.5 5.5 0 0 1 11 0" />
        <path d="M16 5a3 3 0 0 1 0 6" />
        <path d="M18 19a4 4 0 0 0-2.2-3.6" />
      </>,
      size,
      style,
    ),
    logout: wrap(
      <>
        <path d="M10 4H5a2 2 0 0 0-2 2v12a2 2 0 0 0 2 2h5" />
        <path d="M14 8l5 4-5 4" />
        <path d="M19 12H9" />
      </>,
      size,
      style,
    ),
    upload: wrap(
      <>
        <path d="M12 15V4" />
        <path d="m7 9 5-5 5 5" />
        <path d="M4 17v1a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-1" />
      </>,
      size,
      style,
    ),
    file: wrap(
      <>
        <path d="M7 3h7l5 5v13H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
        <path d="M14 3v5h5" />
        <path d="M9 13h6" />
        <path d="M9 17h6" />
      </>,
      size,
      style,
    ),
    search: wrap(
      <>
        <circle cx="11" cy="11" r="6.5" />
        <path d="m16 16 4 4" />
      </>,
      size,
      style,
    ),
    book: wrap(
      <>
        <path d="M5 4h9a3 3 0 0 1 3 3v13H8a3 3 0 0 0-3 3Z" />
        <path d="M8 4h11v16" />
      </>,
      size,
      style,
    ),
    survey: wrap(
      <>
        <path d="M5 5h14v14H5z" />
        <path d="M9 9h6" />
        <path d="M9 13h6" />
        <path d="M9 17h3" />
      </>,
      size,
      style,
    ),
    code: wrap(
      <>
        <path d="m8 8-4 4 4 4" />
        <path d="m16 8 4 4-4 4" />
        <path d="m13 5-2 14" />
      </>,
      size,
      style,
    ),
    water: wrap(
      <>
        <path d="M12 3s6 6.2 6 10.5A6 6 0 1 1 6 13.5C6 9.2 12 3 12 3Z" />
      </>,
      size,
      style,
    ),
    shipping: wrap(
      <>
        <path d="M3 18h18" />
        <path d="M5 15h14l-1.5-5h-11Z" />
        <path d="M12 10V5" />
        <path d="M8 8h8" />
      </>,
      size,
      style,
    ),
    culture: wrap(
      <>
        <path d="M4 20h16" />
        <path d="M6 20V8l6-3 6 3v12" />
        <path d="M10 20v-5h4v5" />
      </>,
      size,
      style,
    ),
    target: wrap(
      <>
        <circle cx="12" cy="12" r="8" />
        <circle cx="12" cy="12" r="4" />
        <circle cx="12" cy="12" r="1.5" />
      </>,
      size,
      style,
    ),
    server: wrap(
      <>
        <rect x="3" y="4" width="18" height="6" rx="2" />
        <rect x="3" y="14" width="18" height="6" rx="2" />
        <path d="M7 7h.01" />
        <path d="M7 17h.01" />
      </>,
      size,
      style,
    ),
    database: wrap(
      <>
        <ellipse cx="12" cy="6" rx="7" ry="3" />
        <path d="M5 6v6c0 1.7 3.1 3 7 3s7-1.3 7-3V6" />
        <path d="M5 12v6c0 1.7 3.1 3 7 3s7-1.3 7-3v-6" />
      </>,
      size,
      style,
    ),
    storage: wrap(
      <>
        <path d="M4 8h16" />
        <path d="M4 16h16" />
        <path d="M6 4h12a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2Z" />
      </>,
      size,
      style,
    ),
    monitor: wrap(
      <>
        <rect x="3" y="4" width="18" height="12" rx="2" />
        <path d="M8 20h8" />
        <path d="M12 16v4" />
      </>,
      size,
      style,
    ),
    spark: wrap(
      <>
        <path d="m12 3 1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8Z" />
      </>,
      size,
      style,
    ),
    shield: wrap(
      <>
        <path d="M12 3 5 6v5c0 4.4 2.8 7.9 7 10 4.2-2.1 7-5.6 7-10V6Z" />
      </>,
      size,
      style,
    ),
    globe: wrap(
      <>
        <circle cx="12" cy="12" r="9" />
        <path d="M3 12h18" />
        <path d="M12 3a15 15 0 0 1 0 18" />
        <path d="M12 3a15 15 0 0 0 0 18" />
      </>,
      size,
      style,
    ),
    chart: wrap(
      <>
        <path d="M4 19h16" />
        <path d="M7 15v-3" />
        <path d="M12 15V8" />
        <path d="M17 15v-6" />
      </>,
      size,
      style,
    ),
    menu: wrap(
      <>
        <path d="M4 7h16" />
        <path d="M4 12h16" />
        <path d="M4 17h16" />
      </>,
      size,
      style,
    ),
    close: wrap(
      <>
        <path d="m6 6 12 12" />
        <path d="M18 6 6 18" />
      </>,
      size,
      style,
    ),
    lab: wrap(
      <>
        <path d="M10 3h4" />
        <path d="M10 3v5l-5.5 9.4A2 2 0 0 0 6.3 20h11.4a2 2 0 0 0 1.8-2.6L14 8V3" />
        <path d="M8 14h8" />
      </>,
      size,
      style,
    ),
    layers: wrap(
      <>
        <path d="m12 4 8 4-8 4-8-4 8-4Z" />
        <path d="m4 12 8 4 8-4" />
        <path d="m4 16 8 4 8-4" />
      </>,
      size,
      style,
    ),
  };

  return (
    <span style={{ display: "inline-flex", color, lineHeight: 0 }}>
      {icons[type] || icons.spark}
    </span>
  );
}
