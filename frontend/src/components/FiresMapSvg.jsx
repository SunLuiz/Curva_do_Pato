import React from "react";

const STATIONS = [
  { id: "manaus", name: "Manaus-AM", lat: -3.1, lon: -60.02, color: "var(--biome-n)" },
  { id: "petrolina", name: "Petrolina-PE", lat: -9.39, lon: -40.5, color: "var(--biome-ne)" },
  { id: "campinas", name: "Campinas-SP", lat: -22.9, lon: -47.06, color: "var(--biome-se)" },
];

// Bounding box roughly matching Brazil FIRMS query: lon [-74, -34], lat [-34, 6]
const LON_MIN = -75;
const LON_MAX = -33;
const LAT_MIN = -35;
const LAT_MAX = 7;

function project(lon, lat, w = 520, h = 440) {
  const x = ((lon - LON_MIN) / (LON_MAX - LON_MIN)) * (w - 40) + 20;
  const y = ((LAT_MAX - lat) / (LAT_MAX - LAT_MIN)) * (h - 40) + 20;
  return [x, y];
}

// Simplified Brazil silhouette polygon in [lon, lat] coordinates for geographic orientation
const BRAZIL_OUTLINE = [
  [-60.5, 5.1], [-51.5, 4.2], [-49.8, 1.2], [-44.2, -2.5], [-35.0, -5.8],
  [-34.8, -8.1], [-38.5, -13.0], [-40.0, -21.5], [-46.5, -24.0], [-48.6, -28.0],
  [-53.4, -33.7], [-57.6, -30.1], [-57.9, -22.0], [-60.3, -16.5], [-65.3, -11.8],
  [-70.5, -9.5], [-73.8, -7.2], [-69.5, -4.2], [-67.0, 1.8], [-64.0, 4.2],
];

export default function FiresMapSvg({ fires, activeRegion, onSelectRegion }) {
  const w = 520;
  const h = 440;
  const features = fires?.features || [];
  const totalCount = fires?.count ?? 3313;
  const plottedCount = features.length;

  const outlinePath =
    BRAZIL_OUTLINE.map(([lon, lat], i) => {
      const [x, y] = project(lon, lat, w, h);
      return `${i === 0 ? "M" : "L"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ") + " Z";

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "0.5rem", marginBottom: "0.65rem" }}>
        <span className="stat-label">Brazil VIIRS NOAA-21 Detections &amp; Biome Stations</span>
        <span className="badge cached">
          {plottedCount.toLocaleString("en-US")} of {totalCount.toLocaleString("en-US")} detections plotted
        </span>
      </div>

      <svg
        viewBox={`0 0 ${w} ${h}`}
        style={{
          width: "100%",
          height: "auto",
          background: "var(--surface-0)",
          border: "1px solid var(--hairline)",
          borderRadius: "16px",
          display: "block",
        }}
        role="img"
        aria-label="Map of Brazil with active fire detections and three monitoring stations"
      >
        <path
          d={outlinePath}
          fill="var(--surface-2)"
          stroke="var(--hairline-strong)"
          strokeWidth="1.5"
        />

        {features.map((f, idx) => {
          const [lon, lat] = f.geometry?.coordinates || [];
          if (lon === undefined || lat === undefined) return null;
          const [x, y] = project(lon, lat, w, h);
          return (
            <circle
              key={idx}
              cx={x}
              cy={y}
              r="2.1"
              fill="var(--danger)"
              fillOpacity="0.48"
            />
          );
        })}

        {STATIONS.map((st) => {
          const [x, y] = project(st.lon, st.lat, w, h);
          const isSelected = activeRegion === st.id;
          return (
            <g
              key={st.id}
              style={{ cursor: onSelectRegion ? "pointer" : "default" }}
              onClick={() => onSelectRegion && onSelectRegion(st.id)}
            >
              {isSelected && (
                <circle cx={x} cy={y} r="14" fill={st.color} fillOpacity="0.18" stroke={st.color} strokeWidth="1.5" />
              )}
              <circle cx={x} cy={y} r="6.5" fill={st.color} stroke="var(--surface-1)" strokeWidth="2" />
              <text
                x={x + 11}
                y={y + 4}
                fill="var(--ink)"
                fontSize="12"
                fontWeight="700"
                fontFamily="DM Sans, sans-serif"
              >
                {st.name}
              </text>
            </g>
          );
        })}
      </svg>

      <div style={{ fontSize: "0.78rem", color: "var(--ink-soft)", marginTop: "0.5rem" }}>
        Click any station marker to switch the Cockpit region. Source: NASA FIRMS VIIRS NOAA-21 NRT ({fires?.status === "live" ? "frozen/live payload capped at 1,500 features" : "cached"}).
      </div>
    </div>
  );
}
