export default function PhotoSetupGuide() {
  return <section className="photo-setup-guide" aria-labelledby="photo-setup-title">
    <div>
      <span className="photo-setup-kicker">BEFORE YOU START</span>
      <h3 id="photo-setup-title">Set up a useful photo</h3>
      <p>Place a known-length reference beside the part, in the same plane and parallel to the span you want to measure. Aim the camera as close to straight on as possible.</p>
      <p className="photo-setup-note">This illustration shows the setup, not a measured part. Photo results are estimates to check with calipers.</p>
    </div>
    <svg viewBox="0 0 340 170" role="img" aria-labelledby="photo-setup-svg-title photo-setup-svg-description">
      <title id="photo-setup-svg-title">Example top-view photo setup</title>
      <desc id="photo-setup-svg-description">A ring is placed beside a ruler, with the reference and diameter aligned in the same direction.</desc>
      <rect x="8" y="8" width="324" height="154" rx="14" className="photo-setup-surface" />
      <circle cx="100" cy="76" r="46" className="photo-setup-ring" />
      <circle cx="100" cy="76" r="25" className="photo-setup-opening" />
      <path d="M54 76H146 M54 70V82 M146 70V82" className="photo-setup-target" />
      <rect x="43" y="132" width="137" height="12" rx="2" className="photo-setup-ruler" />
      <path d="M55 132V139 M70 132V141 M85 132V139 M100 132V141 M115 132V139 M130 132V141 M145 132V139 M160 132V141" className="photo-setup-ruler-ticks" />
      <text x="203" y="72">TARGET SPAN</text>
      <path d="M191 76H158" className="photo-setup-target" />
      <text x="203" y="136">REFERENCE</text>
      <path d="M191 138H182" className="photo-setup-reference-line" />
    </svg>
  </section>;
}
