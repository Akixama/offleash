"use client";

import { useEffect, useMemo, useState } from "react";
import { createInitialWorld, type Resident, type WorldEvent, type WorldState } from "@/lib/world";

type InfluenceAction = { type: "clue" | "visit" | "word" | "distract" | "mediate"; label: string; detail: string; eventId?: string };

type WorldResponse = {
  world: WorldState;
  player: { influenceAvailable: number; discoveredWords: string[]; lastInfluenceTick: number };
  recap: WorldEvent[];
  influenceHistory: Array<{ id: number; type: string; status: string; outcome: string; createdAt: string }>;
};

function getPlayerId() {
  const key = "offleash-player-id";
  const existing = window.localStorage.getItem(key);
  if (existing) return existing;
  const created = typeof crypto.randomUUID === "function"
    ? crypto.randomUUID()
    : `player-${Date.now()}-${Math.random().toString(36).slice(2)}`;
  window.localStorage.setItem(key, created);
  return created;
}

export default function Home() {
  const [world, setWorld] = useState<WorldState>(() => createInitialWorld());
  const [selectedId, setSelectedId] = useState("miso");
  const [recapOpen, setRecapOpen] = useState(true);
  const [recapEvents, setRecapEvents] = useState<WorldEvent[]>([]);
  const [notice, setNotice] = useState("");
  const [paused, setPaused] = useState(false);
  const [mapZoom, setMapZoom] = useState(1);
  const [syncing, setSyncing] = useState(true);
  const [influenceBusy, setInfluenceBusy] = useState(false);
  const [influenceAvailable, setInfluenceAvailable] = useState(2);
  const [discoveredWords, setDiscoveredWords] = useState<string[]>(["mora"]);
  const [history, setHistory] = useState<WorldResponse["influenceHistory"]>([]);
  const [openPanel, setOpenPanel] = useState<"lexicon" | "archive" | "journal" | "stories" | null>(null);
  const [observedConflictIds, setObservedConflictIds] = useState<string[]>([]);

  const selected = useMemo(
    () => world.residents.find((resident) => resident.id === selectedId) ?? world.residents[0],
    [selectedId, world.residents],
  );
  const relationship = useMemo(
    () => world.relationships.find((item) => item.source === selected.id || item.target === selected.id),
    [selected.id, world.relationships],
  );
  const activeWord = world.lexicon[world.tick % world.lexicon.length] ?? world.lexicon[0];
  const activeEvent = world.events[0];
  const activeStory = world.storyArcs.find((arc) => arc.status === "active") ?? world.storyArcs[0];
  const speaker = world.residents.find((resident) => resident.name.toLowerCase() === activeWord?.inventedBy.toLowerCase()) ?? selected;
  const activeConflict = world.events.find((event) => {
    const isRecentDispute = event.tone === "rose" && event.actors.length > 1 && (event.status === "unresolved" || event.title === "A small dispute started") && world.tick - event.tick <= 3;
    if (!isRecentDispute) return false;
    const hasEnded = world.events.some((laterEvent) => {
      const sameResidents = event.actors.every((actorId) => laterEvent.actors.includes(actorId));
      const isResolution = laterEvent.title === "The dispute changed course" || laterEvent.title === "They settled it themselves";
      return laterEvent.id !== event.id && laterEvent.tick >= event.tick && sameResidents && isResolution;
    });
    return !hasEnded;
  });
  const watchingConflict = activeConflict ? observedConflictIds.includes(activeConflict.id) : false;
  const nudgeStatus = influenceAvailable === 2 ? "2 shared nudges available" : influenceAvailable === 1 ? "1 shared nudge available" : "refills after 3 cycles";
  const influenceActions: InfluenceAction[] = [
    { type: "clue", label: "Leave a clue", detail: `Place a curious brass key near ${selected.name}` },
    { type: "visit", label: "Suggest a visit", detail: `Nudge ${selected.name} toward the courtyard` },
    { type: "word", label: "Share a word", detail: `Teach ${selected.name} what “vekka” means` },
  ];

  const applyResponse = (data: WorldResponse, initial = false) => {
    setWorld(data.world);
    setInfluenceAvailable(data.player.influenceAvailable);
    setDiscoveredWords(data.player.discoveredWords);
    setHistory(data.influenceHistory ?? []);
    if (initial) {
      setRecapEvents(data.recap ?? []);
      setRecapOpen(true);
    }
  };

  useEffect(() => {
    let alive = true;
    const load = async (initial = false) => {
      if (paused && !initial) return;
      try {
        const response = await fetch(`/api/world?visit=${initial ? "1" : "0"}`, {
          cache: "no-store",
          headers: { "x-player-id": getPlayerId() },
        });
        if (!response.ok) throw new Error("World sync failed");
        const data = (await response.json()) as WorldResponse;
        if (alive) applyResponse(data, initial);
      } catch {
        if (alive) setNotice("Maplewood is running locally while the world reconnects.");
      } finally {
        if (alive) setSyncing(false);
      }
    };
    void load(true);
    const timer = window.setInterval(() => void load(false), 15_000);
    return () => { alive = false; window.clearInterval(timer); };
  }, [paused]);

  const influence = async (action: InfluenceAction) => {
    if (!influenceAvailable || influenceBusy) return;
    setInfluenceBusy(true);
    setNotice(`${action.label} sent. ${selected.name} is deciding…`);
    try {
      const response = await fetch("/api/world", {
        method: "POST",
        headers: { "content-type": "application/json", "x-player-id": getPlayerId() },
        body: JSON.stringify({ type: action.type, targetId: selected.id, eventId: action.eventId }),
      });
      const data = await response.json() as { error?: string; world?: WorldState; outcome?: string; influenceAvailable?: number; discoveredWords?: string[] };
      if (!response.ok || !data.world) throw new Error(data.error ?? "The nudge could not be delivered.");
      setWorld(data.world);
      setInfluenceAvailable(data.influenceAvailable ?? 0);
      if (data.discoveredWords) setDiscoveredWords(data.discoveredWords);
      setNotice(data.outcome ?? `${selected.name} made a decision.`);
    } catch (error) {
      setNotice(error instanceof Error ? error.message : "The nudge could not be delivered.");
    } finally {
      setInfluenceBusy(false);
      window.setTimeout(() => setNotice(""), 5200);
    }
  };

  return (
    <main className="app-shell">
      <header className="topbar">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><span>O</span></div>
          <div><strong>OFFLEASH</strong><small>They have lives when you leave.</small></div>
        </div>
        <div className="world-status" aria-label="World status">
          <span className={`live-dot ${syncing ? "syncing" : ""}`} />
          <span>{syncing ? "Listening to Maplewood…" : paused ? "Time is paused here" : "Maplewood is awake"}</span>
          <span className="divider" />
          <span>{world.phase} · Cycle {world.tick}</span>
          <span className="weather-chip">{world.weather}</span>
        </div>
        <div className="top-actions">
          <button className="icon-button" aria-label="Open journal" onClick={() => setOpenPanel("journal")}>⌁</button>
          <button className="profile-button neighborhood-button" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}><span>🐾</span><b>Maplewood</b><em>{world.residents.length} residents</em></button>
        </div>
      </header>

      <section className="workspace">
        <aside className="left-rail">
          <div className="rail-heading"><span>Residents</span><b>{world.residents.length}</b></div>
          <div className="resident-list">
            {world.residents.map((resident) => (
              <button key={resident.id} className={`resident-row ${selectedId === resident.id ? "active" : ""}`} onClick={() => setSelectedId(resident.id)}>
                <span className="avatar" style={{ background: resident.color }}>{resident.icon}</span>
                <span className="resident-copy"><strong>{resident.name}</strong><small>{resident.location}</small></span>
              </button>
            ))}
          </div>
          <button className="lexicon-card" onClick={() => setOpenPanel("lexicon")}>
            <span className="lexicon-symbol">〽</span>
            <span><small>Shared lexicon</small><strong>{world.lexicon.length} living words</strong></span><b>↗</b>
          </button>
        </aside>

        <section className="world-panel">
          <div className="map-toolbar">
            <div><p>MAPLEWOOD · BLOCK 03 · STATE SAVED</p><h1>The neighborhood</h1></div>
            <div className="view-switcher">
              <button className="selected">World</button>
              <button onClick={() => setOpenPanel("stories")}>Stories</button>
              <button onClick={() => { setRecapEvents(world.events.slice(0, 3)); setRecapOpen(true); }}>Recap</button>
              <button onClick={() => setOpenPanel("archive")}>Archive</button>
            </div>
          </div>

          <div className="neighborhood-map">
            <div className="map-canvas" style={{ transform: `scale(${mapZoom})` }}>
              <div className="sky-haze" /><div className="moon">☾</div>
              <div className="map-label label-garden"><span>01</span> Community garden</div>
              <div className="map-label label-roof"><span>02</span> Rooftops</div>
              <div className="map-label label-shop"><span>03</span> Corner shop</div>
              <div className="map-label label-alley"><span>04</span> Back alley</div>
              <div className="building building-left"><div className="window-grid">{Array.from({ length: 8 }).map((_, i) => <i key={i} />)}</div></div>
              <div className="building building-center"><div className="roof-line" /><div className="window-grid">{Array.from({ length: 6 }).map((_, i) => <i key={i} />)}</div></div>
              <div className="shop"><div className="awning" /><strong>MABEL’S</strong><div className="shop-window" /></div>
              <div className="garden"><i /><i /><i /><i /><span className="tree">♣</span></div>
              <div className="courtyard"><span>COURTYARD</span><div className="fountain">◌</div></div>
              <div className="alley-path" />
              {world.residents.map((resident) => <MapResident key={resident.id} resident={resident} selected={selectedId === resident.id} onSelect={setSelectedId} eventActor={activeConflict?.actors.includes(resident.id) ?? activeEvent?.actors.includes(resident.id)} speech={resident.id === speaker.id ? { word: activeWord?.word ?? "vekka", meaning: activeWord && discoveredWords.includes(activeWord.word) ? activeWord.meaning : "Unknown phrase" } : undefined} />)}
            </div>
            <div className="map-legend" aria-label="Map symbol guide"><span><i className="legend-selected" />Selected</span><span><i className="legend-event">!</i>In an active event</span></div>
            <div className="map-controls" aria-label={`Map zoom ${Math.round(mapZoom * 100)} percent`}>
              <button aria-label="Zoom in" disabled={mapZoom >= 1.3} onClick={() => setMapZoom((zoom) => Math.min(1.3, Number((zoom + 0.1).toFixed(1))))}>+</button>
              <button aria-label="Zoom out" disabled={mapZoom <= 0.8} onClick={() => setMapZoom((zoom) => Math.max(0.8, Number((zoom - 0.1).toFixed(1))))}>−</button>
              <button aria-label="Reset map zoom" onClick={() => setMapZoom(1)}>⌖</button>
            </div>
            <div className="cycle-indicator"><span className="live-dot" /> Simulation cycle {world.tick} · next decisions in ~20s</div>
          </div>
        </section>

        <aside className="right-rail">
          <section className="resident-detail">
            <div className="detail-topline"><span>Observing</span><button aria-label="Open resident journal" onClick={() => setOpenPanel("journal")}>memories ↗</button></div>
            <div className="hero-avatar" style={{ background: selected.color }}>{selected.icon}</div>
            <h2>{selected.name}</h2><p>{selected.species} · {selected.trait}</p>
            <div className="mood-row"><span>Mood</span><b><i />{selected.mood}</b></div>
            <div className="goal-card"><small>Current intention</small><strong>“{selected.goal}.”</strong><span>Chosen by {selected.name} · may change next cycle</span></div>
            <div className="vitals"><span><i style={{ width: `${selected.energy}%` }} /><small>Energy {selected.energy}</small></span><span><i style={{ width: `${selected.social}%` }} /><small>Social {selected.social}</small></span></div>
            <div className="relationship-strip">
              <span><small>Affinity</small><strong>{relationship?.affinity ?? 50}</strong></span>
              <span><small>Memories</small><strong>{selected.memories.length}</strong></span>
              <span><small>Words</small><strong>{discoveredWords.length}</strong></span>
            </div>
            {relationship && <p className="relationship-reason">{relationship.reason}</p>}
          </section>

          {activeStory && <button className="story-peek" onClick={() => setOpenPanel("stories")}>
            <span className={`story-glyph ${activeStory.kind}`}>{activeStory.kind === "mystery" ? "◈" : activeStory.kind === "alliance" ? "◎" : "↯"}</span>
            <span className="story-peek-copy"><small>Ongoing story · stage {activeStory.stage} of {activeStory.totalStages}</small><strong>{activeStory.title}</strong><em>{activeStory.currentBeat}</em><i><b style={{ width: `${(activeStory.stage / activeStory.totalStages) * 100}%` }} /></i></span>
            <span className="story-people">{activeStory.participants.map((id) => world.residents.find((resident) => resident.id === id)?.icon).join(" ")}<small>View all →</small></span>
          </button>}

          <section className="live-feed">
            <div className="feed-title"><span>Happening now</span><button onClick={() => setPaused((value) => !value)}>{paused ? "Resume" : "Pause"}</button></div>
            <article className={`featured-event ${world.events[0]?.tone ?? "amber"}`}>
              <div className="event-icon">{world.events[0]?.icon ?? "◉"}</div>
              <div><small>{world.events[0]?.time ?? "Now"}</small><strong>{world.events[0]?.title ?? "The world is listening"}</strong><p>{world.events[0]?.body}</p></div>
            </article>
            {activeConflict && <div className={`event-choice ${activeConflict.id !== activeEvent?.id ? "persisted-conflict" : ""}`}>
              {activeConflict.id !== activeEvent?.id && <div className="unresolved-heading"><b>Unresolved dispute</b><small>{activeConflict.body}</small></div>}
              <span>{watchingConflict ? "You are leaving them to decide" : "Choose how to respond"}</span>
              <div>
                <button disabled={!influenceAvailable || influenceBusy || watchingConflict} onClick={() => influence({ type: "mediate", label: "Help them settle", detail: "Ask Luma to mediate", eventId: activeConflict.id })}>Help them settle <small>1 nudge</small></button>
                <button disabled={!influenceAvailable || influenceBusy || watchingConflict} onClick={() => influence({ type: "distract", label: "Create a distraction", detail: "Break their focus", eventId: activeConflict.id })}>Distract them <small>1 nudge</small></button>
                <button className="observe-choice" disabled={watchingConflict} onClick={() => { setObservedConflictIds((ids) => [...ids, activeConflict.id]); setNotice("You chose not to intervene. Maplewood will show you what they decide within 3 cycles."); window.setTimeout(() => setNotice(""), 5200); }}>Leave them alone <small>free</small></button>
              </div>
              <small>{watchingConflict ? "No nudge spent. The dispute will continue without you." : "The dispute remains here for 3 cycles, even when newer events appear."}</small>
            </div>}
            {world.events.slice(1, 4).map((event) => <article className="feed-row" key={event.id}><span>{event.time}</span><div><strong>{event.title}</strong><p>{event.body}</p></div></article>)}
          </section>

          <section className="influence-box">
            <div><span>Influence {selected.name}</span><small>{nudgeStatus}</small></div>
            {influenceActions.map((action) => <button key={action.type} disabled={!influenceAvailable || influenceBusy} onClick={() => influence(action)}><span><strong>{action.label}</strong><small>{action.detail}</small></span><b>→</b></button>)}
            <p>{selected.name} may accept, reinterpret or ignore your suggestion.</p>
          </section>
        </aside>
      </section>

      <footer className="world-footer">
        <span>Maplewood · Block 03</span>
        <strong>They keep living when you leave.</strong>
        <span>World saved · Cycle {world.tick}</span>
      </footer>

      {notice && <div className="toast"><span>{influenceBusy ? "…" : "✓"}</span>{notice}</div>}
      {recapOpen && <Recap events={recapEvents.length ? recapEvents : world.events.slice(0, 3)} tick={world.tick} onClose={() => setRecapOpen(false)} />}
      {openPanel && <WorldPanel kind={openPanel} world={world} selected={selected} discoveredWords={discoveredWords} history={history} onClose={() => setOpenPanel(null)} />}
    </main>
  );
}

