# Lūdus Latīnus

A clean, personalized Classical Latin grammar and forms study web app inspired by Magistrula, built with React, TypeScript, Vite, and Tailwind CSS.

## Features

- **My Curriculum ("What I've Learned"):** Configure exactly which declensions, verb conjugations/tenses/voices/moods, adjectives, adverbs, and pronouns you have learned so every drill stays focused on your current coursework.
- **4 Practice Modes:**
  - **Paradigm Charts:** Full or partial fill-in-the-blank tables for nouns, verbs, and pronouns (including full M/F/N pronoun tables).
  - **Single-Form Prompts:** Targeted drills across nouns, verbs, pronouns, adjectives, and adverbs.
  - **Form Identification:** Parse inflected forms with full syncretism/ambiguity support.
  - **Adjective–Noun Agreement & Adverb Comparison:** Decline noun–adjective pairs and drill positive/comparative/superlative adverbs.
- **Verified Classical Latin Morphology Engine:** Deterministic, unit-tested Classical Latin paradigms (Declensions 1–5 + i-stems + irregulars; Conjugations 1–4, 3-iō, deponents, and core irregulars; 11 core Classical Latin pronouns; 1st/2nd & 3rd declension adjectives + comparison; adverbs).
- **Personalized Weak Spots & Local Backup:** Browser-local persistence (`localStorage`) with clickable mastery heatmaps, automatic mistake tracking, word pinning, custom course word builder with live paradigm preview, and 1-click JSON Export/Import backup.

## Getting Started

```bash
npm install
npm run dev
```

## Testing & Production Build

```bash
npm test
npm run build
```

## Deploying

Ready for zero-config deployment on **Vercel** (`vercel.json` SPA rewrites included) or **Firebase Hosting**.
