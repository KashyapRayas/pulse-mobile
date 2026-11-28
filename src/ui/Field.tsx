import { Text } from "./Text";

// The one way a form names its fields (docs/design/linear-mobile.md "Forms"). Every field in the app, whether onboarding,
// Settings, the log sheets or the coach, labels its control with these classes. A label's qualifier ("Optional", a unit)
// stays the label's size and only steps down in colour and weight, so the line never changes size halfway.

/** A field's label: 14 px medium, a step quieter than the 16 px value typed under it. */
export const FIELD_LABEL = "text-meta font-medium text-foreground-secondary";
/** The note under a field: the label's size, regular and muted. */
export const FIELD_HINT = "text-meta text-muted-foreground";
/** A field's error, in place of its note. */
export const FIELD_ERROR = "text-meta font-medium text-recovery-red-text";

/** A field's label, with an optional qualifier ("Optional") after it at the same size. */
export function FieldLabel({ label, qualifier }: { label: string; qualifier?: string }) {
  return (
    <Text className={FIELD_LABEL}>
      {label}
      {!!qualifier && <Text className="font-normal text-muted-foreground">{`  ${qualifier}`}</Text>}
    </Text>
  );
}
