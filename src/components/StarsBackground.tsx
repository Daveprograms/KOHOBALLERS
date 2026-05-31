import React, { useMemo } from 'react';

interface StarData {
  id: number;
  left: number;
  top: number;
  size: number;
  opacity: number;
  duration: number;
  delay: number;
  colorType: 'white' | 'blue' | 'gold';
}

const generateStars = (count: number): StarData[] => {
  const stars: StarData[] = [];
  for (let i = 0; i < count; i++) {
    // Determine color type: 75% White, 15% KOHO Blue, 10% Neo Gold
    const rand = Math.random();
    let colorType: 'white' | 'blue' | 'gold' = 'white';
    if (rand > 0.85) {
      colorType = 'blue';
    } else if (rand > 0.75) {
      colorType = 'gold';
    }

    stars.push({
      id: i,
      left: Math.random() * 100,
      top: Math.random() * 100,
      size: Math.random() * 3.2 + 1.2, // Enhanced size: 1.2px to 4.4px for maximum noticeability
      opacity: Math.random() * 0.4 + 0.6, // Brightened: 0.6 to 1.0 peak opacities
      duration: Math.random() * 3.5 + 2.0, // Twinkle speed
      delay: Math.random() * 5,
      colorType,
    });
  }
  return stars;
};

export const StarsBackground: React.FC = () => {
  const stars = useMemo(() => generateStars(160), []); // Expanded to 160 stars

  // Expanded to 8 dynamic shooting star trajectories spanning different depths
  const shootingStars = [
    { id: 1, x: 5, y: 10, delay: 0.5, duration: 4.0 },
    { id: 2, x: 40, y: 2, delay: 5.0, duration: 4.8 },
    { id: 3, x: 70, y: 20, delay: 9.5, duration: 5.0 },
    { id: 4, x: 20, y: 35, delay: 14.0, duration: 4.5 },
    { id: 5, x: 55, y: 45, delay: 18.5, duration: 5.2 },
    { id: 6, x: 80, y: 8, delay: 23.0, duration: 4.2 },
    { id: 7, x: 15, y: 60, delay: 28.0, duration: 5.5 },
    { id: 8, x: 65, y: 30, delay: 33.0, duration: 4.8 }
  ];

  return (
    <div className="stars-container">
      {/* Amplified Brand-Colored Atmospheric Auroras */}
      <div className="aurora-glow-1" />
      <div className="aurora-glow-2" />

      {/* 160 Brilliant Twinkling & Glowing Stars */}
      {stars.map((star) => (
        <div
          key={star.id}
          className={`star ${star.colorType}`}
          style={{
            left: `${star.left}%`,
            top: `${star.top}%`,
            width: `${star.size}px`,
            height: `${star.size}px`,
            ['--twinkle-duration' as any]: `${star.duration}s`,
            ['--twinkle-delay' as any]: `${star.delay}s`,
            ['--star-opacity' as any]: star.opacity,
          }}
        />
      ))}

      {/* 8 Brighter & Thicker Diagonal Shooting Stars */}
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
