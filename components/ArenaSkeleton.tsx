'use client';

import React from 'react';

export default function ArenaSkeleton() {
  return (
    <div className="af-landing af-landing-v3 arena-skeleton" aria-busy aria-label="Loading pit">
      <div className="arena-skel-guest" />
      <div className="arena-skel-poster">
        <div className="arena-skel-line arena-skel-line-sm" />
        <div className="arena-skel-line arena-skel-line-lg" />
        <div className="arena-skel-line arena-skel-line-md" />
        <div className="arena-skel-ring-row">
          <div className="arena-skel-ring" />
          <div className="arena-skel-ring-copy">
            <div className="arena-skel-line arena-skel-line-md" />
            <div className="arena-skel-line arena-skel-line-sm" />
          </div>
        </div>
        <div className="arena-skel-bar" />
      </div>
      <div className="arena-skel-cta" />
    </div>
  );
}