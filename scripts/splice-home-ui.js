const fs = require('fs');
const path = require('path');

const filePath = path.join(process.cwd(), 'app', 'page.tsx');
const lines = fs.readFileSync(filePath, 'utf8').split('\n');

const start = lines.findIndex((l) => l.includes('REMOVED_OLD_HERO_START'));
let endIdx = -1;
for (let i = start; i < lines.length; i++) {
  if (lines[i].trim() !== '</>') continue;
  for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
    if (lines[j].includes('MY BATTLES TAB')) {
      endIdx = i;
      break;
    }
  }
  if (endIdx >= 0) break;
}

if (start < 0 || endIdx < 0) {
  console.error('Markers not found', start, endIdx);
  process.exit(1);
}

const insert = `            <div className="mb-6" data-tour="open-arenas">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold tracking-tight text-white">More pits</h2>
                <div className="flex gap-4 text-xs">
                  {(['all', 'paid', 'free'] as const).map((filter) => (
                    <button
                      key={filter}
                      type="button"
                      onClick={() => setSelectedFilter(filter)}
                      className={\`pb-0.5 font-medium transition-colors \${selectedFilter === filter ? 'text-accent border-b border-accent' : 'text-muted'}\`}
                    >
                      {filter === 'all' ? 'All' : filter.charAt(0).toUpperCase() + filter.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
              <div className="arena-pit-list rounded-2xl border border-card overflow-hidden bg-card">
                {homeListPits.length === 0 ? (
                  <div className="py-8 text-center text-sm text-muted">No other pits match this filter.</div>
                ) : (
                  homeListPits.map(({ contest, scheduled }) => (
                    <ArenaPitRow
                      key={contest.id}
                      contest={contest}
                      isJoined={joinedContests.includes(contest.id)}
                      rank={rankInContest(contest.id)}
                      participantCount={getLiveParticipantCount(contest.id)}
                      scheduled={scheduled}
                      bellTick={bellTick}
                      onPress={() => handleHomePitPress(contest)}
                    />
                  ))
                )}
              </div>
            </div>

            <div className="flex gap-2 mb-2">
              <button
                type="button"
                onClick={() => setActiveTab('entries')}
                className="flex-1 py-2.5 text-xs text-muted border border-card rounded-xl hover:text-accent hover:border-accent/30 transition-colors"
              >
                My battles
              </button>
              <button
                type="button"
                onClick={() => { setVaultMode('pit'); setActiveTab('leaderboard'); }}
                className="flex-1 py-2.5 text-xs text-accent border border-accent/30 rounded-xl hover:bg-accent/5 transition-colors"
              >
                Rankings
              </button>
            </div>`.split('\n');

const newLines = [...lines.slice(0, start), ...insert, ...lines.slice(endIdx)];
fs.writeFileSync(filePath, newLines.join('\n'));
console.log('OK: removed', endIdx - start, 'lines');