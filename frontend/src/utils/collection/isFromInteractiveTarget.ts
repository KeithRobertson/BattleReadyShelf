export default function isFromInteractiveTarget(target: EventTarget | null): boolean {
  return (
    target instanceof Element &&
    Boolean(
      target.closest(
        "button, a, input, textarea, select, label, [role='checkbox'], [role='combobox'], [role='listbox']",
      ),
    )
  );
}
