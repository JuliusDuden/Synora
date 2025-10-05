import Head from 'next/head'
import React from 'react'
import Navbar from '../components/Navbar'
import HeroMockup from '../components/HeroMockup'
import FeatureCard from '../components/FeatureCard'
import Footer from '../components/Footer'

export default function Home() {
  return (
    <>
      <Head>
        <title>Synora — Private Second Brain for Creators & Teams</title>
        <meta name="description" content="Synora: Notizen, Projekte & Gewohnheiten – encrypted, peer-to-peer sync, local-first." />
        <meta name="viewport" content="width=device-width, initial-scale=1" />
      </Head>

      <Navbar />

      <main className="max-w-7xl mx-auto px-6">
        {/* Hero */}
        <section className="grid grid-cols-1 md:grid-cols-2 gap-12 items-center my-16">
          <div>
            <h1 className="text-5xl font-extrabold leading-tight">Synora — Dein privates All‑in‑One Second Brain</h1>
            <p className="mt-6 text-lg text-muted max-w-xl">Notizen, Projekte & Gewohnheiten — lokal-first, Ende‑zu‑Ende verschlüsselt und optional Peer‑to‑Peer synchronisiert. Für Professionals, Teams und Power‑Users.</p>

            <div className="mt-8 flex items-center gap-4">
              <a href="#signup" className="inline-block px-6 py-3 rounded-full bg-synora-accent text-white font-semibold shadow-lg hover:shadow-xl transition">Beta beitreten</a>
              <a href="#demo" className="inline-block px-5 py-3 rounded-full border border-gray-200 text-gray-700">Live Demo ansehen</a>
            </div>

            <div className="mt-10 flex gap-6 items-center">
              <div className="text-center">
                <div className="text-2xl font-semibold">XX</div>
                <div className="text-sm text-muted">Tester bisher</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-semibold">Privacy</div>
                <div className="text-sm text-muted">Made in Germany</div>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-center">
            <HeroMockup />
          </div>
        </section>

        {/* Features */}
        <section id="features" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 my-12">
          <FeatureCard icon="📝" title="Markdown-Notizen" desc="Backlinks, Tags & leistungsfähige Suche" />
          <FeatureCard icon="📊" title="Dashboard & Tasks" desc="Projekt-Management, Habit-Tracking & Priorisierung" />
          <FeatureCard icon="🔒" title="Privacy by Design" desc="E2E-Verschlüsselung, lokal-first, optional P2P" />
          <FeatureCard icon="🔌" title="Erweiterbar" desc="Plugins, KI-Integrationen & Automationen" />
        </section>

        {/* Demo */}
        <section id="demo" className="my-16">
          <h2 className="text-2xl font-semibold mb-4">Kurzes Demo-Video</h2>
          <div className="w-full rounded-xl overflow-hidden shadow-lg">
            <div className="w-full h-64 bg-black/80 flex items-center justify-center text-white">[GIF / Video 30–60s Platzhalter]</div>
          </div>
        </section>

  {/* Signup */}
        <section id="signup" className="my-16 max-w-2xl">
          <h2 className="text-2xl font-semibold mb-3">Closed Beta: jetzt eintragen</h2>
          <p className="text-muted mb-6">Trage dich ein & sichere dir frühen Zugang zur geschlossenen Beta.</p>
          <form className="flex gap-3 card-glass p-4 rounded-lg items-center" onSubmit={(e) => { e.preventDefault(); alert('Danke — Beta-Anmeldung simuliert.'); }}>
            <input aria-label="Name" placeholder="Name" className="px-4 py-3 rounded-lg border border-gray-200 flex-1" />
            <input aria-label="E-Mail" type="email" placeholder="E-Mail" className="px-4 py-3 rounded-lg border border-gray-200 w-80" />
            <button className="px-5 py-3 rounded-lg bg-synora-accent text-white font-semibold">Eintragen</button>
          </form>
        </section>

        {/* Why Synora */}
        <section className="my-16 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          <div>
            <h3 className="text-xl font-semibold mb-3">Warum Synora?</h3>
            <p className="text-muted">Weil moderne Arbeit zu fragmentiert ist. Tools stapeln sich, Wissen zerstreut sich. Synora bündelt: lokal, vernetzt, privat.</p>
            <ul className="mt-6 space-y-3 text-muted">
              <li>✅ Single source of truth für deine Notizen und Projekte</li>
              <li>✅ Volle Kontrolle & Verschlüsselung</li>
              <li>✅ Offline-first mit optionaler P2P-Synchronisation</li>
            </ul>
          </div>
          <div>
            <div className="rounded-lg p-6 card-glass">
              <h4 className="font-semibold">Mini-Story</h4>
              <p className="text-muted mt-3">Du willst ein Tool, das dir gehört — ohne Vendor lock-in. Synora investiert in Privatsphäre, Produktivität und Integrationen.</p>
            </div>
          </div>
        </section>

        <section className="my-12 text-center">
          <p className="text-muted">Trusted by early teams & makers — <strong>XX</strong> beta testers</p>
        </section>

        <Footer />
      </main>
    </>
  )
}

function ProFeature({ title, desc, icon }: { title: string; desc: string; icon: string }) {
  return (
    <div className="card-glass p-6 rounded-lg shadow hover:shadow-2xl transition">
      <div className="text-3xl mb-4">{icon}</div>
      <div className="font-semibold text-lg mb-2">{title}</div>
      <div className="text-muted text-sm">{desc}</div>
    </div>
  )
}
