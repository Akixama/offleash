export type Memory = {
  id: string;
  tick: number;
  summary: string;
  salience: number;
};

export type Resident = {
  id: string;
  name: string;
  species: string;
  icon: string;
  mood: string;
  trait: string;
  goal: string;
  location: string;
  x: number;
  y: number;
  color: string;
  energy: number;
  social: number;
  memories: Memory[];
  owned?: boolean;
};

export type Relationship = {
  source: string;
  target: string;
  affinity: number;
  trust: number;
  tension: number;
  reason: string;
};

export type WorldEvent = {
  id: string;
  tick: number;
  time: string;
  icon: string;
  title: string;
  body: string;
  tone: "amber" | "sage" | "blue" | "rose";
  actors: string[];
  status?: "unresolved" | "resolved";
};

export type Word = {
  word: string;
  meaning: string;
  confidence: number;
  useCount: number;
  inventedBy: string;
  origin: string;
};

export type StoryArc = {
  id: string;
  kind: "mystery" | "alliance" | "rivalry";
  title: string;
  summary: string;
  participants: string[];
  stage: number;
  totalStages: number;
  currentBeat: string;
  beats: string[];
  status: "active" | "completed";
  startedTick: number;
  lastAdvancedTick: number;
  outcome?: string;
};

export type WorldState = {
  tick: number;
  phase: "Dawn" | "Morning" | "Afternoon" | "Dusk" | "Night";
  weather: string;
  lastSimulatedAt: string;
  residents: Resident[];
  relationships: Relationship[];
  events: WorldEvent[];
  lexicon: Word[];
  storyArcs: StoryArc[];
};

const baseResidents: Array<Omit<Resident, "memories">> = [
  { id: "miso", name: "Miso", species: "Alley cat", icon: "🐈", mood: "Curious", trait: "Restless collector", goal: "Find out what Pip is hiding", location: "Rooftops", x: 48, y: 23, color: "#f0a45d", energy: 76, social: 58, owned: true },
  { id: "pip", name: "Pip", species: "Terrier", icon: "🐕", mood: "Secretive", trait: "Fast-talking scout", goal: "Protect the blue tin", location: "Back alley", x: 67, y: 57, color: "#d98162", energy: 82, social: 66 },
  { id: "moss", name: "Moss", species: "Pigeon", icon: "🐦", mood: "Watchful", trait: "Knows every shortcut", goal: "Map the morning food route", location: "Corner shop", x: 80, y: 29, color: "#86a7a0", energy: 64, social: 47 },
  { id: "taro", name: "Taro", species: "Shiba", icon: "🐕", mood: "Proud", trait: "Unofficial mayor", goal: "Call a courtyard meeting", location: "Courtyard", x: 39, y: 63, color: "#d99553", energy: 68, social: 88 },
  { id: "nox", name: "Nox", species: "Black cat", icon: "🐈‍⬛", mood: "Sleepy", trait: "Night wanderer", goal: "Recover a missing bell", location: "Drain tunnel", x: 20, y: 72, color: "#5c626a", energy: 39, social: 30 },
  { id: "bea", name: "Bea", species: "Corgi", icon: "🐕", mood: "Delighted", trait: "Trades in rumours", goal: "Learn the word ‘vekka’", location: "Garden", x: 22, y: 38, color: "#e2a65e", energy: 71, social: 91 },
  { id: "fig", name: "Fig", species: "Raccoon", icon: "🦝", mood: "Scheming", trait: "Inventive scavenger", goal: "Build a rain catcher", location: "Back alley", x: 73, y: 72, color: "#85827c", energy: 79, social: 42 },
  { id: "luma", name: "Luma", species: "Rabbit", icon: "🐇", mood: "Uneasy", trait: "Gentle mediator", goal: "Settle the garden dispute", location: "Garden", x: 29, y: 49, color: "#ddd0c2", energy: 59, social: 84 },
  { id: "sol", name: "Sol", species: "Sun conure", icon: "🦜", mood: "Loud", trait: "Compulsive storyteller", goal: "Teach everyone a new warning", location: "Rooftops", x: 58, y: 14, color: "#e6bd4d", energy: 91, social: 94 },
  { id: "juniper", name: "Juniper", species: "Greyhound", icon: "🐕", mood: "Focused", trait: "Silent courier", goal: "Deliver a message to Nox", location: "Corner shop", x: 86, y: 47, color: "#b9a38c", energy: 73, social: 52 },
  { id: "clover", name: "Clover", species: "Hamster", icon: "🐹", mood: "Busy", trait: "Tiny archivist", goal: "Record today’s new words", location: "Courtyard", x: 51, y: 73, color: "#c88a67", energy: 62, social: 72 },
  { id: "otto", name: "Otto", species: "Old bulldog", icon: "🐶", mood: "Sceptical", trait: "Keeper of old rules", goal: "Inspect Fig’s invention", location: "Courtyard", x: 59, y: 51, color: "#9c8068", energy: 43, social: 61 },
];

