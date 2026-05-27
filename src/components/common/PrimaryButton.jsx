function PrimaryButton({ children, variant = 'solid', ...props }) {
  const baseClasses =
    'inline-flex items-center justify-center rounded-md px-4 py-2.5 text-sm font-semibold tracking-wide transition-all duration-300 cursor-pointer disabled:cursor-not-allowed disabled:opacity-60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background'
  const variantClasses =
    variant === 'outline'
      ? 'border border-border bg-background text-foreground shadow-sm hover:border-[#D4A843]/50 hover:bg-muted'
      : 'bg-primary text-primary-foreground shadow-md hover:bg-primary/90 hover:-translate-y-0.5 hover:shadow-lg'

  return (
    <button className={`${baseClasses} ${variantClasses}`} {...props}>
      {children}
    </button>
  )
}

export default PrimaryButton
