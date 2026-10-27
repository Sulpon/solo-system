// Index cards: one task per card, the way people carry them on paper.
//
// WHY THIS IS NOT A QUEST AND NOT A NOTE
//
// A Quest is an RPG construct - it carries XP, mastery, streaks, cadence
// and feeds progression. A Note is knowledge capture: an idea, a link,
// something to read. A card is neither. It is one concrete thing to do,
// written down to get it out of your head, shuffled through by hand, and
// thrown away when done. Forcing it into either of the others would mean
// inheriting fields that make no sense (a card has no streak) or losing
// the ones that do (a note has nowhere to be scheduled).
//
// WHAT THE PHYSICAL VERSION DOES THAT THIS MUST PRESERVE
//
//   One idea per card.    Hence `title` carries the whole point, and is
//                         the only required field. A card you cannot read
//                         the point of at a glance has failed.
//   The top is visible.   A deck is riffled, not paged through. The stack
//                         view shows every card's top strip at once, so
//                         the whole deck is readable without clicking.
//   Cards move by hand.   Categorising, scheduling and finishing are all
//                         just moving a card somewhere - never filling in
//                         a form.

export type CardStatus = "inbox" | "active" | "done";

export const CARD_STATUSES: ReadonlyArray<CardStatus> = ["inbox", "active", "done"];

// A deck is a category - Work, Training, Home, Relationships. User-defined
// rather than a fixed enum: the whole point of the method is that the
// categories match this person's life, not a product's idea of one.
export type CardDeck = Readonly<{
  id: string;
  name: string;
  // A Tailwind background class, same convention as Category.accent, so
  // decks look like the rest of Atlas without a second colour system.
  accent: string;
  order: number;
  createdAt: string;
  updatedAt: string;
}>;

export type IndexCard = Readonly<{
  id: string;
  // The one thing this card is about. Shown on the visible top strip, so
  // it is written to be read in a glance.
  title: string;
  // Anything that did not fit on the front. Optional, and never needed to
  // make the card useful.
  body?: string;
  // Which deck it has been filed into. Absent means it is still in the
  // inbox, unsorted - the deliberate equivalent of a card tossed in a tray
  // to deal with later.
  deckId?: string;
  status: CardStatus;
  // The day this card was placed on the board, as a local day key. Set by
  // dragging it onto a day; cleared by dragging it back off.
  scheduledDate?: string;
  // Hand order within its deck. Cards are rearranged constantly, so this
  // is a plain sortable number rather than an implicit array position -
  // array order cannot survive the id-based cloud merge.
  order: number;
  createdAt: string;
  updatedAt: string;
  completedAt?: string;
}>;

// Offered on first use so the deck is not an empty box. Deliberately the
// four the method is usually taught with, and all removable.
export const STARTER_DECKS: ReadonlyArray<Readonly<{ name: string; accent: string }>> = [
  { name: "Work", accent: "bg-cyan-400" },
  { name: "Training", accent: "bg-rose-400" },
  { name: "Home", accent: "bg-amber-400" },
  { name: "Relationships", accent: "bg-fuchsia-400" },
];

export const DECK_ACCENTS: ReadonlyArray<Readonly<{ label: string; value: string }>> = [
  { label: "Cyan", value: "bg-cyan-400" },
  { label: "Rose", value: "bg-rose-400" },
  { label: "Amber", value: "bg-amber-400" },
  { label: "Fuchsia", value: "bg-fuchsia-400" },
  { label: "Emerald", value: "bg-emerald-400" },
  { label: "Purple", value: "bg-purple-500" },
  { label: "Sky", value: "bg-sky-400" },
  { label: "Lime", value: "bg-lime-400" },
];