const initialEvents: WorldEvent[] = [
  { id: "event-0", tick: 0, time: "Now", icon: "◉", title: "A meeting is forming", body: "Taro has called everyone in the courtyard. Miso is watching from above.", tone: "amber", actors: ["taro", "miso"] },
  { id: "event--1", tick: -1, time: "2m", icon: "↗", title: "Moss changed route", body: "A delivery bicycle blocked the usual path behind the corner shop.", tone: "sage", actors: ["moss"] },
  { id: "event--2", tick: -2, time: "5m", icon: "✦", title: "A new word appeared", body: "Sol used “vekka” when the shop shutters rattled. Bea repeated it.", tone: "blue", actors: ["sol", "bea"] },
  { id: "event--3", tick: -3, time: "8m", icon: "?", title: "The blue tin moved", body: "Pip carried it into the alley. Fig noticed, but pretended not to.", tone: "rose", actors: ["pip", "fig"] },
];

function createStoryArcs(startedTick = 0): StoryArc[] {
  return [
    { id: `arc-blue-tin-${startedTick}`, kind: "mystery", title: "The blue tin", summary: "Miso is trying to learn why Pip keeps moving a dented blue tin through the alleys.", participants: ["miso", "pip", "fig"], stage: 1, totalStages: 4, currentBeat: "Fig saw Pip hide the tin, but has not told Miso.", beats: ["Fig saw Pip hide the tin, but has not told Miso.", "A strange map was found beneath the tin's loose lining.", "Miso traced one mark on the map to the drain tunnel.", "Pip finally explained who the tin was meant to protect."], status: "active", startedTick, lastAdvancedTick: startedTick },
    { id: `arc-rooftop-call-${startedTick}`, kind: "alliance", title: "The rooftop signal", summary: "Bea, Sol, and Moss are slowly building a warning system that the whole neighborhood may trust.", participants: ["bea", "sol", "moss"], stage: 1, totalStages: 4, currentBeat: "Sol invented a call, but Moss doubts anyone will understand it.", beats: ["Sol invented a call, but Moss doubts anyone will understand it.", "Bea tested the call near Mabel's shutters.", "Moss changed the call so it carries between rooftops.", "The three used the signal together before the rain arrived."], status: "active", startedTick, lastAdvancedTick: startedTick },
    { id: `arc-courtyard-rules-${startedTick}`, kind: "rivalry", title: "Rules of the courtyard", summary: "Taro wants order. Fig keeps proving that the neighborhood survives through improvisation.", participants: ["taro", "fig", "luma"], stage: 1, totalStages: 4, currentBeat: "Taro blamed Fig for moving the meeting marker.", beats: ["Taro blamed Fig for moving the meeting marker.", "Fig broke a rule to solve a problem Taro had missed.", "Luma asked both of them to defend the rule they wanted.", "Taro and Fig wrote one new rule they could both live with."], status: "active", startedTick, lastAdvancedTick: startedTick },
  ];
}

