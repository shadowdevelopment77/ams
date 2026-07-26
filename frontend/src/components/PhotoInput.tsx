import { useRef, useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'

interface PhotoInputProps {
  value: File | null
  onChange: (file: File | null) => void
  label?: string
}

// Native capture="environment" opens the phone's camera directly on mobile --
// a desktop browser has no camera to defer to and falls back to a file picker,
// which is exactly what the mobile-only device gate exists to prevent.
export function PhotoInput({ value, onChange, label = 'Photo' }: PhotoInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)

  useEffect(() => {
    if (!value) {
      setPreviewUrl(null)
      return
    }
    const url = URL.createObjectURL(value)
    setPreviewUrl(url)
    return () => URL.revokeObjectURL(url)
  }, [value])

  return (
    <div className="flex flex-col gap-2">
      <span className="text-sm font-medium">{label}</span>
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        capture="environment"
        className="hidden"
        onChange={(e) => onChange(e.target.files?.[0] ?? null)}
      />
      {previewUrl ? (
        <div className="flex flex-col gap-2">
          <img
            src={previewUrl}
            alt="Selected photo preview"
            className="h-40 w-full rounded-lg border border-border object-cover"
          />
          <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
            Retake photo
          </Button>
        </div>
      ) : (
        <Button type="button" variant="outline" onClick={() => inputRef.current?.click()}>
          Take photo
        </Button>
      )}
    </div>
  )
}
