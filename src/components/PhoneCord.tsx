interface PhoneCordProps { lifted: boolean }

export function PhoneCord({ lifted }: PhoneCordProps) {
  return (
    <div className={`phone-cord ${lifted ? 'is-stretched' : ''}`} aria-hidden="true">
      {Array.from({ length: 19 }, (_, index) => <i key={index} />)}
    </div>
  )
}