export function normalizeWorld(input: WorldState): WorldState {
  if (!Array.isArray(input.storyArcs)) input.storyArcs = createStoryArcs(input.tick);
  return input;
}

export function createInitialWorld(): WorldState {
  return {
    tick: 0,
    phase: "Dusk",
    weather: "Rain approaching",
    lastSimulatedAt: new Date().toISOString(),
    residents: baseResidents.map((resident) => ({
      ...resident,
      memories: [
        { id: `memory-${resident.id}-0`, tick: 0, summary: `${resident.name} noticed the courtyard growing unusually quiet.`, salience: 42 },
      ],
    })),
    relationships: [
      { source: "miso", target: "pip", affinity: 63, trust: 54, tension: 31, reason: "Miso suspects Pip is hiding something interesting." },
      { source: "miso", target: "bea", affinity: 78, trust: 69, tension: 8, reason: "Bea always shares useful rooftop rumours." },
      { source: "miso", target: "taro", affinity: 52, trust: 47, tension: 22, reason: "Miso respects Taro but dislikes being instructed." },
      { source: "taro", target: "fig", affinity: 35, trust: 29, tension: 72, reason: "Fig treats every courtyard rule as optional." },
      { source: "luma", target: "taro", affinity: 71, trust: 76, tension: 17, reason: "They solve neighborhood disputes together." },
      { source: "bea", target: "sol", affinity: 86, trust: 73, tension: 5, reason: "They collect and spread new words together." },
    ],
    events: initialEvents,
    lexicon: [
      { word: "mora", meaning: "friend nearby", confidence: 94, useCount: 23, inventedBy: "moss", origin: "A rooftop call used when returning with food." },
      { word: "vekka", meaning: "warning / sudden noise", confidence: 48, useCount: 6, inventedBy: "sol", origin: "First heard when Mabel’s shutters rattled." },
      { word: "tikka", meaning: "share this", confidence: 71, useCount: 14, inventedBy: "bea", origin: "Began as a request for part of a biscuit." },
      { word: "sorra", meaning: "safe path", confidence: 62, useCount: 9, inventedBy: "juniper", origin: "Used while guiding Nox through the drain tunnel." },
    ],
    storyArcs: createStoryArcs(0),
  };
}

const locationPositions: Record<string, Array<[number, number]>> = {
  Rooftops: [[46, 22], [58, 14], [35, 28]],
  "Back alley": [[72, 67], [82, 76], [68, 54]],
  "Corner shop": [[82, 29], [87, 46], [76, 39]],
  Courtyard: [[41, 62], [52, 74], [60, 52]],
  Garden: [[22, 39], [29, 50], [17, 64]],
  "Drain tunnel": [[19, 73], [25, 79], [15, 68]],
};

const phases: WorldState["phase"][] = ["Dawn", "Morning", "Afternoon", "Dusk", "Night"];
const moods = ["Curious", "Watchful", "Restless", "Content", "Suspicious", "Determined", "Playful", "Sleepy"];

function pick<T>(items: T[], seed: number): T {
  return items[Math.abs(seed) % items.length];
}

function remember(resident: Resident, tick: number, summary: string, salience = 60) {
  resident.memories = [
    { id: `memory-${resident.id}-${tick}-${resident.memories.length}`, tick, summary, salience },
    ...resident.memories,
  ].slice(0, 8);
}

function relation(world: WorldState, source: string, target: string) {
  let found = world.relationships.find((item) => item.source === source && item.target === target);
  if (!found) {
    found = { source, target, affinity: 50, trust: 45, tension: 15, reason: "They are still forming an opinion of each other." };
    world.relationships.push(found);
  }
  return found;
}

