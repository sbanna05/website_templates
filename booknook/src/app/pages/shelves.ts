import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  computed,
  inject,
  signal,
  viewChild,
} from '@angular/core';
import { Library } from '../core/library';
import { Shelf } from '../core/models';
import { Notifier } from '../core/notifier';
import { Icon } from '../ui/icon';
import { Shelf3d } from '../ui/shelf-3d';
import { FieldState, TextField, checkAll, validators } from '../ui/text-field';
import { Tooltip } from '../ui/tooltip';
import { UploadBookDialog } from '../ui/upload-book-dialog';

const MAX_SHELF_NAME_LENGTH = 40;

/** The reader's 3D shelves, with creating, renaming and deleting shelves and adding a book file. */
@Component({
  selector: 'app-shelves',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [Shelf3d, Icon, Tooltip, TextField, UploadBookDialog],
  template: `
    <div class="page pt-10">
      <div class="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 class="text-4xl md:text-5xl">My shelves</h1>
          <p class="lede num mt-2">{{ summary() }}</p>
        </div>
        <button type="button" class="btn btn-primary" (click)="uploadDialog.open()">
          <app-icon name="upload" [size]="18" />
          Add a book file
        </button>
      </div>

      @if (library.saveFailed()) {
        <p class="card mt-6 text-danger" role="alert">
          This browser is blocking saves, so changes will last only until you close the page.
        </p>
      }

      @if (!library.ready()) {
        <div class="mt-10 grid gap-10" role="status">
          <span class="visually-hidden">Loading your shelves</span>
          <div class="skeleton h-64"></div>
          <div class="skeleton h-64"></div>
        </div>
      } @else {
        @for (shelf of shelves(); track shelf.id) {
          <section class="mt-10" [attr.aria-labelledby]="'shelf-' + shelf.id">
            <!-- Fixed height, so swapping the title for the rename field moves nothing below it. -->
            <div class="flex h-12 items-center gap-1">
              @if (renamingId() === shelf.id) {
                <form class="flex flex-1 items-center gap-2" (submit)="saveRename($event, shelf)">
                  <label class="visually-hidden" [for]="'rename-' + shelf.id">Shelf name</label>
                  <input
                    #renameField
                    class="field max-w-sm"
                    [id]="'rename-' + shelf.id"
                    [value]="shelf.name"
                    [attr.maxlength]="maxNameLength"
                    (keydown.escape)="renamingId.set(null)"
                  />
                  <button type="submit" class="btn btn-primary">Save name</button>
                  <button type="button" class="btn" (click)="renamingId.set(null)">Cancel</button>
                </form>
              } @else {
                <h2 [id]="'shelf-' + shelf.id" class="mr-auto truncate text-2xl md:text-3xl">
                  {{ shelf.name }}
                  <span class="num font-sans text-base font-normal tracking-normal text-ink-soft">
                    {{ shelf.bookIds.length }}
                  </span>
                </h2>
                <button
                  type="button"
                  class="icon-btn"
                  [attr.aria-label]="'Rename shelf ' + shelf.name"
                  appTooltip="Rename shelf"
                  (click)="startRename(shelf)"
                >
                  <app-icon name="pencil" />
                </button>
                <button
                  type="button"
                  class="icon-btn"
                  [attr.aria-label]="'Delete shelf ' + shelf.name"
                  appTooltip="Delete shelf"
                  (click)="askDelete(shelf)"
                >
                  <app-icon name="trash" />
                </button>
              }
            </div>
            <div class="mt-2">
              <app-shelf-3d
                [books]="library.booksOn(shelf)"
                emptyText="Nothing here yet. Add a book from Browse, or from any book’s page."
              />
            </div>
          </section>
        } @empty {
          <p class="card mt-10 max-w-xl p-6">
            You have no shelves. Create one below, then add books from Browse.
          </p>
        }

        <form class="mt-12 max-w-xl" novalidate (submit)="createShelf($event)">
          <h2 class="text-2xl">Add another shelf</h2>
          <div class="mt-3 grid gap-x-3 sm:grid-cols-[1fr_auto] sm:items-start">
            <app-text-field
              #shelfNameControl
              label="Shelf name"
              hint="For example: Holiday reading."
              [state]="shelfName"
            />
            <button type="submit" class="btn btn-primary sm:mt-[26px] sm:min-h-12">
              <app-icon name="plus" [size]="18" />
              Create shelf
            </button>
          </div>
        </form>
      }
    </div>

    <dialog #deleteDialog class="dialog" aria-labelledby="delete-title">
      @if (deleting(); as shelf) {
        <h2 id="delete-title" class="text-2xl">Delete the shelf “{{ shelf.name }}”?</h2>
        <p class="num mt-3 text-ink-soft">
          {{ deleteConsequence(shelf) }} Your ratings and reviews are kept.
        </p>
        <div class="mt-6 flex flex-wrap justify-end gap-3">
          <button type="button" class="btn" (click)="deleteDialog.close()">Keep shelf</button>
          <button type="button" class="btn btn-danger" (click)="confirmDelete(shelf)">
            Delete shelf
          </button>
        </div>
      }
    </dialog>

    <app-upload-book-dialog #uploadDialog />
  `,
})
export class Shelves {
  protected readonly library = inject(Library);
  private readonly notifier = inject(Notifier);