function MapResident({ resident, selected, onSelect, eventActor, speech }: { resident: Resident; selected: boolean; onSelect: (id: string) => void; eventActor?: boolean; speech?: { word: string; meaning: string } }) {
  const speechSide = resident.x > 68 ? "left" : resident.x < 32 ? "right" : "center";
  return (
    <button className={`map-resident ${selected ? "selected" : ""} ${speech ? "speaking" : ""}`} style={{ left: `${resident.x}%`, top: `${resident.y}%`, "--avatar-color": resident.color } as React.CSSProperties} onClick={() => onSelect(resident.id)} aria-label={`Observe ${resident.name}`}>
      {speech && <div className={`speech-bubble anchored-speech speech-${speechSide}`}><span>{resident.name}</span><strong>“{speech.word}! Mora tikka.”</strong><small>{speech.meaning} · vocabulary evolves</small></div>}
      <span>{resident.icon}</span><b>{resident.name}</b>{eventActor && <em className="event-ring" title="Involved in an active event">!</em>}
    </button>
  );
}

function Recap({ events, tick, onClose }: { events: WorldEvent[]; tick: number; onClose: () => void }) {
  return (
    <div className="recap-backdrop" role="dialog" aria-modal="true" aria-label="While you were away">
      <section className="recap-modal">
        <div className="recap-art"><span className="recap-moon">☾</span><div className="recap-roof" /><span className="recap-cat">🐈</span><i className="star-one">✦</i><i className="star-two">·</i></div>
        <div className="recap-content">
          <small className="eyebrow">THE WORLD ADVANCED TO CYCLE {tick}</small><h2>The neighborhood<br />didn’t wait.</h2>
          <div className="recap-events">{events.slice(0, 3).map((event, index) => <article key={event.id}><span>0{index + 1}</span><div><strong>{event.title}</strong><p>{event.body}</p></div></article>)}</div>
          <button className="enter-button" onClick={onClose}>Enter Maplewood <span>→</span></button><p className="recap-footnote">Every event changed persistent world state.</p>
        </div>
      </section>
    </div>
  );
}

