
import { completeOnboardingAction } from "@/lib/actions";

const tracks = ["student", "researcher", "educator", "science creator", "institution lead"];

export default function OnboardingPage() {
  return (
    <section className="stack">
      <div className="hero-banner">
        <div className="stack">
          <span className="badge">Welcome aboard</span>
          <h1 className="page-title">Tailor Science Platform to the way you learn, teach, and collaborate.</h1>
          <p className="page-copy">
            Pick your track, save your interests, and land in the parts of the product that matter most on day one.
          </p>
        </div>
      </div>

      <div className="grid two">
        <form className="card form" action={completeOnboardingAction}>
          <h2>Complete onboarding</h2>
          <label>
            Track
            <select name="track" defaultValue="student">
              {tracks.map((track) => (
                <option key={track} value={track}>
                  {track}
                </option>
              ))}
            </select>
          </label>
          <label>
            Goals
            <input name="goals" placeholder="exam prep, research collaboration, mentorship" />
          </label>
          <label>
            Interests
            <input name="interests" placeholder="physics, chemistry, biology, neuroscience" />
          </label>
          <label>
            Experience
            <textarea name="experience" rows={5} placeholder="Tell us what level you are at and what you want the platform to help with." />
          </label>
          <button className="button" type="submit">
            Save and continue
          </button>
        </form>

        <div className="stack">
          <div className="card">
            <h3>What this unlocks</h3>
            <div className="card-list">
              <div className="row"><span className="inline-badge">1</span><span>Better community and workspace recommendations</span></div>
              <div className="row"><span className="inline-badge">2</span><span>Smarter AI study prompts and resource vault defaults</span></div>
              <div className="row"><span className="inline-badge">3</span><span>Cleaner dashboard and onboarding metrics for activation</span></div>
            </div>
          </div>
          <div className="card">
            <h3>Suggested starter tracks</h3>
            <p className="muted">Students start with communities, study groups, AI, and calls. Researchers start with labs, recordings, semantic search, and workspaces.</p>
          </div>
        </div>
      </div>
    </section>
  );
}
