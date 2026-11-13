import { ChangeDetectionStrategy, Component, computed, input } from '@angular/core';

/**
 * One icon family for the whole app: 24 px grid, 1.75 px round strokes.
 * Icons are decorative; the control that holds one carries the name.
 */
const PATHS = {
  search: 'M11 4a7 7 0 1 0 0 14 7 7 0 0 0 0-14Zm9 16-4.05-4.05',
  menu: 'M4 7h16M4 12h16M4 17h16',
  close: 'M6 6l12 12M18 6 6 18',
  palette:
    'M12 3.5a8.5 8.5 0 1 0 0 17c1.2 0 1.8-.9 1.8-1.8 0-1.3-.9-1.6-.9-2.7 0-1 .8-1.7 1.8-1.7h2a3.8 3.8 0 0 0 3.8-3.8C20.5 6.7 16.7 3.5 12 3.5ZM7.5 12h.01M9.5 8h.01M14 7.5h.01',
  'arrow-up': 'M12 19V5m0 0-6 6m6-6 6 6',
  'arrow-left': 'M19 12H5m0 0 6-6m-6 6 6 6',
  'chevron-left': 'm15 6-6 6 6 6',
  'chevron-right': 'm9 6 6 6-6 6',
  plus: 'M12 5v14M5 12h14',
  check: 'm5 12.5 4.5 4.5L19 7.5',
  trash: 'M5 7h14M10 7V4.5h4V7M7 7l.8 12.5h8.4L17 7M10 11v5M14 11v5',
  pencil: 'M4 20h4L19 9l-4-4L4 16v4Zm9.5-13.5 4 4',
  upload: 'M12 16V5m0 0-4 4m4-4 4 4M5 19.5h14',
  book: 'M5 4.5h11a3 3 0 0 1 3 3v12H8a3 3 0 0 1-3-3v-12Zm0 12a3 3 0 0 1 3-3h11',
  type: 'M5 7V5h14v2M12 5v14m-3 0h6',
  star: 'm12 4 2.4 5 5.4.7-4 3.8 1 5.4L12 16.3l-4.8 2.6 1-5.4-4-3.8 5.4-.7L12 4Z',
  user: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7.5 8a7.5 7.5 0 0 1 15 0',
} as const;

export type IconName = keyof typeof PATHS;

@Component({
  selector: 'app-icon',
  changeDetection: ChangeDetectionStrategy.OnPush,
  host: { class: 'inline-flex shrink-0' },
  template: `
    <svg
      [attr.width]="size()"
      [attr.height]="size()"
      viewBox="0 0 24 24"
      [attr.fill]="filled() ? 'currentColor' : 'none'"
      stroke="currentColor"
      stroke-width="1.75"
      stroke-linecap="round"
      stroke-linejoin="round"
      aria-hidden="true"
      focusable="false"
    >
      <path [attr.d]="path()" />
    </svg>
  `,
})
export class Icon {
  readonly name = input.required<IconName>();
  readonly size = input(20);
  readonly filled = input(false);
  protected readonly path = computed(() => PATHS[this.name()]);
}