function WorldPanel({ kind, world, selected, discoveredWords, history, onClose }: { kind: "lexicon" | "archive" | "journal" | "stories"; world: WorldState; selected: Resident; discoveredWords: string[]; history: WorldResponse["influenceHistory"]; onClose: () => void }) {
  const titles = { lexicon: "The living lexicon", archive: "Maplewood archive", journal: `${selected.name}’s memory`, stories: "Neighborhood stories" };
  const subtitles = { lexicon: "Words gain meaning through repeated use.", archive: "Nothing important disappears from the neighborhood.", journal: "Recent experiences shape future decisions.", stories: "Threads unfold across many cycles and leave permanent consequences." };
  return (
    <div className="panel-backdrop" role="dialog" aria-modal="true" aria-label={titles[kind]} onMouseDown={(event) => { if (event.currentTarget === event.target) onClose(); }}>
      <section className="world-drawer">
        <header><div><small>MAPLEWOOD RECORDS</small><h2>{titles[kind]}</h2><p>{subtitles[kind]}</p></div><button onClick={onClose} aria-label="Close panel">×</button></header>
        {kind === "lexicon" && <div className="word-list">{world.lexicon.map((word) => { const known = discoveredWords.includes(word.word); return <article key={word.word} className={!known ? "unknown" : ""}><div><strong>{known ? word.word : "•••••"}</strong><span>{known ? word.meaning : "Meaning not yet discovered"}</span></div><em>{word.confidence}% stable</em><p>{known ? word.origin : `Used ${word.useCount} times around Maplewood.`}</p><small>coined by {word.inventedBy} · {word.useCount} uses</small></article>; })}</div>}
        {kind === "archive" && <div className="archive-list">{world.events.map((event) => <article key={event.id}><span>{event.icon}</span><div><small>CYCLE {event.tick}</small><strong>{event.title}</strong><p>{event.body}</p></div></article>)}</div>}
        {kind === "stories" && <div className="story-list">{world.storyArcs.map((arc) => <article key={arc.id} className={`${arc.kind} ${arc.status}`}>
          <header><span>{arc.kind === "mystery" ? "◈" : arc.kind === "alliance" ? "◎" : "↯"}</span><div><small>{arc.kind} · {arc.status}</small><strong>{arc.title}</strong></div><em>{arc.stage}/{arc.totalStages}</em></header>
          <p>{arc.summary}</p>
          <div className="story-participants">{arc.participants.map((id) => { const resident = world.residents.find((item) => item.id === id); return resident ? <span key={id}><i style={{ background: resident.color }}>{resident.icon}</i>{resident.name}</span> : null; })}</div>
          <ol>{arc.beats.map((beat, index) => <li key={beat} className={index + 1 < arc.stage ? "past" : index + 1 === arc.stage ? "current" : "future"}><span>{index + 1 < arc.stage ? "✓" : index + 1}</span><p>{index + 1 <= arc.stage ? beat : "Not discovered yet"}</p></li>)}</ol>
          {arc.outcome && <blockquote>{arc.outcome}</blockquote>}
        </article>)}</div>}
        {kind === "journal" && <><div className="memory-list">{selected.memories.map((memory) => <article key={memory.id}><span>{memory.salience}</span><div><small>CYCLE {memory.tick} · SALIENCE</small><p>{memory.summary}</p></div></article>)}</div><div className="influence-history"><h3>Your trace in Maplewood</h3>{history.length ? history.map((item) => <p key={item.id}><b>{item.status}</b>{item.outcome}</p>) : <p>No previous nudges. The first one will become part of the neighborhood’s history.</p>}</div></>}
      </section>
    </div>
  );
}
