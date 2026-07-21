"use client";
import { useCallback, useRef } from "react";

/**
 * Finger-follow swipe-down-to-dismiss for bottom sheets — THE one behavior
 * for every sheet/notice in the app (Paco, 2026-07-03).
 *
 * - The sheet follows the finger while dragging down; release past 90px
 *   dismisses (slide-out), otherwise it springs back.
 * - Scroll-aware: on internally-scrolling sheets the drag only engages
 *   when the sheet is scrolled to its top, so scrolling still works.
 * - Kills any finished entrance animation before dragging: a CSS animation
 *   with fill:both outranks inline transforms and would freeze the sheet
 *   (the bug that made swipes "just close" instead of following).
 * - `sheetRef` is a callback ref: listeners bind whenever the node mounts,
 *   so it works for conditionally-rendered sheets inside always-mounted
 *   parents too.
 *
 * Usage:
 *   const { sheetRef, dismiss } = useSheetDismiss(onClose);
 *   <div ref={sheetRef} style={{ bottom: SHEET_BOTTOM, animation: SHEET_ENTER }} ...>
 *   <div onClick={dismiss} ...>   // backdrop — animated close
 */
export function useSheetDismiss(onClose: () => void) {
  const nodeRef = useRef<HTMLDivElement | null>(null);
  const cleanupRef = useRef<(() => void) | null>(null);
  const closeRef = useRef(onClose);
  closeRef.current = onClose;

  const dismiss = useCallback(() => {
    const el = nodeRef.current;
    if (!el) { closeRef.current(); return; }
    el.style.animation = "none";
    el.style.transition = "transform .25s cubic-bezier(.22,1,.36,1)";
    el.style.transform = "translateY(110%)";
    setTimeout(() => {
      closeRef.current();
      // Always-mounted sheets (class-toggled) reuse the node: clear our
      // inline styles so their own show/hide mechanism keeps working.
      setTimeout(() => {
        el.style.transform = "";
        el.style.transition = "";
        el.style.animation = "";
      }, 50);
    }, 230);
  }, []);

  const sheetRef = useCallback((el: HTMLDivElement | null) => {
    cleanupRef.current?.();
    cleanupRef.current = null;
    nodeRef.current = el;
    if (!el) return;

    let startY = 0;
    let delta = 0;
    let dragging = false;

    const onStart = (e: TouchEvent) => {
      startY = e.touches[0].clientY;
      delta = 0;
      dragging = false;
    };

    const onMove = (e: TouchEvent) => {
      const dy = e.touches[0].clientY - startY;
      if (!dragging) {
        if (dy > 6 && el.scrollTop <= 0) {
          // pulling down from the top → the gesture is ours
          dragging = true;
          el.style.animation = "none";
          el.style.transition = "none";
        } else {
          // scrolling content — keep the baseline fresh so a later pull
          // from the top starts from zero
          startY = e.touches[0].clientY;
          return;
        }
      }
      delta = Math.max(0, dy);
      e.preventDefault(); // non-passive listener: we own the gesture
      el.style.transform = `translateY(${delta}px)`;
    };

    const onEnd = () => {
      if (!dragging) return;
      dragging = false;
      if (delta > 90) {
        dismiss();
      } else {
        el.style.transition = "transform .25s cubic-bezier(.22,1,.36,1)";
        el.style.transform = "translateY(0)";
        // clear inline styles after the spring so class-based mechanisms
        // (always-mounted sheets) stay in control
        setTimeout(() => {
          el.style.transform = "";
          el.style.transition = "";
        }, 280);
      }
    };

    el.addEventListener("touchstart", onStart, { passive: true });
    el.addEventListener("touchmove", onMove, { passive: false });
    el.addEventListener("touchend", onEnd, { passive: true });
    el.addEventListener("touchcancel", onEnd, { passive: true });
    cleanupRef.current = () => {
      el.removeEventListener("touchstart", onStart);
      el.removeEventListener("touchmove", onMove);
      el.removeEventListener("touchend", onEnd);
      el.removeEventListener("touchcancel", onEnd);
    };
  }, [dismiss]);

  return { sheetRef, dismiss };
}

/**
 * The shared sheet anchor: the TRUE screen bottom, LIFTED above the on-screen
 * keyboard. iOS standalone underreports the layout viewport, so `bottom: 0`
 * lands above the real edge; --app-h carries the hardware-corrected height
 * (see PricingCalculator's viewport effect). --kb-inset carries the keyboard
 * height (0 when closed) so any sheet with a text field rises above the
 * keyboard instead of leaving its inputs trapped behind it (Paco 2026-07-18,
 * "no me deja escribir, se queda abajo"). Both resolve to 0 on healthy
 * devices with no keyboard.
 */
export const SHEET_BOTTOM = "calc(100dvh - var(--app-h, 100dvh) + var(--kb-inset, 0px))";

/** Shared entrance (keyframes live in globals.css, reduced-motion aware). */
export const SHEET_ENTER = "sheetUp .32s cubic-bezier(.22,1,.36,1) both";