function advanceStoryArc(world: WorldState, tick: number): WorldEvent | undefined {
  if (tick % 4 !== 0) return undefined;
  let active = world.storyArcs.filter((arc) => arc.status === "active");
  if (!active.length) {
    const next = createStoryArcs(tick)[Math.floor(tick / 4) % 3];
    next.id = `${next.id}-next`;
    world.storyArcs.unshift(next);
    active = [next];
  }
  const arc = active[Math.floor(tick / 4) % active.length];
  if (arc.lastAdvancedTick === tick) return undefined;
  arc.stage = Math.min(arc.totalStages, arc.stage + 1);
  arc.currentBeat = arc.beats[arc.stage - 1];
  arc.lastAdvancedTick = tick;
  const residents = arc.participants.map((id) => world.residents.find((resident) => resident.id === id)).filter((resident): resident is Resident => Boolean(resident));
  residents.forEach((resident) => remember(resident, tick, `${arc.title}: ${arc.currentBeat}`, 72 + arc.stage * 4));

  if (arc.stage >= arc.totalStages) {
    arc.status = "completed";
    arc.outcome = arc.kind === "mystery" ? "The secret became shared knowledge." : arc.kind === "alliance" ? "A dependable alliance formed." : "The rivalry became a workable respect.";
    const bond = relation(world, arc.participants[0], arc.participants[1]);
    if (arc.kind === "rivalry") {
      bond.tension = Math.max(0, bond.tension - 18);
      bond.trust = Math.min(100, bond.trust + 8);
    } else {
      bond.affinity = Math.min(100, bond.affinity + 9);
      bond.trust = Math.min(100, bond.trust + 10);
    }
    bond.reason = `${arc.title} permanently changed how they see each other.`;
  }

  return { id: `story-${arc.id}-${tick}`, tick, time: "Now", icon: arc.status === "completed" ? "◆" : "◈", title: arc.status === "completed" ? `Story concluded: ${arc.title}` : `Story advanced: ${arc.title}`, body: arc.status === "completed" ? `${arc.currentBeat} ${arc.outcome}` : arc.currentBeat, tone: arc.kind === "rivalry" ? "rose" : arc.kind === "alliance" ? "sage" : "blue", actors: arc.participants, status: "resolved" };
}

