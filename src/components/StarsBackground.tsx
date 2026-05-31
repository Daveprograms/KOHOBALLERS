import React, { useMemo } from 'react';

interface StarData {
  id: number;
  left: number;
  top: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
}

const generateStars = (count: number): StarData[] => {
  const stars: StarData[] = [];
  // Use a pseudo-random seed or Math.random to generate a static field of stars
  for (let i = 0; i < count; i++) {
    stars.push({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 2.2 + 0.8, // 0.8px to 3px
      opacity: Math.random() * 0.5 + 0.4, // 0.4 to 0.9
      duration: Math.random() * 4 + 2.5, // 2.5s to 6.5s twinkling duration
      delay: Math.random() * 6, // 0s to 6s delay
    });
  }
  return stars;
};

export const StarsBackground: React.FC = () => {
  // Generate stars once so they stay in consistent positions across renders
  const stars = useMemo(() => generateStars(120), []);

  // Preset configuration for 5 beautiful shooting stars to trigger from different parts of the screen
  const shootingStars = [
    { id: 1, x: 10, y: 15, delay: 1, duration: 4.5 },
    { id: 2, x: 45, y: 5, delay: 7, duration: 5.5 },
    { id: 3, x: 75, y: 25, delay: 12, duration: 6 },
    { id: 4, x: 25, y: 40, delay: 18, duration: 5 },
    { id: 5, x: 60, y: 50, delay: 24, duration: 6.5 }
  ];

  return (
    <div className="stars-container">
      {/* Brand-Colored Atmospheric Auroras */}
      <div className="aurora-glow-1" />
      <div className="aurora-glow-2" />

      {/* 120 Twinkling Stars */}
      {stars.map((star) => (
        <div
          key={star.id}
          className="star"
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            // Set inline custom properties to drive CSS keyframes dynamically
            ['--twinkle-duration' as any]: `${star.duration}s`,
            ['--twinkle-delay' as any]: `${star.delay}s`,
            ['--star-opacity' as any]: star.opacity,
          }}
        />
      ))}

      {/* 5 Hardware-Accelerated Diagonal Shooting Stars */}
      {shootingStars.map((s) => (
        <div
          key={s.id}
          className="shooting-star"
          style={{
            ['--shoot-x' as any]: `${s.x}%`,
            ['--shoot-y' as any]: `${s.y}%`,
            ['--shoot-duration' as any]: `${s.duration}s`,
            ['--shoot-delay' as any]: `${s.delay}s`,
          }}
        />
      ))}
    </div>
  );
};
