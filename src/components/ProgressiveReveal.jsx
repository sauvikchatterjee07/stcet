import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const TARGET = [
  ".stcet-page > section",
  ".stcet-shell .stcet-panel",
  ".stcet-shell article",
  ".stcet-shell .grid > section",
].join(",");

const KEYFRAMES = [
  { opacity: 0, translate: "0 1.15rem" },
  { opacity: 1, translate: "0 0" },
];

function prefersReducedMotion() {
  return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
}

function supportsViewTimeline() {
  return CSS.supports("animation-timeline: view()");
}

function collectTargets() {
  const nodes = [...document.querySelectorAll(TARGET)].filter((el) => {
    if (!(el instanceof HTMLElement)) return false;
    if (el.closest("[data-no-reveal], header, nav, .fixed")) return false;
    if (el.getClientRects().length === 0) return false;
    const rect = el.getBoundingClientRect();
    return rect.height >= 40 && rect.width >= 40;
  });

  return nodes.filter((el) => !nodes.some((other) => other !== el && other.contains(el)));
}

function releaseSettledTargets() {
  for (const el of collectTargets()) {
    if (el.dataset.revealDone === "1") continue;
    const name = getComputedStyle(el).animationName || "";
    if (!name.includes("reveal-rise")) continue;
    const rect = el.getBoundingClientRect();
    const opacity = Number.parseFloat(getComputedStyle(el).opacity);
    const onScreen = rect.bottom > 48 && rect.top < window.innerHeight * 0.62;
    if (onScreen && opacity < 0.08) {
      el.style.animation = "none";
      el.dataset.revealDone = "1";
      continue;
    }
    if (opacity > 0.98 && rect.top < window.innerHeight - 24) {
      el.style.animation = "none";
      el.dataset.revealDone = "1";
    }
  }
}

function playReveal(el, delay) {
  const animation = el.animate(KEYFRAMES, {
    duration: 680,
    delay,
    easing: "cubic-bezier(0.22, 1, 0.36, 1)",
    fill: "backwards",
  });
  animation.onfinish = () => animation.cancel();
}

export default function ProgressiveReveal() {
  const location = useLocation();

  useEffect(() => {
    if (prefersReducedMotion()) return undefined;

    let frame = 0;
    const armed = new WeakSet();
    let observer;

    const scan = () => {
      if (supportsViewTimeline()) {
        releaseSettledTargets();
        return;
      }

      const groups = new Map();
      for (const el of collectTargets()) {
        if (armed.has(el) || el.dataset.revealDone === "1") continue;
        const list = groups.get(el.parentElement) || [];
        list.push(el);
        groups.set(el.parentElement, list);
      }

      observer ??= new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            const el = entry.target;
            observer.unobserve(el);
            const held = el.__revealAnim;
            if (held) {
              held.play();
              continue;
            }
            playReveal(el, 0);
          }
        },
        { rootMargin: "0px 0px -8% 0px", threshold: 0.18 },
      );

      for (const list of groups.values()) {
        list.forEach((el, index) => {
          armed.add(el);
          const rect = el.getBoundingClientRect();
          const inView = rect.top < window.innerHeight * 0.92 && rect.bottom > 0;
          if (inView) {
            playReveal(el, Math.min(index, 7) * 70);
            return;
          }
          const held = el.animate(KEYFRAMES, {
            duration: 680,
            easing: "cubic-bezier(0.22, 1, 0.36, 1)",
            fill: "both",
          });
          held.pause();
          held.currentTime = 0;
          held.onfinish = () => held.cancel();
          el.__revealAnim = held;
          observer.observe(el);
        });
      }
    };

    const schedule = () => {
      cancelAnimationFrame(frame);
      frame = requestAnimationFrame(scan);
    };

    schedule();
    const timers = [250, 900].map((delay) => window.setTimeout(schedule, delay));
    const onScroll = () => schedule();
    window.addEventListener("scroll", onScroll, { passive: true });
    const mutation = new MutationObserver(schedule);
    mutation.observe(document.body, {
      childList: true,
      subtree: true,
      attributes: true,
      attributeFilter: ["hidden"],
    });

    return () => {
      cancelAnimationFrame(frame);
      timers.forEach((id) => window.clearTimeout(id));
      window.removeEventListener("scroll", onScroll);
      mutation.disconnect();
      observer?.disconnect();
    };
  }, [location.pathname]);

  return null;
}
