import React from 'react'

export default function HeroMockup(){
  return (
    <div className="w-full max-w-lg rounded-xl card-glass p-6 shadow-xl">
      <div className="h-64 bg-gradient-to-br from-white to-gray-100 rounded-lg flex items-center justify-center border border-gray-100">
        <div className="text-center">
          <div className="text-sm text-muted">Produkt-Mockup</div>
          <div className="mt-3 font-medium">[Large screenshot / device mockup Platzhalter]</div>
        </div>
      </div>
    </div>
  )
}
