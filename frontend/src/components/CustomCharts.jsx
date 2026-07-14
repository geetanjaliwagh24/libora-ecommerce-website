import React, { useState } from 'react';

// Custom Interactive SVG Line Chart
export const LineChart = ({ labels = [], values = [] }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);
  
  if (labels.length === 0 || values.length === 0) return <p style={{ color: 'var(--text-muted)' }}>No data available</p>;

  const svgWidth = 550;
  const svgHeight = 220;
  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 35;
  
  const graphWidth = svgWidth - paddingLeft - paddingRight;
  const graphHeight = svgHeight - paddingTop - paddingBottom;
  
  const maxVal = Math.max(...values, 100);
  // Grid lines
  const gridCount = 4;
  const yTicks = Array.from({ length: gridCount + 1 }, (_, i) => maxVal - (i * (maxVal / gridCount)));
  
  // Coordinates mapper
  const points = values.map((val, idx) => {
    const x = paddingLeft + (idx * (graphWidth / (labels.length - 1 || 1)));
    const y = paddingTop + graphHeight - (val * (graphHeight / maxVal));
    return { x, y, val, label: labels[idx] };
  });

  // Build path commands
  let linePath = '';
  let fillPath = '';
  
  if (points.length > 0) {
    linePath = `M ${points[0].x} ${points[0].y}`;
    for (let i = 1; i < points.length; i++) {
      linePath += ` L ${points[i].x} ${points[i].y}`;
    }
    
    fillPath = `${linePath} L ${points[points.length - 1].x} ${paddingTop + graphHeight} L ${points[0].x} ${paddingTop + graphHeight} Z`;
  }

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height="auto" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="lineGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--secondary)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="1" />
          </linearGradient>
          <linearGradient id="areaFill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--secondary)" stopOpacity="0.25" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.0" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((tick, i) => {
          const y = paddingTop + (i * (graphHeight / gridCount));
          return (
            <g key={i}>
              <line 
                x1={paddingLeft} 
                y1={y} 
                x2={svgWidth - paddingRight} 
                y2={y} 
                stroke="var(--border-color)" 
                strokeDasharray="4 4" 
              />
              <text 
                x={paddingLeft - 10} 
                y={y + 4} 
                fill="var(--text-secondary)" 
                fontSize="10" 
                textAnchor="end"
                fontFamily="Outfit, sans-serif"
              >
                ₹{Math.round(tick)}
              </text>
            </g>
          );
        })}

        {/* Area Fill */}
        {fillPath && <path d={fillPath} fill="url(#areaFill)" />}

        {/* Glowing Path */}
        {linePath && (
          <path 
            d={linePath} 
            fill="none" 
            stroke="url(#lineGlow)" 
            strokeWidth="3.5" 
            strokeLinecap="round" 
            strokeLinejoin="round" 
            style={{ filter: 'drop-shadow(0px 4px 10px rgba(244, 128, 49, 0.3))' }}
          />
        )}

        {/* Data Circles */}
        {points.map((pt, i) => (
          <g key={i}>
            {/* Transparent hover catcher */}
            <circle 
              cx={pt.x} 
              cy={pt.y} 
              r="14" 
              fill="transparent" 
              style={{ cursor: 'pointer' }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
            {/* Visual circle */}
            <circle 
              cx={pt.x} 
              cy={pt.y} 
              r={hoveredIdx === i ? '6' : '3.5'} 
              fill={hoveredIdx === i ? 'var(--secondary)' : 'var(--primary)'}
              stroke="#1a1426" 
              strokeWidth="1.5"
              style={{ transition: 'all 0.15s ease' }}
            />
          </g>
        ))}

        {/* X Axis Labels */}
        {points.map((pt, i) => (
          <text 
            key={i} 
            x={pt.x} 
            y={svgHeight - 12} 
            fill="var(--text-secondary)" 
            fontSize="9" 
            textAnchor="middle"
            fontFamily="Outfit, sans-serif"
          >
            {pt.label}
          </text>
        ))}
      </svg>

      {/* Floating Tooltip HTML Overlay */}
      {hoveredIdx !== null && points[hoveredIdx] && (
        <div style={{
          position: 'absolute',
          left: `${(points[hoveredIdx].x / svgWidth) * 100}%`,
          top: `${(points[hoveredIdx].y / svgHeight) * 100 - 15}%`,
          transform: 'translate(-50%, -100%)',
          background: 'var(--surface-elevated)',
          border: '1px solid var(--secondary)',
          boxShadow: '0 0 15px rgba(244, 128, 49, 0.4)',
          borderRadius: '8px',
          padding: '8px 12px',
          pointerEvents: 'none',
          zIndex: 10,
          whiteSpace: 'nowrap',
          color: 'var(--text-primary)',
          fontFamily: 'Outfit, sans-serif',
          fontSize: '0.8rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px'
        }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 600 }}>{points[hoveredIdx].label}</span>
          <span style={{ color: 'var(--secondary)', fontWeight: 800 }}>₹{points[hoveredIdx].val.toLocaleString('en-IN')}</span>
        </div>
      )}
    </div>
  );
};

