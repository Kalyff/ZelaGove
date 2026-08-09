/**
 * Barrel único do design system.
 *
 * Tudo sai por aqui — os apps importam `@zeladoria/ui` e nada mais. Import de
 * subcaminho (`@zeladoria/ui/primitives/Button`) exigiria alias por regex no
 * Vite dos dois apps e não vale a manutenção.
 */

/* ---- utilidades e hooks ---------------------------------------------- */
export { cn } from './lib/cn';
export { ThemeProvider, useTheme, NO_FLASH_SCRIPT } from './lib/useTheme';
export type { ThemePreference, ResolvedTheme } from './lib/useTheme';
export { useFocusTrap } from './lib/useFocusTrap';
export { useScrollLock } from './lib/useScrollLock';
export { useRouteFocus } from './lib/useRouteFocus';
export { AnnouncerProvider, useAnnouncer } from './lib/useAnnouncer';
export { useReducedMotionSafe } from './lib/useReducedMotionSafe';
export {
  DUR,
  EASE,
  SPRING,
  fade,
  riseIn,
  scaleIn,
  listContainer,
  sheetLeft,
  pageSlide,
  staggerDelay,
} from './lib/motion';

/* ---- primitivos ------------------------------------------------------ */
export { Button } from './primitives/Button';
export type { ButtonProps, ButtonSize, ButtonVariant } from './primitives/Button';
export { IconButton } from './primitives/IconButton';
export type { IconButtonProps } from './primitives/IconButton';
export { Input, Select, Textarea } from './primitives/Input';
export { Field } from './primitives/Field';
export type { FieldProps } from './primitives/Field';
export { Card, Badge, SkipLink, VisuallyHidden } from './primitives/Surfaces';
export type { CardProps } from './primitives/Surfaces';
export { Skeleton, SkeletonText, Spinner, EmptyState, ErrorState } from './primitives/Feedback';
export { Modal } from './primitives/Modal';
export type { ModalProps } from './primitives/Modal';
export { Sheet } from './primitives/Sheet';
export type { SheetProps } from './primitives/Sheet';
export { ToastProvider, useToast } from './primitives/Toast';
export { ThemeToggle } from './primitives/ThemeToggle';

/* ---- domínio --------------------------------------------------------- */
export { StatusBadge } from './domain/StatusBadge';
export type { StatusBadgeProps } from './domain/StatusBadge';
export {
  STATUS_HEX,
  STATUS_HEX_DARK,
  STATUS_CHIP,
  DOT_STROKE,
  HEAT_RADIUS_M,
  HEAT_OPACITY,
} from './domain/statusTokens';

/* ---- ícones ---------------------------------------------------------- */
export * from './icons';
