import React from 'react'

export default function Footer(){
  return (
    <footer className="mt-20 border-t pt-8 pb-12 text-sm text-muted">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-6 px-6">
        <div>
          <div className="font-semibold">Synora</div>
          <div className="text-xs">Made in Germany · Privacy First</div>
        </div>
        <div className="flex items-center gap-6">
          <a href="mailto:hello@synora.app">hello@synora.app</a>
          <a href="#">Impressum</a>
          <a href="#">Datenschutz</a>
          <a href="https://github.com/JuliusDuden/2nd-brain" target="_blank" rel="noopener noreferrer">GitHub</a>
        </div>
      </div>
    </footer>
  )
}