  private readonly deleteDialog = viewChild.required<ElementRef<HTMLDialogElement>>('deleteDialog');
  private readonly renameField = viewChild<ElementRef<HTMLInputElement>>('renameField');
  private readonly shelfNameControl = viewChild<TextField>('shelfNameControl');

  protected readonly maxNameLength = MAX_SHELF_NAME_LENGTH;
  protected readonly shelves = computed(() => this.library.state().shelves);
  protected readonly renamingId = signal<string | null>(null);
  protected readonly deleting = signal<Shelf | null>(null);

  protected readonly shelfName = new FieldState(validators.required('Give the shelf a name.'));

  protected readonly summary = computed(() => {
    const shelves = this.shelves();
    const books = new Set(shelves.flatMap((shelf) => shelf.bookIds)).size;
    return `${books} ${books === 1 ? 'book' : 'books'} on ${shelves.length} ${
      shelves.length === 1 ? 'shelf' : 'shelves'
    }`;
  });

  // ---- Shelves -----------------------------------------------------------

  protected createShelf(event: Event): void {
    event.preventDefault();
    const control = this.shelfNameControl();
    if (!control || !checkAll([{ state: this.shelfName, control }])) return;
    const shelf = this.library.createShelf(this.shelfName.value().slice(0, MAX_SHELF_NAME_LENGTH));
    this.shelfName.edit('');
    this.notifier.show(`Shelf “${shelf.name}” created`);
  }

  protected startRename(shelf: Shelf): void {
    this.renamingId.set(shelf.id);
    // The field exists only after the next render.
    setTimeout(() => this.renameField()?.nativeElement.select());
  }

  protected saveRename(event: Event, shelf: Shelf): void {
    event.preventDefault();
    const name = this.renameField()?.nativeElement.value.trim();
    // An empty name keeps the old one rather than raising an error for a one-field edit.
    if (name && name !== shelf.name) {
      this.library.renameShelf(shelf.id, name);
      this.notifier.show(`Shelf renamed to “${name}”`);
    }
    this.renamingId.set(null);
  }

  protected askDelete(shelf: Shelf): void {
    this.deleting.set(shelf);
    this.deleteDialog().nativeElement.showModal();
  }

  protected deleteConsequence(shelf: Shelf): string {
    const count = shelf.bookIds.length;
    if (!count) return 'The shelf is empty.';
    return `Its ${count} ${count === 1 ? 'book comes' : 'books come'} off this shelf but ${
      count === 1 ? 'stays' : 'stay'
    } on any other shelf.`;
  }

  protected confirmDelete(shelf: Shelf): void {
    const before = this.library.state();
    this.library.deleteShelf(shelf.id);
    this.deleteDialog().nativeElement.close();
    this.notifier.show(`Shelf “${shelf.name}” deleted`, {
      label: 'Undo',
      run: () => this.library.restoreSnapshot(before),
    });
  }
}
