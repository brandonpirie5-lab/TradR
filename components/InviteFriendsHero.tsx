'use client';

import React from 'react';
import { Copy, Share2, Users, Check } from 'lucide-react';
import { Contest } from '../lib/game-types';
import { getPitFillStatus } from '../lib/contest-fill';
import { REFERRAL_TIERS } from '../lib/referral-program';

type InviteFriendsHeroProps = {
  focusContest?: Contest | null;
  participantCount?: number;
  userJoined?: boolean;
  onCopyLink: () => void;
  onShareLink: () => void;
  copied?: boolean;
};

export default function InviteFriendsHero({
  focusContest,
  participantCount = 0,
  userJoined = false,
  onCopyLink,
  onShareLink,
  copied = false,
}: InviteFriendsHeroProps) {
  const fill = focusContest
    ? getPitFillStatus(focusContest, participantCount)
    : null;

  const headline = fill && !fill.isConfirmed
    ? `${fill.needed} more trader${fill.needed === 1 ? '' : 's'} to confirm today's pit`
    : userJoined
      ? "You're rang in — bring friends to lock the pool"
      : 'Fill the pit';

  const detail =
    fill && !fill.isConfirmed
      ? `Pits need ${fill.minEntries} traders or they void${focusContest && focusContest.entryFee > 0 ? ' and refund entries' : ''}. Friends get $${REFERRAL_TIERS.friendSignupBonus} on signup.`
      : `Invite traders — friends get $${REFERRAL_TIERS.friendSignupBonus} credit. You earn when they hit the tape.`;

  return (
    <section className="at-invite-hero" data-tour="invite-friends">
      <div className="at-invite-hero-glow" aria-hidden />
      <div className="at-invite-hero-inner">
        <div className="at-invite-hero-icon" aria-hidden>
          <Users size={18} />
        </div>
        <div className="at-invite-hero-copy">
          <span className="at-invite-hero-kicker">Grow the tape</span>
          <h2 className="at-invite-hero-title">{headline}</h2>
          <p className="at-invite-hero-detail">{detail}</p>
          {fill && (
            <p className="at-invite-hero-fill font-mono">
              {fill.current}/{fill.minEntries} traders
              {fill.isConfirmed ? ' · pit confirmed' : ` · ${fill.needed} to go`}
            </p>
          )}
        </div>
        <div className="at-invite-hero-actions">
          <button type="button" onClick={onCopyLink} className="at-invite-btn at-invite-btn-primary">
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? 'Copied' : 'Copy link'}
          </button>
          <button type="button" onClick={onShareLink} className="at-invite-btn at-invite-btn-secondary">
            <Share2 size={14} />
            Share
          </button>
        </div>
      </div>
    </section>
  );
}