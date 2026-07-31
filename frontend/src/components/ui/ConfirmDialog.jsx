import Modal from '@/components/ui/Modal'
import Button from '@/components/ui/Button'

export default function ConfirmDialog({
  isOpen,
  onClose,
  onConfirm,
  title,
  description,
  confirmLabel = 'Confirm',
  tone = 'danger',
  isLoading = false,
}) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title={title} description={description} size="sm">
      <div className="flex justify-end gap-3">
        <Button type="button" variant="secondary" onClick={onClose} disabled={isLoading}>
          Cancel
        </Button>
        <Button type="button" variant={tone} onClick={onConfirm} disabled={isLoading}>
          {isLoading ? 'Please wait…' : confirmLabel}
        </Button>
      </div>
    </Modal>
  )
}
