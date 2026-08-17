import type { SubmitErrorHandler, FieldValues } from 'react-hook-form';

/**
 * Scroll to and focus the first invalid control. Relies on the `aria-invalid="true"` attribute that
 * shadcn's `FormControl` (src/components/ui/form.tsx) stamps on every errored control — native
 * `<input>`/`<textarea>` AND the Radix `SelectTrigger` (all focusable) — so it works uniformly across
 * react-hook-form forms without any per-field ref wiring.
 *
 * `aria-invalid` only appears on the render AFTER react-hook-form sets its errors, so we wait one
 * animation frame before querying. Pass a container (e.g. the submitted <form> or a wizard step) to
 * scope the search when multiple forms are mounted.
 */
export function scrollToFirstError(container?: HTMLElement | Document | null): void {
  requestAnimationFrame(() => {
    const root = container ?? document;
    const el = root.querySelector<HTMLElement>('[aria-invalid="true"]');
    if (!el) return;
    el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    // preventScroll so focus() doesn't fight the smooth scroll we just started.
    el.focus?.({ preventScroll: true });
  });
}

/**
 * Drop-in react-hook-form `onInvalid` handler:
 *   `form.handleSubmit(onValid, focusFirstFormError)`
 * Scopes the search to the submitted <form> (RHF passes the submit event) so other mounted forms
 * aren't matched.
 */
export const focusFirstFormError: SubmitErrorHandler<FieldValues> = (_errors, event) => {
  const form = event?.target instanceof HTMLElement ? event.target : null;
  scrollToFirstError(form);
};