export function simulateWorld(input: WorldState, cycles: number): WorldState {
  const world: WorldState = normalizeWorld(JSON.parse(JSON.stringify(input)));
  for (let index = 0; index < cycles; index += 1) {
    world.tick += 1;
    const tick = world.tick;
    world.phase = phases[Math.floor(tick / 4) % phases.length];
    const actor = world.residents[tick % world.residents.length];
    const other = world.residents[(tick * 5 + 3) % world.residents.length];
    const kind = tick % 5;
    let event: WorldEvent;
    const expiringConflict = world.events.find((item) => item.tone === "rose" && (item.status === "unresolved" || item.title === "A small dispute started") && tick - item.tick === 3);

    if (expiringConflict) {
      expiringConflict.status = "resolved";
      const residents = expiringConflict.actors.map((id) => world.residents.find((resident) => resident.id === id)).filter((resident): resident is Resident => Boolean(resident));
      residents.forEach((resident) => {
        resident.mood = "Reflective";
        remember(resident, tick, "A disagreement ended without outside help.", 62);
      });
      event = { id: `event-${tick}-resolution`, tick, time: "Now", icon: "✓", title: "They settled it themselves", body: `${residents.map((resident) => resident.name).join(" and ")} found their own way out of the disagreement.`, tone: "sage", actors: expiringConflict.actors, status: "resolved" };
    } else if (kind === 0) {
      const destinations = Object.keys(locationPositions);
      const destination = pick(destinations, tick + actor.name.length);
      actor.location = destination;
      const point = pick(locationPositions[destination], tick);
      [actor.x, actor.y] = point;
      actor.goal = `Learn why ${other.name} keeps visiting the ${destination.toLowerCase()}`;
      actor.mood = pick(moods, tick + actor.id.length);
      remember(actor, tick, `${actor.name} followed ${other.name} to the ${destination.toLowerCase()}.`, 55);
      event = { id: `event-${tick}`, tick, time: "Now", icon: "↗", title: `${actor.name} changed course`, body: `${actor.name} abandoned the usual routine and followed ${other.name} toward the ${destination.toLowerCase()}.`, tone: "sage", actors: [actor.id, other.id] };
    } else if (kind === 1) {
      const bond = relation(world, actor.id, other.id);
      bond.affinity = Math.min(100, bond.affinity + 3);
      bond.trust = Math.min(100, bond.trust + 2);
      bond.reason = `${other.name} shared something useful during a quiet conversation.`;
      actor.social = Math.min(100, actor.social + 4);
      remember(actor, tick, `${other.name} shared a useful detail with ${actor.name}.`, 68);
      remember(other, tick, `${actor.name} listened without interrupting.`, 51);
      event = { id: `event-${tick}`, tick, time: "Now", icon: "◌", title: "A quiet alliance grew", body: `${actor.name} and ${other.name} exchanged information away from the courtyard crowd.`, tone: "amber", actors: [actor.id, other.id] };
    } else if (kind === 2) {
      const word = pick(world.lexicon, tick);
      word.useCount += 1;
      word.confidence = Math.min(99, word.confidence + 2);
      remember(actor, tick, `${actor.name} heard “${word.word}” used to mean ${word.meaning}.`, 49);
      event = { id: `event-${tick}`, tick, time: "Now", icon: "✦", title: `“${word.word}” is spreading`, body: `${actor.name} used the word near ${other.name}. Its meaning is becoming more stable.`, tone: "blue", actors: [actor.id, other.id] };
    } else if (kind === 3) {
      actor.energy = Math.max(15, actor.energy - 6);
      other.energy = Math.min(100, other.energy + 3);
      const bond = relation(world, actor.id, other.id);
      bond.tension = Math.min(100, bond.tension + 4);
      bond.reason = `${actor.name} and ${other.name} disagreed over a found object.`;
      actor.mood = "Suspicious";
      remember(actor, tick, `${other.name} claimed a found object before ${actor.name} could inspect it.`, 76);
      event = { id: `event-${tick}`, tick, time: "Now", icon: "?", title: "A small dispute started", body: `${actor.name} and ${other.name} both claimed the same found object. Neither has backed down.`, tone: "rose", actors: [actor.id, other.id], status: "unresolved" };
    } else {
      world.weather = pick(["Clear and cool", "Light rain", "Wind through the alleys", "Warm pavement"], tick);
      actor.energy = Math.min(100, actor.energy + 7);
      actor.goal = `Prepare for ${world.weather.toLowerCase()}`;
      remember(actor, tick, `${actor.name} noticed the weather change before the others.`, 44);
      event = { id: `event-${tick}`, tick, time: "Now", icon: "☁", title: "The neighborhood shifted", body: `${world.weather} changed where the residents planned to gather. ${actor.name} noticed first.`, tone: "blue", actors: [actor.id] };
    }

    const storyEvent = advanceStoryArc(world, tick);
    const newEvents = storyEvent ? [storyEvent, event] : [event];
    world.events = [...newEvents, ...world.events].map((item, eventIndex) => ({ ...item, time: eventIndex === 0 ? "Now" : eventIndex === 1 ? "2m" : `${(eventIndex + 1) * 3}m` })).slice(0, 18);
  }
  world.lastSimulatedAt = new Date().toISOString();
  return world;
}

