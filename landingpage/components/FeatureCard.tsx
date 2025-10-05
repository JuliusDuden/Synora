import React from 'react'

export default function FeatureCard({icon, title, desc}: {icon:string; title:string; desc:string}){
  return (
    <div className="card-glass p-6 rounded-lg shadow hover:shadow-2xl transition">
      <div className="text-3xl mb-4">{icon}</div>
      <div className="font-semibold text-lg mb-2">{title}</div>
      <div className="text-muted text-sm">{desc}</div>
    </div>
  )
}
