import confetti from 'canvas-confetti';

export const triggerConfetti = () => {
  const duration = 3000;
  const animationEnd = Date.now() + duration;

  const randomInRange = (min: number, max: number) => {
    return Math.random() * (max - min) + min;
  };

  const confettiAnimation = () => {
    const timeLeft = animationEnd - Date.now();

    if (timeLeft <= 0) return;

    const particleCount = 50;

    confetti({
      particleCount,
      spread: 70,
      origin: { y: 0.6 },
      colors: ['#eaaf0f', '#4338ca', '#0ea5e9'],
    });

    requestAnimationFrame(confettiAnimation);
  };

  confettiAnimation();
};

export { confetti };
