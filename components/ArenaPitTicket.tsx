'use client';

import React from 'react';
import { Contest } from '../lib/game-types';

type ArenaPitTicketProps = {
  contest: Contest;
  scheduled: boolean;
  isJoined: boolean;
  isSelected: boolean;
  participantCount: number;
  onSelect: () => void;
};

const ArenaPitTicket = React.forwardRef<HTMLButtonElement, ArenaPitTicketProps>(function ArenaPitTicket(
  { contest, scheduled, isJoined, isSelected, participantCount, onSelect },
  ref
) {
  return (
    <button
      ref={ref}
      type="button"
      onClick={onSelect}
      className={`pit-card ${isSelected ? 'pit-card-on' : ''} ${isJoined ? 'pit-card-in' : ''} ${scheduled ? 'pit-card-soon' : ''}`}
    >
      <div className="pit-card-accent" aria-hidden />
      <div className="pit-card-body">
        <div className="pit-card-row">
          {scheduled ? (
            <span className="pit-card-status pit-card-status-soon">Soon</span>
          ) : (
            <span className="pit-card-status pit-card-status-live">Live</span>
          )}
          {isJoined && <span className="pit-card-in-badge">IN</span>}
        </div>
        <div className="pit-card-prize">${contest.firstPrize}</div>
        <div className="pit-card-name">{contest.title}</div>
        <div className="pit-card-meta">
          {contest.entryFee === 0 ? 'Free' : `$${contest.entryFee}`}
          <span>·</span>
          {participantCount} in pit
        </div>
      </div>
    </button>
  );
});

export default ArenaPitTicket;