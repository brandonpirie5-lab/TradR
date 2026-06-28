'use client';

import React, { useCallback, useEffect, useId, useState } from 'react';
import { HelpCircle, X, ChevronRight } from 'lucide-react';

export type SpotlightTourStep = {
  id: string;
  title: string;
  body: string;
  target: string;
  fallbackTarget?: string;
  padding?: number;
};

type Rect = { top: number; left: number; width: number; height: number };

function queryTourTarget(target: string): Element | null {
  return document.querySelector(`[data-tour="${target}"]`);
}

function measureEl(el: Element, padding: number): Rect {
  const r = el.getBoundingClientRect();
  return {
    top: Math.max(8, r.top - padding),
    left: Math.max(8, r.left - padding),
    width: r.width + padding * 2,
    height: r.height + padding * 2,
  };
}

export default function SpotlightTour({
  steps,
  stepIndex,
  onStepChange,
  onClose,
  onFinish,
  label = 'Guide',
}: {
  steps: SpotlightTourStep[];
  stepIndex: number;
  onStepChange: (n: number) => void;
  onClose: () => void;
  onFinish: () => void;
  label?: string;
}) {
  const step = steps[stepIndex];
  const isLast = stepIndex >= steps.length - 1;
  const padding = step?.padding ?? 8;
  const maskId = useId().replace(/:/g, '');

  const [rect, setRect] = useState<Rect | null>(null);
  const [usingFallback, setUsingFallback] = useState(false);
  const [targetEl, setTargetEl] = useState<Element | null>(null);

  const updateSpotlight = useCallback(() => {
    if (!step) return;

    let el = queryTourTarget(step.target);
    let fallback = false;

    if (!el && step.fallbackTarget) {
      el = queryTourTarget(step.fallbackTarget);
      fallback = !!el;
    }

    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center', inline: 'nearest' });
      const activeKey = fallback ? step.fallbackTarget! : step.target;
      window.setTimeout(() => {
        const fresh = queryTourTarget(activeKey);
        if (fresh) {
          setRect(measureEl(fresh, padding));
          setTargetEl(fresh);
          setUsingFallback(fallback);
        }
      }, 380);
    } else {
      setRect(null);
      setUsingFallback(false);
      setTargetEl(null);
    }
  }, [step, padding]);

  useEffect(() => {
    updateSpotlight();
    const onReflow = () => updateSpotlight();
    window.addEventListener('resize', onReflow);
    window.addEventListener('scroll', onReflow, true);
    return () => {
      window.removeEventListener('resize', onReflow);
      window.removeEventListener('scroll', onReflow, true);
    };
  }, [updateSpotlight, stepIndex]);

  useEffect(() => {
    document.querySelectorAll('.tour-spotlight-active').forEach((n) => {
      n.classList.remove('tour-spotlight-active');
    });
    if (targetEl instanceof HTMLElement) {
      targetEl.classList.add('tour-spotlight-active');
    }
    return () => {
      if (targetEl instanceof HTMLElement) {
        targetEl.classList.remove('tour-spotlight-active');
      }
    };
  }, [targetEl]);

  const finish = () => {
    document.querySelectorAll('.tour-spotlight-active').forEach((n) => {
      n.classList.remove('tour-spotlight-active');
    });
    onFinish();
    onClose();
  };

  const tooltipOnTop = rect ? rect.top > window.innerHeight * 0.5 : true;

  return (
    <div className="fixed inset-0 z-[88]">
      {/* SVG dim + cutout — blocks clicks outside spotlight */}
      <svg
        className="fixed inset-0 w-full h-full pointer-events-auto"
        onClick={finish}
        aria-hidden
      >
        <defs>
          <mask id={maskId}>
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            {rect && (
              <rect
                x={rect.left}
                y={rect.top}
                width={rect.width}
                height={rect.height}
                rx="14"
                ry="14"
                fill="black"
              />
            )}
          </mask>
        </defs>
        <rect
          x="0"
          y="0"
          width="100%"
          height="100%"
          fill="rgba(0, 0, 0, 0.84)"
          mask={`url(#${maskId})`}
        />
      </svg>

      {rect && (
        <div
          className="fixed pointer-events-none tour-spotlight-ring"
          style={{
            top: rect.top,
            left: rect.left,
            width: rect.width,
            height: rect.height,
            borderRadius: 14,
          }}
        />
      )}

      {/* Tooltip — above tab bar */}
      <div
        className={`fixed left-4 right-4 max-w-md mx-auto pointer-events-auto z-[91] ${
          rect && !tooltipOnTop ? '' : 'bottom-24'
        }`}
        style={
          rect && !tooltipOnTop
            ? { top: Math.max(12, rect.top - 12), transform: 'translateY(-100%)' }
            : undefined
        }
        onClick={(e) => e.stopPropagation()}
      >
        <div className="bg-card border border-accent/50 rounded-2xl p-5 shadow-2xl tour-tooltip-enter">
          <div className="flex justify-between items-start mb-3">
            <div className="flex items-center gap-2">
              <HelpCircle size={18} className="text-accent" />
              <span className="text-[10px] tracking-[3px] text-muted uppercase">
                {label} {stepIndex + 1}/{steps.length}
              </span>
            </div>
            <button type="button" onClick={finish} className="p-1 text-muted hover:text-white">
              <X size={16} />
            </button>
          </div>
          <h3 className="font-bold text-lg mb-1">{step.title}</h3>
          <p className="text-sm text-secondary leading-relaxed mb-2">{step.body}</p>
          {usingFallback && (
            <p className="text-[10px] text-accent/80 mb-2 italic">
              Glowing the nearest match — joins a pit to see the full version.
            </p>
          )}
          {!rect && (
            <p className="text-[10px] text-muted mb-2">
              Nothing to highlight yet — join a contest first, then run the guide.
            </p>
          )}
          <div className="flex gap-1 mb-4">
            {steps.map((_, i) => (
              <div
                key={i}
                className={`h-1 flex-1 rounded-full transition-colors ${i <= stepIndex ? 'bg-accent' : 'bg-card border border-card'}`}
              />
            ))}
          </div>
          <div className="flex gap-2">
            {stepIndex > 0 && (
              <button
                type="button"
                onClick={() => onStepChange(stepIndex - 1)}
                className="flex-1 py-2.5 text-sm border border-card rounded-xl"
              >
                Back
              </button>
            )}
            <button
              type="button"
              onClick={() => (isLast ? finish() : onStepChange(stepIndex + 1))}
              className="btn btn-primary flex-1 py-2.5 text-sm flex items-center justify-center gap-1"
            >
              {isLast ? 'Got it' : 'Next'}
              {!isLast && <ChevronRight size={14} />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function TourHelpButton({ onClick, label = 'Screen guide' }: { onClick: () => void; label?: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      data-tour-ignore
      className="w-8 h-8 rounded-full border border-card bg-surface flex items-center justify-center text-muted hover:text-accent hover:border-accent/40"
      aria-label={label}
    >
      <HelpCircle size={16} />
    </button>
  );
}