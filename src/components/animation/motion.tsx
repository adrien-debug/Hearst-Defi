"use client";

import { LazyMotion, m } from "framer-motion";

/**
 * Animation primitives.
 *
 * Perf: the heavy framer-motion feature set (`domAnimation`) is loaded via a
 * dynamic import wrapped in `LazyMotion`, so it is code-split out of the main
 * client bundle and only fetched when these components mount. The lightweight
 * `m` component keeps SSR markup and the public component API
 * (`FadeIn` / `StaggerContainer` / `StaggerItem`) byte-for-byte identical to
 * the previous synchronous `motion` implementation — no `ssr:false`, no
 * layout-shift / blank-flash risk.
 */
const loadDomAnimation = () =>
  import("framer-motion").then((mod) => mod.domAnimation);

/**
 * Fade-in animation wrapper.
 *
 * Usage:
 *   <FadeIn>
 *     <YourComponent />
 *   </FadeIn>
 */
interface FadeInProps {
  children: React.ReactNode;
  delay?: number;
  duration?: number;
  direction?: "up" | "down" | "left" | "right" | "none";
  className?: string;
}

export function FadeIn({
  children,
  delay = 0,
  duration = 0.5,
  direction = "up",
  className,
}: FadeInProps) {
  const directions = {
    up: { y: 24 },
    down: { y: -24 },
    left: { x: 24 },
    right: { x: -24 },
    none: {},
  };

  return (
    <LazyMotion features={loadDomAnimation} strict>
      <m.div
        initial={{ opacity: 0, ...directions[direction] }}
        animate={{ opacity: 1, x: 0, y: 0 }}
        transition={{
          duration,
          delay,
          ease: [0.25, 0.1, 0.25, 1],
        }}
        className={className}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}

/**
 * Stagger container — animates children with progressive delays.
 *
 * Usage:
 *   <StaggerContainer>
 *     <Card />
 *     <Card />
 *     <Card />
 *   </StaggerContainer>
 */
interface StaggerContainerProps {
  children: React.ReactNode;
  staggerDelay?: number;
  className?: string;
}

export function StaggerContainer({
  children,
  staggerDelay = 0.1,
  className,
}: StaggerContainerProps) {
  return (
    <LazyMotion features={loadDomAnimation} strict>
      <m.div
        initial="hidden"
        animate="visible"
        variants={{
          hidden: {},
          visible: {
            transition: {
              staggerChildren: staggerDelay,
            },
          },
        }}
        className={className}
      >
        {children}
      </m.div>
    </LazyMotion>
  );
}

/**
 * Stagger item — use inside StaggerContainer.
 */
interface StaggerItemProps {
  children: React.ReactNode;
  className?: string;
}

export function StaggerItem({ children, className }: StaggerItemProps) {
  return (
    <m.div
      variants={{
        hidden: { opacity: 0, y: 20 },
        visible: {
          opacity: 1,
          y: 0,
          transition: {
            duration: 0.5,
            ease: [0.25, 0.1, 0.25, 1],
          },
        },
      }}
      className={className}
    >
      {children}
    </m.div>
  );
}