export function applyInfluence(worldInput: WorldState, type: string, targetId = "miso", eventId?: string) {
  const world: WorldState = JSON.parse(JSON.stringify(worldInput));
  const target = world.residents.find((resident) => resident.id === targetId) ?? world.residents[0];
  const accepted = (world.tick + type.length + target.id.length) % 5 !== 0;
  const conflict = eventId ? world.events.find((event) => event.id === eventId && event.tone === "rose" && event.status !== "resolved") : undefined;
  const conflictResidents = conflict?.actors.map((id) => world.residents.find((resident) => resident.id === id)).filter((resident): resident is Resident => Boolean(resident)) ?? [];
  let outcome: string;

  if (!accepted) {
    outcome = conflict ? `${conflictResidents.map((resident) => resident.name).join(" and ")} noticed your attempt, but continued the dispute.` : `${target.name} noticed the suggestion, then chose to continue their own investigation.`;
    remember(target, world.tick, "A gentle suggestion arrived, but it did not feel urgent.", 35);
  } else if (type === "distract" && conflict) {
    conflictResidents.forEach((resident) => {
      resident.mood = "Startled";
      resident.goal = "Find the source of the sudden clatter";
      remember(resident, world.tick, "A sudden clatter interrupted an unresolved disagreement.", 64);
    });
    outcome = `A sudden clatter broke ${conflictResidents.map((resident) => resident.name).join(" and ")} apart before the dispute could settle.`;
  } else if (type === "mediate" && conflict) {
    const mediator = world.residents.find((resident) => !conflict.actors.includes(resident.id) && resident.trait.toLowerCase().includes("mediator")) ?? world.residents.find((resident) => !conflict.actors.includes(resident.id))!;
    conflictResidents.forEach((resident) => {
      resident.mood = "Listening";
      resident.goal = `Hear ${mediator.name} out before deciding what to do`;
      remember(resident, world.tick, `${mediator.name} stepped in before the disagreement grew.`, 78);
    });
    const bond = world.relationships.find((item) => conflict.actors.includes(item.source) && conflict.actors.includes(item.target));
    if (bond) bond.tension = Math.max(0, bond.tension - 14);
    outcome = `${mediator.name} stepped between ${conflictResidents.map((resident) => resident.name).join(" and ")}. They agreed to pause, not necessarily forgive.`;
  } else if (type === "clue") {
    target.goal = "Work out what the brass key opens";
    target.mood = "Determined";
    outcome = `${target.name} accepted the brass key and tucked it into a secret spot nearby.`;
    remember(target, world.tick, "A brass key appeared nearby without explanation.", 91);
  } else if (type === "visit") {
    target.location = "Courtyard";
    [target.x, target.y] = [46 + (target.id.length % 4) * 3, 62 + (target.id.length % 3) * 4];
    target.goal = "Find out why everyone is gathering in the courtyard";
    outcome = `${target.name} interpreted the nudge as a reason to observe the courtyard meeting nearby.`;
    remember(target, world.tick, `A sudden curiosity pulled ${target.name} toward the courtyard.`, 67);
  } else if (type === "word") {
    const vekka = world.lexicon.find((word) => word.word === "vekka")!;
    vekka.confidence = Math.min(99, vekka.confidence + 8);
    vekka.useCount += 2;
    outcome = `${target.name} connected “vekka” with sudden danger and repeated it to a neighbor.`;
    remember(target, world.tick, "The word “vekka” means danger that arrives without warning.", 82);
  } else {
    outcome = "The moment passed before your nudge could change it.";
  }

  const isIntervention = type === "distract" || type === "mediate";
  if (conflict && accepted && isIntervention) conflict.status = "resolved";
  const influenceEvent: WorldEvent = { id: `influence-${world.tick}-${type}-${target.id}`, tick: world.tick, time: "Now", icon: accepted ? "◇" : "·", title: accepted ? (isIntervention ? "The dispute changed course" : `${target.name} interpreted your nudge`) : (isIntervention ? "The dispute continued" : `${target.name} chose their own path`), body: outcome, tone: accepted ? "amber" : "sage", actors: conflict?.actors ?? [target.id] };
  world.events = [influenceEvent, ...world.events].slice(0, 18);
  world.lastSimulatedAt = new Date().toISOString();
  return { world, accepted, outcome };
}