// Custom Interactive SVG Bar Chart
export const BarChart = ({ data = [] }) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (data.length === 0) return <p style={{ color: 'var(--text-muted)' }}>No data available</p>;

  const svgWidth = 550;
  const svgHeight = 220;
  const paddingLeft = 55;
  const paddingRight = 20;
  const paddingTop = 25;
  const paddingBottom = 35;

  const graphWidth = svgWidth - paddingLeft - paddingRight;
  const graphHeight = svgHeight - paddingTop - paddingBottom;

  const values = data.map(d => d.value);
  const maxVal = Math.max(...values, 100);

  const gridCount = 4;
  const yTicks = Array.from({ length: gridCount + 1 }, (_, i) => maxVal - (i * (maxVal / gridCount)));

  const barWidth = (graphWidth / data.length) * 0.5;
  const barGap = (graphWidth / data.length) * 0.5;

  const bars = data.map((item, idx) => {
    const x = paddingLeft + (idx * (graphWidth / data.length)) + (barGap / 2);
    const barHeight = item.value * (graphHeight / maxVal);
    const y = paddingTop + graphHeight - barHeight;
    return { x, y, width: barWidth, height: barHeight, val: item.value, label: item.label };
  });

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} width="100%" height="auto" style={{ overflow: 'visible' }}>
        <defs>
          <linearGradient id="barGlow" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--primary)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--secondary)" stopOpacity="0.8" />
          </linearGradient>
          <linearGradient id="barHover" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--success)" stopOpacity="1" />
            <stop offset="100%" stopColor="var(--primary)" stopOpacity="0.8" />
          </linearGradient>
        </defs>

        {/* Grid lines */}
        {yTicks.map((tick, i) => {
          const y = paddingTop + (i * (graphHeight / gridCount));
          return (
            <g key={i}>
              <line 
                x1={paddingLeft} 
                y1={y} 
                x2={svgWidth - paddingRight} 
                y2={y} 
                stroke="var(--border-color)" 
                strokeDasharray="4 4" 
              />
              <text 
                x={paddingLeft - 10} 
                y={y + 4} 
                fill="var(--text-secondary)" 
                fontSize="10" 
                textAnchor="end"
                fontFamily="Outfit, sans-serif"
              >
                ₹{Math.round(tick)}
              </text>
            </g>
          );
        })}

        {/* Bars */}
        {bars.map((bar, i) => (
          <g key={i}>
            <rect 
              x={bar.x} 
              y={bar.y} 
              width={bar.width} 
              height={Math.max(bar.height, 2)} 
              rx="4" 
              fill={hoveredIdx === i ? 'url(#barHover)' : 'url(#barGlow)'}
              style={{ transition: 'fill 0.2s ease, transform 0.2s ease', cursor: 'pointer' }}
              onMouseEnter={() => setHoveredIdx(i)}
              onMouseLeave={() => setHoveredIdx(null)}
            />
          </g>
        ))}

        {/* X Axis Labels */}
        {bars.map((bar, i) => (
          <text 
            key={i} 
            x={bar.x + bar.width / 2} 
            y={svgHeight - 12} 
            fill="var(--text-secondary)" 
            fontSize="9" 
            textAnchor="middle"
            fontFamily="Outfit, sans-serif"
          >
            {bar.label.length > 8 ? `${bar.label.substring(0, 7)}...` : bar.label}
          </text>
        ))}
      </svg>

      {/* Floating Tooltip HTML Overlay */}
      {hoveredIdx !== null && bars[hoveredIdx] && (
        <div style={{
          position: 'absolute',
          left: `${((bars[hoveredIdx].x + bars[hoveredIdx].width / 2) / svgWidth) * 100}%`,
          top: `${(bars[hoveredIdx].y / svgHeight) * 100 - 15}%`,
          transform: 'translate(-50%, -100%)',
          background: 'var(--surface-elevated)',
          border: '1px solid var(--primary)',
          boxShadow: '0 0 15px rgba(241, 58, 177, 0.4)',
          borderRadius: '8px',
          padding: '8px 12px',
          pointerEvents: 'none',
          zIndex: 10,
          whiteSpace: 'nowrap',
          color: 'var(--text-primary)',
          fontFamily: 'Outfit, sans-serif',
          fontSize: '0.8rem',
          display: 'flex',
          flexDirection: 'column',
          gap: '2px'
        }}>
          <span style={{ color: 'var(--text-secondary)', fontSize: '0.7rem', fontWeight: 600 }}>{bars[hoveredIdx].label}</span>
          <span style={{ color: 'var(--primary)', fontWeight: 800 }}>₹{bars[hoveredIdx].val.toLocaleString('en-IN')}</span>
        </div>
      )}
    </div>
  );
};
