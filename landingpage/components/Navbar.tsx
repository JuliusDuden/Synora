import React from 'react'

export default function Navbar() {
  return (
    <header className="py-6 px-6 max-w-7xl mx-auto flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gradient-to-br from-synora-accent to-indigo-500 text-white font-bold shadow">S</div>
        <div className="font-semibold text-lg">Synora</div>
      </div>

      <nav className="hidden md:flex items-center gap-6 text-sm text-muted">
        <a href="#features" className="text-synora-700 hover:underline">Features</a>
        <a href="#demo" className="text-synora-700 hover:underline">Demo</a>
        <a href="#signup" className="text-synora-700 hover:underline">Beta</a>
        <a href="#" className="px-4 py-2 rounded-full bg-synora-accent text-white font-medium shadow">Login</a>
      </nav>
    </header>
  )
}
