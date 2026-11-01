export type RingUse = '' | 'speaker' | 'subwoofer' | 'tweeter' | 'general';
const advice: Record<RingUse, string> = {
  '': 'Choose a use for measurement guidance. You can change it at any time.',
  speaker: 'Measure the available mounting surface and the clearance needed for the speaker opening.',
  subwoofer: 'Measure the mounting surface, required opening, and available depth around the subwoofer.',
  tweeter: 'Measure the available surface, the required opening, and the available depth. This makes a plain ring, not a complete adapter.',
  general: 'Measure the mating surface, the opening you need, and the available thickness.',
};
export function RingGuidance({ kind, onKindChange }: { kind: RingUse; onKindChange: (kind: RingUse) => void }) {
  return <section className="ring-guidance" aria-labelledby="ring-guidance-title">
    <h2 id="ring-guidance-title">Start with your measurements</h2>
    <label htmlFor="ring-use">What kind of ring are you making?</label>
    <select id="ring-use" value={kind} onChange={event => onKindChange(event.target.value as RingUse)}>
      <option value="">Choose a ring use</option><option value="speaker">Speaker spacer</option><option value="subwoofer">Subwoofer spacer</option><option value="tweeter">Tweeter adapter</option><option value="general">General ring</option>
    </select>
    <p>{advice[kind]}</p>
    <div className="ring-measurements">
      <svg viewBox="0 0 400 235" role="img" aria-labelledby="ring-diagram-title ring-diagram-desc">
        <title id="ring-diagram-title">Ring measurement diagram</title>
        <desc id="ring-diagram-desc">Top view shows outside diameter across the full ring and opening diameter across the center. Side view shows thickness from bottom to top.</desc>
        <circle cx="110" cy="112" r="75" className="diagram-ring" /><circle cx="110" cy="112" r="40" className="diagram-opening" />
        <line x1="35" y1="112" x2="185" y2="112" className="diagram-dimension" /><line x1="110" y1="72" x2="110" y2="152" className="diagram-dimension diagram-inner" />
        <text x="110" y="25" textAnchor="middle">Outside diameter</text><text x="110" y="208" textAnchor="middle">Opening diameter</text>
        <rect x="250" y="91" width="110" height="42" className="diagram-ring" /><line x1="375" y1="91" x2="375" y2="133" className="diagram-dimension" />
        <text x="305" y="72" textAnchor="middle">Thickness</text><text x="305" y="160" textAnchor="middle">Side view</text>
      </svg>
      <div>
        <p><strong>Outside diameter:</strong> the full width across the ring through its center.</p>
        <p><strong>Opening diameter:</strong> the width across the central opening through its center.</p>
        <p><strong>Thickness:</strong> the distance between the ring’s flat bottom and top.</p>
        <p>Diameter is a straight line across the center; circumference is the distance around the edge. Choose millimeters, centimeters, or inches when entering dimensions. A nominal speaker size is a product label, not a measured dimension; measure the actual parts and space.</p>
      </div>
    </div>
    <p className="field-help">This generator makes one plain concentric ring. It does not add mounting holes, fit allowances, or material compensation. Check the surrounding parts and fit yourself.</p>
  </section>;
}
