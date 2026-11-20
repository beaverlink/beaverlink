// Progress indicator for the sign-up steps: completed = bark, current = osu.
export function StepDots({ total, current }: { total: number; current: number }) {
  return (
    <div className="mt-6 flex justify-center gap-1.5" aria-hidden="true">
      {Array.from({ length: total }, (_, i) => {
        const tone =
          i < current ? 'bg-bark' : i === current ? 'bg-osu' : 'bg-stone-200'
        return <span key={i} className={`h-1.5 w-8 rounded-full ${tone}`} />
      })}
    </div>
  )
}
