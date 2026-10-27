import React, { useEffect, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'motion/react';
import { BRAND_LOGO_FALLBACK_PATH, BRAND_LOGO_PATH } from '../config/brand';

interface SplashScreenProps {
  isVisible: boolean;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ isVisible }) => {
  const prefersReducedMotion = useReducedMotion();
  const [imgSrc, setImgSrc] = useState<string>(BRAND_LOGO_PATH);
  const [imgFailed, setImgFailed] = useState<boolean>(false);

  // Prevent background scrolling while splash screen is active
  useEffect(() => {
    if (!isVisible) return;
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prevOverflow;
    };
  }, [isVisible]);

  const handleImageError = () => {
    if (imgSrc !== BRAND_LOGO_FALLBACK_PATH) {
      setImgSrc(BRAND_LOGO_FALLBACK_PATH);
    } else {
      setImgFailed(true);
    }
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          key="ziezan-splash-screen"
          initial={{ opacity: prefersReducedMotion ? 1 : 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{
            duration: prefersReducedMotion ? 0.15 : 0.45,
            ease: [0.22, 1, 0.36, 1],
          }}
          className="fixed inset-0 z-[100] w-full h-screen h-[100dvh] flex flex-col items-center justify-center select-none overflow-hidden"
          style={{
            backgroundColor: '#035328',
            paddingTop: 'var(--safe-top)',
            paddingBottom: 'var(--safe-bottom)',
            paddingLeft: 'var(--safe-left)',
            paddingRight: 'var(--safe-right)',
          }}
          role="status"
          aria-live="polite"
          aria-label="Memuat Ziezan Qur'an"
        >
          {/* Center Stack positioned slightly above vertical center */}
          <div className="flex flex-col items-center justify-center text-center px-6 -translate-y-4 sm:-translate-y-6">
            {/* Icon Container with Soft Glow & Scale-Up Animation */}
            <motion.div
              initial={
                prefersReducedMotion
                  ? { opacity: 1, scale: 1 }
                  : { opacity: 0, scale: 0.84 }
              }
              animate={{ opacity: 1, scale: 1 }}
              transition={{
                duration: prefersReducedMotion ? 0.1 : 0.65,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="relative flex items-center justify-center"
            >
              {/* Soft Ambient Glow Behind Icon */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{
                  opacity: prefersReducedMotion ? 0.45 : [0.35, 0.6, 0.45],
                  scale: prefersReducedMotion ? 1 : [0.95, 1.06, 1],
                }}
                transition={{
                  duration: 2.2,
                  ease: 'easeInOut',
                }}
                className="absolute w-36 h-36 sm:w-44 sm:h-44 rounded-full pointer-events-none blur-2xl"
                style={{
                  background:
                    'radial-gradient(circle, rgba(251, 198, 71, 0.24) 0%, rgba(4, 109, 56, 0.45) 55%, rgba(3, 83, 40, 0) 100%)',
                }}
              />

              {/* Icon Frame */}
              <div
                className="relative w-24 h-24 sm:w-28 sm:h-28 md:w-32 md:h-32 rounded-full flex items-center justify-center p-1 shadow-[0_14px_40px_rgba(0,0,0,0.28)]"
                style={{
                  border: '1.5px solid rgba(251, 198, 71, 0.55)',
                  backgroundColor: 'rgba(4, 109, 56, 0.35)',
                }}
              >
                {!imgFailed ? (
                  <img
                    src={imgSrc}
                    alt="Ziezan Qur'an"
                    onError={handleImageError}
                    className="w-full h-full rounded-full object-contain"
                    draggable={false}
                  />
                ) : (
                  <span
                    className="font-display text-4xl sm:text-5xl font-bold"
                    style={{ color: '#FBC647' }}
                  >
                    Z
                  </span>
                )}
              </div>
            </motion.div>

            {/* Brand Name & Minimal Gold Accent (Delayed Fade-In + Subtle Upward Motion) */}
            <motion.div
              initial={
                prefersReducedMotion
                  ? { opacity: 1, y: 0 }
                  : { opacity: 0, y: 14 }
              }
              animate={{ opacity: 1, y: 0 }}
              transition={{
                duration: prefersReducedMotion ? 0.1 : 0.55,
                delay: prefersReducedMotion ? 0 : 0.22,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="mt-5 sm:mt-6 flex flex-col items-center"
            >
              <h1
                className="font-display text-3xl sm:text-4xl md:text-[2.5rem] font-bold tracking-tight text-white"
                style={{ letterSpacing: '-0.01em' }}
              >
                Ziezan Qur&apos;an
              </h1>

              {/* Minimal Gold Accent Bar with Subtle Shimmer Progress */}
              <div className="mt-3.5 w-14 h-[2px] rounded-full overflow-hidden bg-white/15">
                <motion.div
                  initial={{ x: '-100%' }}
                  animate={{ x: prefersReducedMotion ? '0%' : '100%' }}
                  transition={{
                    duration: prefersReducedMotion ? 0.1 : 1.4,
                    repeat: prefersReducedMotion ? 0 : Infinity,
                    ease: 'easeInOut',
                  }}
                  className="w-full h-full rounded-full"
                  style={{ backgroundColor: '#FBC647' }}
                />
              </div>
            </motion.div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};
